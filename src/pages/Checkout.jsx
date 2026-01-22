import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { collection, addDoc, doc, writeBatch, increment, getDoc, getDocs, query, where, limit, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, ShieldCheck, Banknote, CreditCard, Ticket, CheckCircle2, AlertCircle, MapPin, Plus, User, Mail } from 'lucide-react';
import PhoneInputGroup from '../components/PhoneInputGroup';
import TrustPaymentSection from '../components/TrustPaymentSection';

const Checkout = () => {
    const { cartItems, getCartTotal, clearCart, updateCartStage, updateCustomerInfo } = useCart();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [loading, setLoading] = useState(false);
    const [fetchingMethods, setFetchingMethods] = useState(true);
    const [activeMethods, setActiveMethods] = useState([]);
    const [shippingRates, setShippingRates] = useState([]);
    const [shippingCost, setShippingCost] = useState(0);
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoInput, setPromoInput] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoMessage, setPromoMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        governorate: '',
        city: '',
        paymentMethod: '',
        currentMileage: ''
    });

    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('new');
    const [saveNewAddress, setSaveNewAddress] = useState(false);
    const [fetchingAddresses, setFetchingAddresses] = useState(false);

    useEffect(() => {
        updateCartStage('Shipping Info');
        fetchPaymentMethods();
        fetchShippingRates();
        if (auth.currentUser) {
            fetchUserProfileAndAddresses();
        }
    }, []);

    // Sync customer info to CartContext for abandoned cart tracking
    useEffect(() => {
        updateCustomerInfo({
            name: formData.name,
            email: formData.email,
            phone: formData.phone
        });
    }, [formData.name, formData.email, formData.phone]);

    // Track when user reaches payment selection
    useEffect(() => {
        if (formData.governorate && formData.address && formData.city) {
            updateCartStage('Payment Selection');
        }
    }, [formData.governorate, formData.address, formData.city]);

    const fetchUserProfileAndAddresses = async () => {
        setFetchingAddresses(true);
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setFormData(prev => ({
                    ...prev,
                    name: userData.fullName || '',
                    email: userData.email || '',
                    phone: userData.phoneNumber || ''
                }));
            }

            const addressesSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'addresses'));
            const addresses = addressesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedAddresses(addresses);

            if (addresses.length > 0) {
                handleAddressSelect(addresses[0]);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setFetchingAddresses(false);
        }
    };

    const handleAddressSelect = (addr) => {
        if (addr === 'new') {
            setSelectedAddressId('new');
            setFormData(prev => ({
                ...prev,
                address: '',
                governorate: '',
                city: ''
            }));
            setShippingCost(0);
            return;
        }

        setSelectedAddressId(addr.id);
        setFormData(prev => ({
            ...prev,
            address: addr.detailedAddress || addr.address,
            governorate: addr.governorate,
            city: addr.city
        }));

        const rate = shippingRates.find(r => r.governorate === addr.governorate);
        setShippingCost(rate ? rate.cost : 0);
    };

    useEffect(() => {
        if (appliedPromo?.type === 'payment_method_shipping') {
            checkPromoLogic(appliedPromo);
        }
    }, [formData.paymentMethod]);

    const fetchPaymentMethods = async () => {
        try {
            setFetchingMethods(true);
            const q = query(collection(db, 'payment_configs'), where('isActive', '==', true));
            const querySnapshot = await getDocs(q);
            const methods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setActiveMethods(Array.isArray(methods) ? methods : []);

            if (methods && methods.length > 0) {
                setFormData(prev => ({ ...prev, paymentMethod: methods[0].id }));
            }
        } catch (error) {
            console.error("Error fetching payment methods:", error);
        } finally {
            setFetchingMethods(false);
        }
    };

    const fetchShippingRates = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'shipping_rates'));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Safety sort: ensure governorate exists before calling localeCompare
            const sortedData = data.sort((a, b) => {
                const govA = a?.governorate || '';
                const govB = b?.governorate || '';
                return govA.localeCompare(govB);
            });

            setShippingRates(sortedData);
        } catch (error) {
            console.error("Error fetching shipping rates:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'governorate') {
            const selectedRate = (shippingRates || []).find(r => r.governorate === value);
            setShippingCost(selectedRate ? (Number(selectedRate.cost) || 0) : 0);
        }
    };

    const applyPromoCode = async () => {
        if (!promoInput.trim()) return;
        setPromoLoading(true);
        setPromoMessage({ type: '', text: '' });

        try {
            const q = query(collection(db, 'promo_codes'), where('code', '==', promoInput.toUpperCase().trim()), where('isActive', '==', true));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setPromoMessage({ type: 'error', text: t('promoInvalid') });
                setAppliedPromo(null);
                return;
            }

            const promoData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };

            if (promoData.usedCount >= promoData.usageLimit) {
                setPromoMessage({ type: 'error', text: t('promoLimit') });
                return;
            }

            if (getCartTotal() < (promoData.minOrderValue || 0)) {
                setPromoMessage({ type: 'error', text: t('promoMinOrder', { val: promoData.minOrderValue }) });
                return;
            }

            const logicResult = checkPromoLogic(promoData);
            if (logicResult.valid) {
                setAppliedPromo(promoData);
                setPromoMessage({ type: 'success', text: logicResult.message || t('promoApplied') });
            } else {
                setPromoMessage({ type: 'error', text: logicResult.message });
            }

        } catch (error) {
            console.error("Promo error:", error);
            setPromoMessage({ type: 'error', text: t('orderError') });
        } finally {
            setPromoLoading(false);
        }
    };

    const checkPromoLogic = (promo) => {
        switch (promo.type) {
            case 'discount':
                return { valid: true };

            case 'free_shipping_threshold':
                if (getCartTotal() >= (promo.minOrderValue || 0)) {
                    return { valid: true, message: t('promoFreeShipping') };
                }
                return { valid: false, message: t('promoAddMore', { val: promo.minOrderValue - getCartTotal() }) };

            case 'payment_method_shipping': {
                const selectedMethod = activeMethods.find(m => m.id === formData.paymentMethod);
                if (selectedMethod?.type === promo.requiredPaymentMethod) {
                    return { valid: true, message: t('promoPaymentShipping') };
                }
                const methodName = promo.requiredPaymentMethod === 'online' ? (isAr ? 'الدفع الإلكتروني' : 'Online Payment') : (isAr ? 'الدفع عند الاستلام' : 'COD');
                return { valid: true, message: t('promoUsePayment', { method: methodName }) };
            }

            case 'product_gift': {
                const hasTarget = cartItems.some(item => item.id === promo.targetProductId);
                if (hasTarget) {
                    return { valid: true, message: t('promoGiftAdded') };
                }
                return { valid: false, message: t('promoProductNotFound') };
            }

            default:
                return { valid: true };
        }
    };

    const calculateTotals = () => {
        const subtotal = getCartTotal();
        let discount = 0;
        let finalShipping = shippingCost;

        if (appliedPromo) {
            if (appliedPromo.type === 'discount') {
                if (appliedPromo.isPercentage) {
                    discount = (subtotal * appliedPromo.value) / 100;
                } else {
                    discount = appliedPromo.value;
                }
            }
            if (appliedPromo.type === 'free_shipping_threshold' && subtotal >= (appliedPromo.minOrderValue || 0)) {
                finalShipping = 0;
            }
            if (appliedPromo.type === 'payment_method_shipping') {
                const selectedMethod = activeMethods.find(m => m.id === formData.paymentMethod);
                if (selectedMethod?.type === appliedPromo.requiredPaymentMethod) {
                    finalShipping = 0;
                }
            }
        }

        return {
            subtotal: Number(subtotal) || 0,
            discount: Number(discount) || 0,
            shipping: Number(finalShipping) || 0,
            total: Math.max(0, (subtotal - discount + finalShipping))
        };
    };

    const { subtotal, discount, shipping, total } = calculateTotals();

    const handleOnlinePayment = async (orderId, methodConfig) => {
        try {
            const totalAmount = total;
            const customerName = formData.name;
            const customerPhone = formData.phone;
            const customerEmail = formData.email || "customer@example.com";

            // Call our Vercel serverless function instead of EasyKash directly
            // This bypasses CORS and keeps API keys secure
            const response = await axios.post('/api/init-payment', {
                amount: totalAmount,
                orderId: orderId,
                customerName: customerName,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                returnUrl: `${window.location.origin}/order-success?id=${orderId}`
            });

            if (response.data && response.data.url) {
                console.log("Redirecting to payment gateway:", response.data.url);
                window.location.href = response.data.url;
            } else {
                console.error("Payment API response missing URL:", response.data);
                throw new Error(t('onlinePaymentError') || "Could not generate payment link. Please try again or choose another method.");
            }
        } catch (error) {
            console.error("Payment initialization error:", error);
            toast.error(t('onlinePaymentError'));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.phone.length < 10) {
            toast.error(t('phoneError'));
            return;
        }

        setLoading(true);
        const formattedPhone = `+2${formData.phone}`;
        const affRef = localStorage.getItem('affiliate_ref');

        if (cartItems.length === 0) {
            toast.error(t('cartEmpty'));
            navigate('/');
            return;
        }

        const selectedMethod = activeMethods.find(m => m.id === formData.paymentMethod);

        try {
            const finalOrderItems = cartItems.map(item => ({
                id: item.id,
                name: item.name,
                nameEn: item.nameEn || null,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                brand: item.brand,
                brandEn: item.brandEn || null,
                make: item.make,
                model: item.model,
                yearStart: item.yearStart || null,
                yearEnd: item.yearEnd || null
            }));

            if (appliedPromo?.type === 'product_gift') {
                const hasTarget = cartItems.some(item => item.id === appliedPromo.targetProductId);
                if (hasTarget) {
                    finalOrderItems.push({
                        id: appliedPromo.giftProductId,
                        name: "🎁 هداية مجانية",
                        nameEn: "🎁 FREE GIFT",
                        price: 0,
                        quantity: 1,
                        image: "https://images.unsplash.com/photo-1549463591-24398142643c?auto=format&fit=crop&q=80&w=200"
                    });
                }
            }

            const orderData = {
                userId: auth.currentUser?.uid || 'guest',
                customer: {
                    name: formData.name,
                    phone: formattedPhone,
                    email: formData.email || null,
                    address: formData.address,
                    governorate: formData.governorate,
                    city: formData.city
                },
                customerPhone: formattedPhone,
                customerEmail: formData.email || null,
                paymentMethod: selectedMethod?.name || formData.paymentMethod,
                paymentType: selectedMethod?.type || 'offline',
                items: finalOrderItems,
                subtotal: subtotal,
                discount: discount,
                shipping_cost: shipping,
                total: total,
                currentMileage: formData.currentMileage || null,
                promoCode: appliedPromo?.code || null,
                promoId: appliedPromo?.id || null,
                affiliateCode: affRef || (appliedPromo?.code) || null,
                status: 'Pending',
                paymentStatus: 'Pending',
                createdAt: new Date()
            };

            if (selectedMethod?.type === 'online') {
                localStorage.setItem('pending_order', JSON.stringify(orderData));
                localStorage.setItem('pending_cart_items', JSON.stringify(cartItems));
                const tempOrderId = `temp_${Date.now()}`;
                await handleOnlinePayment(tempOrderId, selectedMethod);
            } else {
                const orderId = await runTransaction(db, async (transaction) => {
                    const counterRef = doc(db, 'settings', 'counters');
                    const counterSnap = await transaction.get(counterRef);
                    let nextNumber = 3501;
                    if (counterSnap.exists()) {
                        nextNumber = (counterSnap.data().lastOrderNumber || 3500) + 1;
                    }
                    const orderRef = doc(collection(db, 'orders'));
                    transaction.set(orderRef, { ...orderData, orderNumber: nextNumber, updatedAt: new Date() });
                    transaction.set(counterRef, { lastOrderNumber: nextNumber }, { merge: true });
                    if (appliedPromo) {
                        transaction.update(doc(db, 'promo_codes', appliedPromo.id), { usedCount: increment(1) });
                    }
                    if (auth.currentUser && saveNewAddress && selectedAddressId === 'new') {
                        transaction.set(doc(collection(db, 'users', auth.currentUser.uid, 'addresses')), {
                            detailedAddress: formData.address,
                            governorate: formData.governorate,
                            city: formData.city,
                            label: t('savedAddress'),
                            createdAt: new Date()
                        });
                    }
                    cartItems.forEach(item => {
                        transaction.update(doc(db, 'products', item.id), { soldCount: increment(item.quantity || 1) });
                    });
                    return orderRef.id;
                });
                // Mark cart as recovered
                const cartId = auth.currentUser ? auth.currentUser.uid : localStorage.getItem('cartSessionId');
                if (cartId) {
                    await setDoc(doc(db, 'abandoned_carts', cartId), {
                        recovered: true,
                        recoveredAt: serverTimestamp(),
                        orderId: orderId
                    }, { merge: true });
                }

                clearCart();
                toast.success(t('orderPlaced'));
                navigate(`/order-success?id=${orderId}`);
            }
        } catch (error) {
            console.error("Error creating order:", error);
            toast.error(t('orderError'));
        } finally {
            setLoading(false);
        }
    };

    const isOnline = activeMethods.find(m => m.id === formData.paymentMethod)?.type === 'online';

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <ShieldCheck className="h-8 w-8 text-orange-600" />
                    <h1 className="text-3xl font-black text-gray-900">{t('secureCheckout')}</h1>
                </div>

                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                    <div className="p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-6">
                                <h2 className={`text-xl font-black text-gray-900 flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <span className="bg-orange-600 text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    {t('shippingInfo')}
                                </h2>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>{t('fullName')}</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                            placeholder={t('fullNamePlaceholder')}
                                        />
                                    </div>

                                    <div className="sm:col-span-1">
                                        <PhoneInputGroup
                                            value={formData.phone}
                                            onChange={handleChange}
                                            name="phone"
                                            required
                                            placeholder="010XXXXXXXX"
                                        />
                                    </div>

                                    <div className="sm:col-span-1">
                                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>{t('emailOptional')}</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                            placeholder={t('emailPlaceholder')}
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>{t('mileageOptional')}</label>
                                        <input
                                            type="number"
                                            name="currentMileage"
                                            value={formData.currentMileage}
                                            onChange={handleChange}
                                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                            placeholder={t('mileagePlaceholder')}
                                        />
                                        <p className={`mt-1.5 text-[10px] font-bold text-gray-500 leading-tight ${isAr ? 'text-right' : 'text-left'}`}>
                                            {t('mileageDesc')}
                                        </p>
                                    </div>

                                    {auth.currentUser && savedAddresses.length > 0 && (
                                        <div className="sm:col-span-2 space-y-3">
                                            <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>{t('selectSavedAddress')}</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {savedAddresses.map((addr) => (
                                                    <div
                                                        key={addr.id}
                                                        onClick={() => handleAddressSelect(addr)}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${selectedAddressId === addr.id ? 'border-orange-600 bg-orange-50' : 'border-gray-100 hover:border-gray-200'} ${isAr ? 'flex-row-reverse' : ''}`}
                                                    >
                                                        <MapPin className={`h-5 w-5 mt-0.5 ${selectedAddressId === addr.id ? 'text-orange-600' : 'text-gray-400'}`} />
                                                        <div className={`flex-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                                            <p className="text-xs font-black text-gray-900">{addr.label || 'Home'}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold leading-tight">{addr.city}, {addr.governorate}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1 truncate">{addr.detailedAddress}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div
                                                    onClick={() => handleAddressSelect('new')}
                                                    className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-3 ${selectedAddressId === 'new' ? 'border-orange-600 bg-orange-50' : 'border-gray-200 hover:border-gray-300'} ${isAr ? 'flex-row-reverse' : ''}`}
                                                >
                                                    <Plus className={`h-5 w-5 ${selectedAddressId === 'new' ? 'text-orange-600' : 'text-gray-400'}`} />
                                                    <p className="text-xs font-black text-gray-900">{t('useNewAddress')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(!auth.currentUser || selectedAddressId === 'new') && (
                                        <>
                                            <div className="sm:col-span-1">
                                                <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>{t('governorate')}</label>
                                                <select
                                                    name="governorate"
                                                    required
                                                    value={formData.governorate}
                                                    onChange={handleChange}
                                                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                                >
                                                    <option value="">{t('selectGovernorate')}</option>
                                                    {(shippingRates || []).map(rate => (
                                                        <option key={rate.id} value={rate.governorate}>{rate.governorate}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-1">
                                                <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>{t('cityArea')}</label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    required
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                                    placeholder="e.g. Maadi"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>{t('deliveryAddress')}</label>
                                                <textarea
                                                    name="address"
                                                    rows={2}
                                                    required
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                                    placeholder={t('addressPlaceholder')}
                                                />
                                            </div>

                                            {auth.currentUser && (
                                                <div className={`sm:col-span-2 flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        id="saveAddress"
                                                        checked={saveNewAddress}
                                                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                                                    />
                                                    <label htmlFor="saveAddress" className="text-xs font-bold text-gray-600 cursor-pointer select-none">{t('saveAddress')}</label>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {auth.currentUser && selectedAddressId !== 'new' && (
                                        <div className={`sm:col-span-2 bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                            <div className="bg-orange-600 p-2 rounded-lg text-white">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <div className={isAr ? 'text-right' : 'text-left'}>
                                                <p className="text-xs font-black text-orange-900 leading-none mb-1">{t('shippingTo')}: {savedAddresses.find(a => a.id === selectedAddressId)?.label || 'Home'}</p>
                                                <p className="text-[10px] text-orange-600 font-bold">{formData.address}, {formData.city}, {formData.governorate}</p>
                                                <button type="button" onClick={() => handleAddressSelect('new')} className="mt-2 text-[10px] font-black uppercase tracking-widest text-orange-800 hover:underline">{t('changeAddress')}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="space-y-4">
                                <h2 className={`text-xl font-black text-gray-900 flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <Ticket className="h-5 w-5 text-purple-600" />
                                    {t('havePromo')}
                                </h2>
                                <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <input
                                        type="text"
                                        value={promoInput}
                                        onChange={(e) => setPromoInput(e.target.value)}
                                        placeholder={t('promoPlaceholder')}
                                        className={`flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all uppercase font-bold ${isAr ? 'text-right' : 'text-left'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={applyPromoCode}
                                        disabled={promoLoading || !promoInput.trim()}
                                        className="bg-purple-600 text-white px-6 rounded-xl font-black text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
                                    >
                                        {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('apply')}
                                    </button>
                                </div>
                                {promoMessage.text && (
                                    <p className={`text-xs font-bold px-2 flex items-center gap-1 ${isAr ? 'flex-row-reverse' : ''} ${promoMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                        {promoMessage.type === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                        {promoMessage.text}
                                    </p>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            <div className="space-y-6">
                                <h2 className={`text-xl font-black text-gray-900 flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <span className="bg-orange-600 text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    {t('paymentMethod')}
                                </h2>

                                {fetchingMethods ? (
                                    <div className={`flex items-center gap-2 text-gray-400 py-4 italic text-sm font-bold ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('loadingPayments')}
                                    </div>
                                ) : activeMethods.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {activeMethods.map((method) => (
                                            <label
                                                key={method.id}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isAr ? 'flex-row-reverse text-right' : 'text-left'} ${formData.paymentMethod === method.id ? 'border-orange-600 bg-orange-50 shadow-md' : 'border-gray-100 bg-white hover:border-orange-200'}`}
                                            >
                                                <input type="radio" name="paymentMethod" value={method.id} checked={formData.paymentMethod === method.id} onChange={handleChange} className="hidden" />
                                                <div className={`p-2 rounded-lg ${formData.paymentMethod === method.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                    {method.type === 'online' ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${formData.paymentMethod === method.id ? 'text-orange-900' : 'text-gray-700'}`}>{isAr ? (method.nameAr || method.name) : method.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{method.type}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <p className="text-gray-500 text-sm font-bold">{t('noPaymentMethods') || 'No payment methods available'}</p>
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 font-bold">
                                <h3 className={`text-sm font-black text-gray-400 uppercase tracking-widest mb-4 ${isAr ? 'text-right' : 'text-left'}`}>{t('finalSummary')}</h3>
                                <div className="space-y-3">
                                    <div className={`flex justify-between items-center text-sm ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-gray-600 font-bold">{t('subtotal')}</span>
                                        <span className="font-black text-gray-900">{subtotal} {t('currency')}</span>
                                    </div>

                                    {discount > 0 && (
                                        <div className={`flex justify-between items-center text-sm text-green-600 ${isAr ? 'flex-row-reverse' : ''}`}>
                                            <span className="font-bold flex items-center gap-1">
                                                <Ticket className="h-3 w-3" />
                                                {t('discount')} ({appliedPromo?.code})
                                            </span>
                                            <span className="font-black">-{discount} {t('currency')}</span>
                                        </div>
                                    )}

                                    <div className={`flex justify-between items-center text-sm ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-gray-600 font-bold flex items-center gap-1">
                                            {t('shipping')}
                                            {appliedPromo?.type === 'payment_method_shipping' && shipping === 0 && <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded">PAYMENT RULE</span>}
                                            {appliedPromo?.type === 'free_shipping_threshold' && shipping === 0 && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">THRESHOLD RULE</span>}
                                        </span>
                                        <span className={`font-black ${shipping === 0 && subtotal > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                            {shipping === 0 && subtotal > 0 ? (isAr ? 'مجاني' : 'FREE') : `+${shipping} ${t('currency')}`}
                                        </span>
                                    </div>

                                    {appliedPromo?.type === 'product_gift' && (
                                        <div className={`flex justify-between items-center text-[10px] text-purple-600 font-black uppercase tracking-widest border-t border-purple-100 pt-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                            <span>{t('bonusGift')}</span>
                                        </div>
                                    )}

                                    <div className={`flex justify-between items-center pt-3 border-t border-gray-200 ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-lg font-black text-gray-900">{t('totalToPay')}</span>
                                        <span className="text-2xl font-black text-orange-600">{total} <span className="text-xs">{t('currency')}</span></span>
                                    </div>
                                </div>
                            </div>

                            <TrustPaymentSection />

                            <button
                                type="submit"
                                disabled={loading || fetchingMethods || !formData.governorate}
                                className={`w-full flex justify-center items-center gap-2 py-4 px-4 rounded-2xl shadow-xl text-lg font-black text-white bg-gray-900 hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        {t('processing')}
                                    </>
                                ) : (
                                    isOnline ? t('confirmPay') : t('placeOrder')
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
