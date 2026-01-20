import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { collection, addDoc, doc, writeBatch, increment, getDoc, getDocs, query, where, limit, runTransaction } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, ShieldCheck, Banknote, CreditCard, Ticket, CheckCircle2, AlertCircle, MapPin, Plus, User, Mail } from 'lucide-react';
import PhoneInputGroup from '../components/PhoneInputGroup';
import TrustPaymentSection from '../components/TrustPaymentSection';

const Checkout = () => {
    const { cartItems, getCartTotal, clearCart } = useCart();
    const navigate = useNavigate();
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
        fetchPaymentMethods();
        fetchShippingRates();
        if (auth.currentUser) {
            fetchUserProfileAndAddresses();
        }
    }, []);

    const fetchUserProfileAndAddresses = async () => {
        setFetchingAddresses(true);
        try {
            // 1. Fetch Basic Info
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

            // 2. Fetch Addresses
            const addressesSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'addresses'));
            const addresses = addressesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedAddresses(addresses);

            // If addresses exist, select the first one by default
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

        // Update shipping cost based on selected address governorate
        const rate = shippingRates.find(r => r.governorate === addr.governorate);
        setShippingCost(rate ? rate.cost : 0);
    };

    // Re-check payment-based flat rate or free shipping when payment method changes
    useEffect(() => {
        if (appliedPromo?.type === 'payment_method_shipping') {
            checkPromoLogic(appliedPromo);
        }
    }, [formData.paymentMethod]);

    const fetchPaymentMethods = async () => {
        try {
            const q = query(collection(db, 'payment_configs'), where('isActive', '==', true));
            const querySnapshot = await getDocs(q);
            const methods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActiveMethods(methods);
            if (methods.length > 0) {
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
            setShippingRates(data.sort((a, b) => a.governorate.localeCompare(b.governorate)));
        } catch (error) {
            console.error("Error fetching shipping rates:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'governorate') {
            const selectedRate = shippingRates.find(r => r.governorate === value);
            setShippingCost(selectedRate ? selectedRate.cost : 0);
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
                setPromoMessage({ type: 'error', text: 'Invalid or expired promo code.' });
                setAppliedPromo(null);
                return;
            }

            const promoData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };

            // Base Validations
            if (promoData.usedCount >= promoData.usageLimit) {
                setPromoMessage({ type: 'error', text: 'This code has reached its usage limit.' });
                return;
            }

            if (getCartTotal() < (promoData.minOrderValue || 0)) {
                setPromoMessage({ type: 'error', text: `Minimum order value for this code is ${promoData.minOrderValue} EGP.` });
                return;
            }

            // Logic Specific Validations
            const logicResult = checkPromoLogic(promoData);
            if (logicResult.valid) {
                setAppliedPromo(promoData);
                setPromoMessage({ type: 'success', text: logicResult.message || 'Promo code applied successfully!' });
            } else {
                setPromoMessage({ type: 'error', text: logicResult.message });
            }

        } catch (error) {
            console.error("Promo error:", error);
            setPromoMessage({ type: 'error', text: 'Error applying code. Please try again.' });
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
                    return { valid: true, message: 'Free shipping applied!' };
                }
                return { valid: false, message: `Add ${promo.minOrderValue - getCartTotal()} EGP more to get free shipping.` };

            case 'payment_method_shipping': {
                const selectedMethod = activeMethods.find(m => m.id === formData.paymentMethod);
                if (selectedMethod?.type === promo.requiredPaymentMethod) {
                    return { valid: true, message: 'Payment-based free shipping applied!' };
                }
                return { valid: true, message: `Use ${promo.requiredPaymentMethod === 'online' ? 'Online Payment' : 'COD'} for free shipping.` };
            }

            case 'product_gift': {
                const hasTarget = cartItems.some(item => item.id === promo.targetProductId);
                if (hasTarget) {
                    return { valid: true, message: 'Free gift will be added to your order!' };
                }
                return { valid: false, message: 'Required product not found in cart.' };
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
            // 1. Discount Logic
            if (appliedPromo.type === 'discount') {
                if (appliedPromo.isPercentage) {
                    discount = (subtotal * appliedPromo.value) / 100;
                } else {
                    discount = appliedPromo.value;
                }
            }

            // 2. Free Shipping Logic (Threshold)
            if (appliedPromo.type === 'free_shipping_threshold' && subtotal >= (appliedPromo.minOrderValue || 0)) {
                finalShipping = 0;
            }

            // 3. Free Shipping Logic (Payment Method)
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

    /**
     * SECURITY WARNING: Ideally, Secret Keys should be used in a Cloud Function, not Frontend.
     * This is a direct integration for MVP purposes.
     */
    const handleOnlinePayment = async (orderId, methodConfig) => {
        try {
            const totalAmount = total;
            const customerName = formData.name;
            const customerPhone = formData.phone;
            // Assuming customerEmail is not currently in formData, using placeholder or user can add it later
            const customerEmail = "customer@example.com";

            const payload = {
                token: methodConfig.apiKey,
                amount: String(totalAmount),
                currency: "EGP",
                merchant_order_id: `ORDER_${Date.now()}_${orderId}`,
                description: "Zait & Filters Order",
                return_url: `${window.location.origin}/order-success?id=${orderId}`,
                customer: {
                    first_name: "Test",    // Hardcoded for safety during dev
                    last_name: "User",
                    email: "test@test.com",
                    mobile: "01000000000"
                }
            };

            // If real data exists, overwrite the hardcoded values:
            if (customerName) {
                const names = customerName.split(' ');
                payload.customer.first_name = names[0] || "Test";
                payload.customer.last_name = names.slice(1).join(' ') || "User";
            }
            if (customerEmail) payload.customer.email = customerEmail;
            if (customerPhone) payload.customer.mobile = customerPhone;

            console.log('Sending EasyKash Payload:', payload);

            // EasyKash API Endpoint (FORCED RELATIVE PATH VIA LOCAL PROXY)
            const response = await axios.post('/api/easykash/api/v1/orders', payload, {
                headers: {
                    'X-Secret-Key': methodConfig.secretKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.url) {
                window.location.href = response.data.url;
            } else {
                throw new Error("Invalid response from payment gateway");
            }
        } catch (error) {
            console.error("Payment initialization error:", error);
            toast.error("Failed to initialize online payment. Please try again or use COD.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.phone.length < 10) {
            toast.error("Please enter a valid phone number (at least 10 digits).");
            return;
        }

        setLoading(true);
        const formattedPhone = `+2${formData.phone}`;

        const affRef = localStorage.getItem('affiliate_ref');

        if (cartItems.length === 0) {
            toast.error("Your cart is empty!");
            navigate('/');
            return;
        }

        const selectedMethod = activeMethods.find(m => m.id === formData.paymentMethod);

        try {
            const finalOrderItems = [...cartItems];

            // Add gift product if applicable
            if (appliedPromo?.type === 'product_gift') {
                const hasTarget = cartItems.some(item => item.id === appliedPromo.targetProductId);
                if (hasTarget) {
                    finalOrderItems.push({
                        id: appliedPromo.giftProductId,
                        name: "🎁 FREE GIFT",
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
                // Denormalized fields for guest linking queries
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
                affiliateCode: affRef || null,
                status: 'Pending',
                paymentStatus: 'Pending',
                createdAt: new Date()
            };

            // PART 2: CONDITIONAL ORDER CREATION
            if (selectedMethod?.type === 'online') {
                // Online Payment: Save to localStorage, DO NOT create Firestore doc yet
                localStorage.setItem('pending_order', JSON.stringify(orderData));
                localStorage.setItem('pending_cart_items', JSON.stringify(cartItems));

                // Generate temporary order ID for payment tracking
                const tempOrderId = `temp_${Date.now()}`;
                await handleOnlinePayment(tempOrderId, selectedMethod);
            } else {
                // COD: Create Firestore order with Sequential Numbering via Transaction
                const orderId = await runTransaction(db, async (transaction) => {
                    const counterRef = doc(db, 'settings', 'counters');
                    const counterSnap = await transaction.get(counterRef);

                    let nextNumber = 3501;
                    if (counterSnap.exists()) {
                        nextNumber = (counterSnap.data().lastOrderNumber || 3500) + 1;
                    }

                    const orderRef = doc(collection(db, 'orders'));
                    const finalOrderData = {
                        ...orderData,
                        orderNumber: nextNumber,
                        updatedAt: new Date()
                    };

                    transaction.set(orderRef, finalOrderData);

                    // Update counter
                    transaction.set(counterRef, { lastOrderNumber: nextNumber }, { merge: true });

                    // Atomic usage increment for promo code
                    if (appliedPromo) {
                        const promoRef = doc(db, 'promo_codes', appliedPromo.id);
                        transaction.update(promoRef, {
                            usedCount: increment(1)
                        });
                    }

                    // Save new address if requested
                    if (auth.currentUser && saveNewAddress && selectedAddressId === 'new') {
                        const addressRef = doc(collection(db, 'users', auth.currentUser.uid, 'addresses'));
                        transaction.set(addressRef, {
                            detailedAddress: formData.address,
                            governorate: formData.governorate,
                            city: formData.city,
                            label: 'Saved Address',
                            createdAt: new Date()
                        });
                    }

                    // Update product sold counts
                    cartItems.forEach(item => {
                        const productRef = doc(db, 'products', item.id);
                        transaction.update(productRef, {
                            soldCount: increment(item.quantity || 1)
                        });
                    });

                    return orderRef.id;
                });

                localStorage.removeItem('applied_coupon');
                clearCart();
                toast.success('Order placed successfully!');
                navigate(`/order-success?id=${orderId}`);
            }
        } catch (error) {
            console.error("Error creating order:", error);
            toast.error('Error placing order. Please try again.');
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
                    <h1 className="text-3xl font-black text-gray-900">Secure Checkout</h1>
                </div>

                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                    <div className="p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Customer Details */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <span className="bg-orange-600 text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    Shipping Information
                                </h2>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            placeholder="Enter your full name"
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
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">(Optional) Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            placeholder="For order updates"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Mileage (Optional) / رقم العداد الحالي (اختياري)</label>
                                        <input
                                            type="number"
                                            name="currentMileage"
                                            value={formData.currentMileage}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            placeholder="Example: 55000"
                                        />
                                        <p className="mt-1.5 text-[10px] font-bold text-gray-500 leading-tight">
                                            سجل قراءة العداد عشان نحفظلك تاريخ الصيانة في حسابك وتعرف ميعاد التغيير الجاي.
                                        </p>
                                    </div>

                                    {/* Saved Addresses List (Registered Only) */}
                                    {auth.currentUser && savedAddresses.length > 0 && (
                                        <div className="sm:col-span-2 space-y-3">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Select Saved Address</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {savedAddresses.map((addr) => (
                                                    <div
                                                        key={addr.id}
                                                        onClick={() => handleAddressSelect(addr)}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${selectedAddressId === addr.id ? 'border-orange-600 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}
                                                    >
                                                        <MapPin className={`h-5 w-5 mt-0.5 ${selectedAddressId === addr.id ? 'text-orange-600' : 'text-gray-400'}`} />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-black text-gray-900">{addr.label || 'Home'}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold leading-tight">{addr.city}, {addr.governorate}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1 truncate">{addr.detailedAddress}</p>
                                                        </div>
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedAddressId === addr.id ? 'border-orange-600 bg-orange-600' : 'border-gray-300'}`}>
                                                            {selectedAddressId === addr.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div
                                                    onClick={() => handleAddressSelect('new')}
                                                    className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-3 ${selectedAddressId === 'new' ? 'border-orange-600 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <Plus className={`h-5 w-5 ${selectedAddressId === 'new' ? 'text-orange-600' : 'text-gray-400'}`} />
                                                    <p className="text-xs font-black text-gray-900">Use a new address</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Traditional Form Fields */}
                                    {(!auth.currentUser || selectedAddressId === 'new') && (
                                        <>
                                            <div className="sm:col-span-1">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Governorate</label>
                                                <select
                                                    name="governorate"
                                                    required
                                                    value={formData.governorate}
                                                    onChange={handleChange}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                >
                                                    <option value="">Select Governorate</option>
                                                    {shippingRates.map(rate => (
                                                        <option key={rate.id} value={rate.governorate}>
                                                            {rate.governorate}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-1">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">City / Area</label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    required
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                    placeholder="e.g. Maadi"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Delivery Address</label>
                                                <textarea
                                                    name="address"
                                                    rows={2}
                                                    required
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                    placeholder="Building, Street, Floor..."
                                                />
                                            </div>

                                            {auth.currentUser && (
                                                <div className="sm:col-span-2 flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="saveAddress"
                                                        checked={saveNewAddress}
                                                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                                                    />
                                                    <label htmlFor="saveAddress" className="text-xs font-bold text-gray-600 cursor-pointer select-none">
                                                        Save this address to my profile for later
                                                    </label>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Display Selected Address Summary when using a saved one */}
                                    {auth.currentUser && selectedAddressId !== 'new' && (
                                        <div className="sm:col-span-2 bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
                                            <div className="bg-orange-600 p-2 rounded-lg text-white">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-orange-900 leading-none mb-1">Shipping to: {savedAddresses.find(a => a.id === selectedAddressId)?.label || 'Home'}</p>
                                                <p className="text-[10px] text-orange-600 font-bold">
                                                    {formData.address}, {formData.city}, {formData.governorate}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddressSelect('new')}
                                                    className="mt-2 text-[10px] font-black uppercase tracking-widest text-orange-800 hover:underline"
                                                >
                                                    Change Address
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Promo Code Section */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <Ticket className="h-5 w-5 text-purple-600" />
                                    Have a Promo Code?
                                </h2>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={promoInput}
                                        onChange={(e) => setPromoInput(e.target.value)}
                                        placeholder="Enter code here..."
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all uppercase font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={applyPromoCode}
                                        disabled={promoLoading || !promoInput.trim()}
                                        className="bg-purple-600 text-white px-6 rounded-xl font-black text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
                                    >
                                        {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                                    </button>
                                </div>
                                {promoMessage.text && (
                                    <p className={`text-xs font-bold px-2 flex items-center gap-1 ${promoMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                        {promoMessage.type === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                        {promoMessage.text}
                                    </p>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            {/* Payment */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <span className="bg-orange-600 text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    Payment Method
                                </h2>

                                {fetchingMethods ? (
                                    <div className="flex items-center gap-2 text-gray-400 py-4 italic text-sm font-bold">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading payment options...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {activeMethods.map((method) => (
                                            <label
                                                key={method.id}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.paymentMethod === method.id ? 'border-orange-600 bg-orange-50 shadow-md' : 'border-gray-100 bg-white hover:border-orange-200'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={method.id}
                                                    checked={formData.paymentMethod === method.id}
                                                    onChange={handleChange}
                                                    className="hidden"
                                                />
                                                <div className={`p-2 rounded-lg ${formData.paymentMethod === method.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                    {method.type === 'online' ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${formData.paymentMethod === method.id ? 'text-orange-900' : 'text-gray-700'}`}>{method.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{method.type}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            {/* Order Summary */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Final Summary</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-bold">Subtotal</span>
                                        <span className="font-black text-gray-900">{subtotal} EGP</span>
                                    </div>

                                    {discount > 0 && (
                                        <div className="flex justify-between items-center text-sm text-green-600">
                                            <span className="font-bold flex items-center gap-1">
                                                <Ticket className="h-3 w-3" />
                                                Discount ({appliedPromo?.code})
                                            </span>
                                            <span className="font-black">-{discount} EGP</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-bold flex items-center gap-1">
                                            Shipping
                                            {appliedPromo?.type === 'payment_method_shipping' && shipping === 0 && <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded">PAYMENT RULE</span>}
                                            {appliedPromo?.type === 'free_shipping_threshold' && shipping === 0 && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">THRESHOLD RULE</span>}
                                        </span>
                                        <span className={`font-black ${shipping === 0 && subtotal > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                            {shipping === 0 && subtotal > 0 ? 'FREE' : `+${shipping} EGP`}
                                        </span>
                                    </div>

                                    {appliedPromo?.type === 'product_gift' && (
                                        <div className="flex justify-between items-center text-[10px] text-purple-600 font-black uppercase tracking-widest border-t border-purple-100 pt-2">
                                            <span>🎁 Bonus: Free Gift Included!</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                        <span className="text-lg font-black text-gray-900">Total to Pay</span>
                                        <span className="text-2xl font-black text-orange-600">{total} <span className="text-xs">EGP</span></span>
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
                                        Processing...
                                    </>
                                ) : (
                                    isOnline ? 'Confirm & Pay Now' : 'Place Order'
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

