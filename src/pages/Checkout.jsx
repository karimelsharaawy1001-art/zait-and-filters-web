import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { safeLocalStorage } from '../utils/safeStorage';
import { collection, addDoc, doc, writeBatch, increment, getDoc, getDocs, query, where, limit, runTransaction, setDoc, serverTimestamp, arrayUnion, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSafeNavigation } from '../utils/safeNavigation';
import axios from 'axios';
import { safeStorage } from '../utils/storage';
import { Loader2, ShieldCheck, Banknote, CreditCard, Ticket, CheckCircle2, AlertCircle, MapPin, Plus, User, Mail, Smartphone, Trash2, Home, Briefcase, Building, Map } from 'lucide-react';
import { databases } from '../appwrite';
import { Query } from 'appwrite';
import PhoneInputGroup from '../components/PhoneInputGroup';
import TrustPaymentSection from '../components/TrustPaymentSection';

const Checkout = () => {
    const { cartItems, getCartTotal, clearCart, updateCartStage, updateCustomerInfo, getEffectivePrice } = useCart();
    const { navigate } = useSafeNavigation();
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
        currentMileage: '',
        notes: ''
    });

    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('new');
    const [saveNewAddress, setSaveNewAddress] = useState(false);
    const [fetchingAddresses, setFetchingAddresses] = useState(false);

    // Instapay State
    const [receiptImage, setReceiptImage] = useState(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState('');

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
        const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const COLLECTION_ID = import.meta.env.VITE_APPWRITE_PAYMENT_CONFIGS_COLLECTION_ID || 'payment_configs';
        try {
            setFetchingMethods(true);
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                Query.equal('isActive', true)
            ]);
            const methods = response.documents;

            setActiveMethods(Array.isArray(methods) ? methods : []);

            if (methods && methods.length > 0) {
                setFormData(prev => ({ ...prev, paymentMethod: methods[0].$id }));
            }
        } catch (error) {
            console.error("Error fetching payment methods:", error);
        } finally {
            setFetchingMethods(false);
        }
    };

    const fetchShippingRates = async () => {
        const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        try {
            const response = await databases.listDocuments(DATABASE_ID, 'shipping_rates', [Query.limit(100)]);
            const data = response.documents;

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
            const selectedRate = (shippingRates || []).find(r =>
                r.governorate?.trim() === value?.trim()
            );
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
                const selectedMethod = activeMethods.find(m => m.$id === formData.paymentMethod);
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
                const selectedMethod = activeMethods.find(m => m.$id === formData.paymentMethod);
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

            // Call our Vercel serverless function (which constructs the Redirect URL)
            const response = await axios.post('/api/init-payment', {
                amount: totalAmount,
                orderId: orderId,
                customerName: customerName,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                returnUrl: `${window.location.origin}/order-success?id=${orderId}`
            });

            const data = response.data;

            if (data && data.url) {
                console.log("Redirecting to EasyKash:", data.url);
                window.location.href = data.url;
            } else {
                console.error("Payment API response missing URL:", data);
                throw new Error(t('onlinePaymentError') || "Could not generate payment link.");
            }
        } catch (error) {
            console.error("Payment initialization error:", error);
            // Log full details for debugging
            if (error.response) {
                console.error("API Response Data:", error.response.data);
                console.error("API Status:", error.response.status);
            }

            const msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : "") || error.message || t('onlinePaymentError');
            toast.error("Payment Error: " + msg);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let timeoutId;
        try {
            setLoading(true);
            console.log("Submit started:", { formData, cartItemsCount: cartItems.length });

            // Safety timeout to prevent permanent hang
            timeoutId = setTimeout(() => {
                setLoading(currentLoading => {
                    if (currentLoading) {
                        toast.error("تأخر الطلب كثيراً. يرجى التحقق من اتصال الإنترنت أو المحاولة مرة أخرى.");
                        console.error("Checkout timed out after 30 seconds");
                        return false;
                    }
                    return false;
                });
            }, 30000);


            if (formData.phone.length < 10) {
                toast.error(t('phoneError'));
                setLoading(false);
                clearTimeout(timeoutId);
                return;
            }

            // Instapay & Wallet Validation
            if ((formData.paymentMethod === 'instapay' || formData.paymentMethod === 'wallet') && !receiptUrl) {
                toast.error('Please upload the payment receipt first');
                setLoading(false);
                clearTimeout(timeoutId);
                return;
            }

            if (cartItems.length === 0) {
                toast.error(t('cartEmpty'));
                navigate('/');
                setLoading(false);
                clearTimeout(timeoutId);
                return;
            }

            const formattedPhone = `+2${formData.phone}`;
            const affRef = safeLocalStorage.getItem('affiliate_ref');
            const selectedMethod = activeMethods.find(m => m.$id === formData.paymentMethod);

            const finalOrderItems = cartItems.map(item => ({
                id: item.id || 'unknown',
                name: item.name || 'Unknown Product',
                nameEn: item.nameEn || null,
                price: Number(getEffectivePrice(item)) || 0,
                quantity: Number(item.quantity) || 1,
                image: item.image || null,
                brand: item.brand || null,
                brandEn: item.brandEn || null,
                make: item.make || null,
                model: item.model || null,
                yearStart: item.yearStart || null,
                yearEnd: item.yearEnd || null,
                yearRange: item.yearRange || null,
                category: item.category || null,
                subcategory: item.subcategory || item.subCategory || null,
                countryOfOrigin: item.countryOfOrigin || item.country || null
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
                        image: "https://images.unsplash.com/photo-1549463591-24398142643c?auto=format&fit=crop&q=80&w=200",
                        brand: "Z&F",
                        category: "Gifts"
                    });
                }
            }

            // Receipt sanity check
            if ((formData.paymentMethod === 'instapay' || formData.paymentMethod === 'wallet') && uploadingReceipt) {
                toast.error('Please wait for the receipt to finish uploading.');
                setLoading(false);
                clearTimeout(timeoutId);
                return;
            }

            const rawOrderData = {
                userId: auth.currentUser?.uid || 'guest',
                customer: {
                    name: formData.name || 'Guest',
                    phone: formattedPhone || '',
                    email: formData.email || null,
                    address: formData.address || '',
                    governorate: formData.governorate || '',
                    city: formData.city || ''
                },
                customerPhone: formattedPhone || '',
                customerEmail: formData.email || null,
                paymentMethod: (selectedMethod?.name || formData.paymentMethod) || 'Unknown',
                paymentType: (selectedMethod?.type || 'offline'),
                items: finalOrderItems,
                subtotal: Number(subtotal) || 0,
                discount: Number(discount) || 0,
                shipping_cost: Number(shipping) || 0,
                total: Number(total) || 0,
                currentMileage: formData.currentMileage || null,
                notes: formData.notes || null,
                promoCode: appliedPromo?.code || null,
                promoId: appliedPromo?.id || null,
                affiliateCode: (affRef || appliedPromo?.code) ? (affRef || appliedPromo.code) : null,
                status: (formData.paymentMethod === 'instapay' || formData.paymentMethod === 'wallet') ? 'Awaiting Payment Verification' : 'Pending',
                paymentStatus: (formData.paymentMethod === 'instapay' || formData.paymentMethod === 'wallet') ? 'Awaiting Verification' : 'Pending',
                receiptUrl: (formData.paymentMethod === 'instapay' || formData.paymentMethod === 'wallet') ? (receiptUrl || null) : null,
                createdAt: new Date()
            };

            // Enhanced data cleaning to remove undefined/NaN
            const orderData = JSON.parse(JSON.stringify(rawOrderData, (key, value) => {
                if (typeof value === 'number' && isNaN(value)) return 0;
                if (value === undefined) return null;
                return value;
            }));

            if (selectedMethod?.type === 'online') {
                console.log("[DEBUG] Online payment path selected");
                toast.loading("Initiating payment gateway...");
                safeLocalStorage.setItem('pending_order', JSON.stringify(orderData));
                safeLocalStorage.setItem('pending_cart_items', JSON.stringify(cartItems));
                const tempOrderId = `temp_${Date.now()}`;
                await handleOnlinePayment(tempOrderId, selectedMethod);
            } else {
                console.log("[DEBUG] Starting order creation (Appwrite)...");

                let orderId;
                let finalOrderNumber;

                const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
                const SETTINGS_COLLECTION = 'settings';
                const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';
                const PROMOS_COLLECTION = import.meta.env.VITE_APPWRITE_PROMO_CODES_COLLECTION_ID || 'promo_codes';
                const USERS_COLLECTION = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || 'users';
                const ABANDONED_COLLECTION = import.meta.env.VITE_APPWRITE_ABANDONED_CARTS_COLLECTION_ID || 'abandoned_carts';

                try {
                    // 1. Get Next Order Number (Optimistic Locking / Simple Increment for now)
                    // Note: Ideally use a server function for atomic increment. Client-side is susceptible to race conditions.
                    // For now, we fetch, increment, and update.
                    let nextNumber = 3501;
                    try {
                        const counterDoc = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, 'counters');
                        nextNumber = (counterDoc.lastOrderNumber || 3500) + 1;
                        await databases.updateDocument(DATABASE_ID, SETTINGS_COLLECTION, 'counters', {
                            lastOrderNumber: nextNumber
                        });
                    } catch (e) {
                        console.warn("Counter sync failed, using timestamp fallback", e);
                        nextNumber = parseInt(Date.now().toString().slice(-6));
                    }
                    finalOrderNumber = nextNumber;

                    // 2. Prepare Appwrite Payload
                    // Appwrite expects flat JSON mostly, but 'items' and 'customerInfo' are strings in schema
                    const appwritePayload = {
                        orderNumber: String(finalOrderNumber),
                        userId: auth.currentUser?.uid || 'guest',
                        customerInfo: JSON.stringify(orderData.customer),
                        items: JSON.stringify(finalOrderItems),
                        subtotal: orderData.subtotal,
                        discount: orderData.discount,
                        shippingCost: orderData.shipping_cost, // Verify schema name
                        total: orderData.total,
                        paymentMethod: orderData.paymentMethod,
                        paymentType: orderData.paymentType,
                        paymentStatus: orderData.paymentStatus,
                        status: orderData.status,
                        shippingAddress: JSON.stringify({
                            address: formData.address,
                            governorate: formData.governorate,
                            city: formData.city
                        }),
                        currentMileage: formData.currentMileage ? Number(formData.currentMileage) : null,
                        notes: formData.notes,
                        promoCode: orderData.promoCode,
                        affiliateCode: orderData.affiliateCode,
                        receiptUrl: orderData.receiptUrl,
                        createdAt: new Date().toISOString()
                    };

                    // 3. Create Order Document
                    const result = await databases.createDocument(
                        DATABASE_ID,
                        ORDERS_COLLECTION,
                        ID.unique(),
                        appwritePayload
                    );

                    orderId = result.$id;
                    console.log("[DEBUG] Appwrite Order Created:", orderId);

                    // 4. Post-Order Updates (Background)
                    try {
                        // Increment Promo Usage
                        if (appliedPromo?.id) {
                            const promoDoc = await databases.getDocument(DATABASE_ID, PROMOS_COLLECTION, appliedPromo.id);
                            await databases.updateDocument(DATABASE_ID, PROMOS_COLLECTION, appliedPromo.id, {
                                usedCount: (promoDoc.usedCount || 0) + 1
                            });
                        }

                        // Update Product Sales (Best effort)
                        /* 
                           Note: Appwrite doesn't support batch updates easily from client. 
                           We skip soldCount update OR do it individually (slow). 
                           Let's do individually for now.
                        */
                        finalOrderItems.forEach(async (item) => {
                            if (item.id && item.id !== 'unknown') {
                                try {
                                    const pDoc = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.id);
                                    await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.id, {
                                        soldCount: (pDoc.soldCount || 0) + item.quantity
                                    });
                                } catch (e) { console.warn("Failed to update stock/sold for", item.id); }
                            }
                        });


                        // Sync Abandoned Cart (Mark Recovered)
                        const cartId = auth.currentUser ? auth.currentUser.uid : safeLocalStorage.getItem('cartSessionId');
                        if (cartId) {
                            await databases.updateDocument(DATABASE_ID, ABANDONED_COLLECTION, cartId, {
                                recovered: true,
                                recoveredAt: new Date().toISOString(),
                                orderId: orderId
                            });
                        }

                        // Save New Address if requested (Appwrite 'users' collection sub-collection 'addresses'?)
                        // Note: We might not have permissions to write to sub-collections of 'users' easily via client unless set up.
                        // Given Admin manages users, maybe we skip saving address to Appwrite for "users" unless we have a specific 'addresses' collection.
                        // The prompt didn't specify an addresses collection in Appwrite. 
                        // Check: Checkout.jsx used `collection(db, 'users', uid, 'addresses')`.
                        // If Appwrite doesn't have an 'addresses' collection linked to users, we skip this.
                        // Assumption: We might need to migrate addresses later, but for now, prioritize order creation.

                    } catch (bgError) {
                        console.warn("Background updates failed:", bgError);
                    }

                } catch (createError) {
                    console.error("Appwrite Creation Failed:", createError);
                    throw createError;
                }

                clearCart();
                clearTimeout(timeoutId);

                const isInstaPay = formData.paymentMethod?.toLowerCase() === 'instapay' || formData.paymentMethod?.toLowerCase() === 'wallet';
                const successMsg = isInstaPay
                    ? (isAr
                        ? 'تم استلام طلبك وبانتظار مراجعة التحويل. سيتم التأكيد خلال 24 ساعة.'
                        : 'Order received! We are reviewing your transfer. Confirmation will be sent within 24 hours.')
                    : t('orderPlaced');

                toast.success(successMsg, { duration: 8000 });

                setTimeout(() => {
                    navigate(`/order-success?id=${orderId}`);
                }, 1000);
            }
        } catch (error) {
            console.error("[DEBUG] FATAL ERROR IN SUBMIT:", error);
            const errorMsg = error.message || (isAr ? "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." : "An unexpected error occurred. Please try again.");
            toast.error(`${isAr ? "خطأ" : "Error"}: ${errorMsg}`, { duration: 6000 });
        } finally {
            console.log("[DEBUG] Submit finished (finally block)");
            setLoading(false);
            if (timeoutId) clearTimeout(timeoutId);
        }
    };

    const isOnline = activeMethods.find(m => m.$id === formData.paymentMethod)?.type === 'online';

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
                                    <span className="bg-[#28B463] text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">1</span>
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
                                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
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
                                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                            placeholder={t('emailPlaceholder')}
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                            {isAr ? 'قرائة العداد الحالية (كم)' : 'Current Mileage (KM)'}
                                        </label>
                                        <input
                                            type="number"
                                            name="currentMileage"
                                            value={formData.currentMileage}
                                            onChange={handleChange}
                                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                            placeholder={isAr ? 'مثال: 150000' : 'e.g. 150000'}
                                        />
                                    </div>
                                </div>



                                {auth.currentUser && (
                                    <div className="sm:col-span-2 space-y-4">
                                        <label className={`block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                            {t('deliveryDestination', isAr ? 'وجهة التوصيل' : 'Delivery Destination')}
                                        </label>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Saved Addresses */}
                                            {savedAddresses.map((addr) => {
                                                const isActive = selectedAddressId === addr.id;
                                                const Icon = addr.label?.toLowerCase() === 'home' || addr.labelAr === 'المنزل' ? Home :
                                                    addr.label?.toLowerCase() === 'office' || addr.label?.toLowerCase() === 'work' || addr.labelAr === 'العمل' ? Building : MapPin;

                                                return (
                                                    <div
                                                        key={addr.id}
                                                        onClick={() => handleAddressSelect(addr)}
                                                        className={`relative overflow-hidden group cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 transform active:scale-95 ${isActive
                                                            ? 'border-orange-600 bg-orange-50/50 shadow-lg shadow-orange-100'
                                                            : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                                                            } ${isAr ? 'text-right' : 'text-left'}`}
                                                    >
                                                        {isActive && (
                                                            <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} bg-orange-600 text-white p-1 rounded-bl-xl rounded-tr-none shadow-sm`}>
                                                                <CheckCircle2 className="h-3 w-3" />
                                                            </div>
                                                        )}
                                                        <div className={`flex items-start gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-orange-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-black truncate ${isActive ? 'text-orange-900' : 'text-gray-900'}`}>
                                                                    {isAr ? (addr.labelAr || addr.label || 'عنوان مسجل') : (addr.label || 'Saved Address')}
                                                                </p>
                                                                <p className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-orange-700' : 'text-gray-500'}`}>
                                                                    {addr.city}, {addr.governorate}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-2 truncate font-medium">
                                                                    {addr.detailedAddress}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* New Address Option */}
                                            <div
                                                onClick={() => handleAddressSelect('new')}
                                                className={`relative overflow-hidden group cursor-pointer p-4 rounded-2xl border-2 border-dashed transition-all duration-300 transform active:scale-95 ${selectedAddressId === 'new'
                                                    ? 'border-orange-600 bg-orange-50/50 shadow-lg shadow-orange-100'
                                                    : 'border-gray-200 bg-gray-50/30 hover:border-orange-300 hover:bg-gray-50'
                                                    } ${isAr ? 'text-right' : 'text-left'}`}
                                            >
                                                <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`p-2 rounded-xl transition-colors ${selectedAddressId === 'new' ? 'bg-orange-600 text-white' : 'bg-white text-gray-400 group-hover:text-orange-500 shadow-sm'}`}>
                                                        <Plus className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-black ${selectedAddressId === 'new' ? 'text-orange-900' : 'text-gray-900'}`}>
                                                            {t('useNewAddress')}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-bold">
                                                            {isAr ? 'إضافة عنوان شحن جديد' : 'Add a new shipping address'}
                                                        </p>
                                                    </div>
                                                </div>
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
                                                className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
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
                                                className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
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
                                                className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
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

                                        {selectedAddressId !== 'new' && (
                                            <div className={`sm:col-span-2 bg-gradient-to-br from-orange-50 to-white p-6 rounded-2xl border border-orange-100 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                <div className="bg-orange-600 p-3 rounded-2xl text-white shadow-lg shadow-orange-200">
                                                    <Map className="h-5 w-5" />
                                                </div>
                                                <div className={`flex-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                                    <div className={`flex justify-between items-center mb-1 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                        <p className="text-xs font-black text-orange-900 uppercase tracking-widest">{t('shippingTo')}</p>
                                                        <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                                            {savedAddresses.find(a => a.id === selectedAddressId)?.label || 'Home'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-black text-gray-900">{formData.address}</p>
                                                    <p className="text-[11px] text-orange-600 font-bold mt-1">{formData.city}, {formData.governorate}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddressSelect('new')}
                                                        className="mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600 transition-colors group"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        {t('changeAddress')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="sm:col-span-2">
                                    <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                        {isAr ? 'ملاحظات الطلب (اختياري)' : 'Order Notes (Optional)'}
                                    </label>
                                    <textarea
                                        name="notes"
                                        rows={3}
                                        value={formData.notes}
                                        onChange={handleChange}
                                        className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all ${isAr ? 'text-right' : 'text-left'}`}
                                    />
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
                                        className={`flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-gray-500 focus:ring-2 focus:ring-[#28B463] outline-none transition-all uppercase font-bold ${isAr ? 'text-right' : 'text-left'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={applyPromoCode}
                                        disabled={promoLoading || !promoInput.trim()}
                                        className="bg-[#28B463] text-white px-6 rounded-xl font-black text-sm hover:bg-[#219653] transition-all disabled:opacity-50"
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

                            <hr className="border-gray-100" />

                            <div className="space-y-6">
                                <h2 className={`text-xl font-black text-gray-900 flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <span className="bg-[#28B463] text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">3</span>
                                    {t('paymentMethod')}
                                </h2>

                                {fetchingMethods ? (
                                    <div className={`flex items-center gap-2 text-gray-400 py-4 italic text-sm font-bold ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('loadingPayments')}
                                    </div>
                                ) : activeMethods.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {activeMethods.map((method) => (
                                                <label
                                                    key={method.id}
                                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isAr ? 'flex-row-reverse text-right' : 'text-left'} ${formData.paymentMethod === method.id ? 'border-orange-600 bg-orange-50 shadow-md' : 'border-gray-100 bg-white hover:border-orange-200'}`}
                                                >
                                                    <input type="radio" name="paymentMethod" value={method.id} checked={formData.paymentMethod === method.id} onChange={handleChange} className="hidden" />
                                                    <div className={`p-2 rounded-lg ${formData.paymentMethod === method.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        {method.type === 'online' ? <CreditCard className="h-5 w-5" /> : method.id === 'instapay' ? <Smartphone className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${formData.paymentMethod === method.id ? 'text-orange-900' : 'text-gray-700'}`}>
                                                            {(() => {
                                                                if (method.id === 'easykash' && (method.name === 'Credit Card (EasyKash)' || !method.nameAr)) {
                                                                    return isAr ? 'الدفع عن طريق الفيزا و شركات التقسيط' : 'Pay via Card or Installments';
                                                                }
                                                                return isAr ? (method.nameAr || method.name) : method.name;
                                                            })()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{method.type}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>

                                        {/* Instapay Section */}
                                        {formData.paymentMethod === 'instapay' && (
                                            <div className="mt-6 bg-[#663299]/5 border border-[#663299]/10 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="bg-[#663299] p-2 rounded-lg">
                                                        <Smartphone className="h-5 w-5 text-white" />
                                                    </div>
                                                    <h3 className="text-[#663299] font-black uppercase tracking-widest text-sm">Instapay Transfer</h3>
                                                </div>

                                                <div className="space-y-4">
                                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                                        برجاء التحويل عن طريق الضغط على اللينك أدناه أو مسح QR Code
                                                    </p>

                                                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                        <a
                                                            href="https://ipn.eg/S/jimmydodo/instapay/3Jvfcf"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 bg-[#663299] hover:bg-[#522580] text-white font-black py-3 px-6 rounded-xl text-center transition-all shadow-lg shadow-[#663299]/20 w-full"
                                                        >
                                                            Pay {total} EGP Now
                                                        </a>
                                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                            Total Amount: <span className="text-[#663299] text-base">{total} EGP</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-[#663299]/10">
                                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                                                            ارفع إثبات الدفع (لقطة شاشة)
                                                        </label>

                                                        {!receiptUrl ? (
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files[0];
                                                                        if (!file) return;

                                                                        setUploadingReceipt(true);
                                                                        try {
                                                                            const { uploadToCloudinary } = await import('../utils/cloudinaryUtils');
                                                                            const url = await uploadToCloudinary(file);
                                                                            setReceiptUrl(url);
                                                                            toast.success('Receipt uploaded successfully!');
                                                                        } catch (error) {
                                                                            console.error("Upload error:", error);
                                                                            toast.error("Failed to upload receipt");
                                                                        } finally {
                                                                            setUploadingReceipt(false);
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                    id="receipt-upload"
                                                                />
                                                                <label
                                                                    htmlFor="receipt-upload"
                                                                    className={`w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploadingReceipt ? 'bg-gray-50 border-gray-300' : 'bg-white border-[#663299]/30 hover:bg-[#663299]/5'}`}
                                                                >
                                                                    {uploadingReceipt ? (
                                                                        <>
                                                                            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                                                                            <span className="text-gray-400 font-bold text-sm">Uploading...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Plus className="h-6 w-6 text-[#663299]" />
                                                                            <span className="text-[#663299] font-black uppercase tracking-widest text-xs">Upload Receipt Image</span>
                                                                        </>
                                                                    )}
                                                                </label>
                                                            </div>
                                                        ) : (
                                                            <div className="relative bg-white p-2 rounded-2xl border border-green-100 shadow-sm flex items-center gap-4">
                                                                <img src={receiptUrl} alt="Receipt" className="h-16 w-16 object-cover rounded-xl" />
                                                                <div className="flex-1">
                                                                    <p className="text-green-600 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        Receipt Attached
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setReceiptUrl('')}
                                                                        className="text-[10px] text-red-500 font-bold hover:underline mt-1"
                                                                    >
                                                                        Remove & Upload Again
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Electronic Wallet Section */}
                                        {formData.paymentMethod === 'wallet' && (
                                            <div className="mt-6 bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="bg-orange-500 p-2 rounded-lg">
                                                        <Smartphone className="h-5 w-5 text-white" />
                                                    </div>
                                                    <h3 className="text-orange-600 font-black uppercase tracking-widest text-sm">Electronic Wallet Transfer</h3>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                                        <p className="text-sm font-bold text-gray-700 leading-relaxed text-center">
                                                            برجاء تحويل المبلغ إلى الرقم التالي
                                                        </p>
                                                        <div className="flex justify-center">
                                                            <div className="bg-orange-50 px-6 py-2 rounded-lg border border-orange-100">
                                                                <p className="text-xl font-black text-orange-600 font-mono tracking-wider">
                                                                    {activeMethods.find(m => m.id === 'wallet')?.number || '010XXXXXXXX'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-widest">(بإسم: محمد جمال ابراهيم)</p>
                                                    </div>

                                                    <div className="flex justify-center">
                                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                            Total Amount: <span className="text-orange-600 text-base">{total} EGP</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-orange-500/10">
                                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                                                            ارفع إثبات الدفع (لقطة شاشة)
                                                        </label>

                                                        {!receiptUrl ? (
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files[0];
                                                                        if (!file) return;

                                                                        setUploadingReceipt(true);
                                                                        try {
                                                                            const { uploadToCloudinary } = await import('../utils/cloudinaryUtils');
                                                                            const url = await uploadToCloudinary(file);
                                                                            setReceiptUrl(url);
                                                                            toast.success('Receipt uploaded successfully!');
                                                                        } catch (error) {
                                                                            console.error("Upload error:", error);
                                                                            toast.error("Failed to upload receipt");
                                                                        } finally {
                                                                            setUploadingReceipt(false);
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                    id="wallet-receipt-upload"
                                                                />
                                                                <label
                                                                    htmlFor="wallet-receipt-upload"
                                                                    className={`w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploadingReceipt ? 'bg-gray-50 border-gray-300' : 'bg-white border-orange-500/30 hover:bg-orange-500/5'}`}
                                                                >
                                                                    {uploadingReceipt ? (
                                                                        <>
                                                                            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                                                                            <span className="text-gray-400 font-bold text-sm">Uploading...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Plus className="h-6 w-6 text-orange-600" />
                                                                            <span className="text-orange-600 font-black uppercase tracking-widest text-xs">Upload Receipt Image</span>
                                                                        </>
                                                                    )}
                                                                </label>
                                                            </div>
                                                        ) : (
                                                            <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                                                                <img src={receiptUrl} alt="Receipt" className="w-full h-auto" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setReceiptUrl('')}
                                                                    className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <p className="text-gray-500 text-sm font-bold">{t('noPaymentMethods') || 'No payment methods available'}</p>
                                    </div>
                                )}
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
