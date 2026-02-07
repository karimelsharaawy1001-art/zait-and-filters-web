import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, Package, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { collection, doc, increment, runTransaction, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { generateInvoice } from '../utils/invoiceGenerator';
import { Download } from 'lucide-react';
import { safeLocalStorage } from '../utils/safeStorage';

const runPostOrderActions = async (order, databases, DATABASE_ID, PRODUCTS_COLLECTION, PROMOS_COLLECTION, ABANDONED_COLLECTION) => {
    try {
        console.log("[POST-ORDER] Starting automated actions for order:", order.id);

        // 1. Mark abandoned cart as recovered
        const cartId = auth.currentUser ? auth.currentUser.uid : (safeLocalStorage.getItem('cartSessionId') || order.sessionId);
        if (cartId) {
            await databases.updateDocument(DATABASE_ID, ABANDONED_COLLECTION, cartId, {
                recovered: true,
                recoveredAt: new Date().toISOString(),
                orderId: order.id
            });
            console.log("[POST-ORDER] Abandoned cart marked as recovered.");
        }

        // 2. Increment Promo Usage
        if (order.promoId) {
            try {
                const promoDoc = await databases.getDocument(DATABASE_ID, PROMOS_COLLECTION, order.promoId);
                await databases.updateDocument(DATABASE_ID, PROMOS_COLLECTION, order.promoId, {
                    usedCount: (promoDoc.usedCount || 0) + 1
                });
                console.log("[POST-ORDER] Promo usage incremented.");
            } catch (e) { console.warn("Promo update failed", e); }
        }

        // 3. Update Product Sales
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(async (item) => {
            if (item.id && item.id !== 'unknown') {
                try {
                    const pDoc = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.id);
                    await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.id, {
                        soldCount: (pDoc.soldCount || 0) + item.quantity
                    });
                } catch (e) { console.warn("Stock update failed for", item.id); }
            }
        });

        // 4. Automated Sync (Mailchimp & SendGrid)
        try {
            const { default: axios } = await import('axios');
            const firstName = order.customer?.name?.split(' ')[0] || '';
            const lastName = order.customer?.name?.split(' ').slice(1).join(' ') || '';
            const customerEmail = order.customer?.email || order.customerEmail;

            if (customerEmail) {
                await axios.post('/api/products?action=subscribe', {
                    email: customerEmail,
                    firstName: firstName,
                    lastName: lastName
                });

                await axios.post('/api/send-order-email', {
                    order: {
                        id: order.id,
                        total: order.total,
                        items: items,
                        shippingAddress: order.customer,
                        customerName: order.customer?.name || 'Customer',
                        customerEmail: customerEmail
                    }
                });
                console.log("[POST-ORDER] Emails sent.");
            }
        } catch (e) { console.error("Email sync failed", e); }

    } catch (e) { console.warn("Post-order actions failed", e); }
};

const OrderSuccess = () => {
    const [searchParams] = useSearchParams();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { clearCart } = useCart();
    const [orderId, setOrderId] = useState(null);
    const [orderNumber, setOrderNumber] = useState(null);
    const [fullOrder, setFullOrder] = useState(null);
    const [processing, setProcessing] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        setIsGuest(!auth.currentUser);
    }, []);

    useEffect(() => {
        const createPendingOrder = async () => {
            try {
                // Check if we have a pending order in local storage (from Checkout)
                // Note: Checkout.jsx no longer sets 'pending_order' for offline payments in the same way,
                // nor does it rely on 'pending_cart_items' for creation here.
                // However, for ONLINE payments, we might still store pending data?
                // Actually, Checkout.jsx handling for online payment still uses:
                // safeLocalStorage.setItem('pending_order', JSON.stringify(orderData));
                // safeLocalStorage.setItem('pending_cart_items', JSON.stringify(cartItems));
                // BUT, the API /api/init-payment creates the order? No, usually it just gets a link.
                // If the flow is: Checkout -> Init Payment -> Redirect -> Return to Success -> Create Order?
                // OR Checkout -> Create Order (Pending) -> Init Payment -> Redirect -> Return to Success -> Update Order?
                //
                // Looking at Checkout.jsx:
                // It calls `handleOnlinePayment`, which calls `/api/init-payment`.
                // It DOES NOT create the document in Appwrite before redirecting for online payments?
                // Wait, logic says: if (online) { handleOnlinePayment } else { createDocument }.
                // AND handleOnlinePayment does NOT create the document.
                // So for Online Payments, we rely on `OrderSuccess` to create it?
                //
                // Let's check `OrderSuccess.jsx` original logic.
                // It checks `pendingOrderData`. If exists, it runs transaction to create order.
                // So yes, for Online Payments, `OrderSuccess` CREATES the order.
                // I need to replicate that logic for Appwrite.

                const pendingOrderData = safeLocalStorage.getItem('pending_order');
                const pendingCartItems = safeLocalStorage.getItem('pending_cart_items');

                const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
                const SETTINGS_COLLECTION = 'settings';
                const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';
                const ABANDONED_COLLECTION = import.meta.env.VITE_APPWRITE_ABANDONED_CARTS_COLLECTION_ID || 'abandoned_carts';
                const PROMOS_COLLECTION = import.meta.env.VITE_APPWRITE_PROMO_CODES_COLLECTION_ID || 'promo_codes';

                // Import Appwrite SDK if not globally available, but we use 'databases' from ../appwrite
                const { databases } = await import('../appwrite');
                const { ID } = await import('appwrite');

                let orderData = null;
                let cartItems = [];
                let usedFallback = false;

                const urlOrderId = searchParams.get('id');
                const isEasyKashReturn = searchParams.get('order') || searchParams.get('reference');

                // 1. Try to fetch existing order first (since we now create it BEFORE redirect)
                if (urlOrderId && !urlOrderId.startsWith('temp_')) {
                    try {
                        const existingOrder = await databases.getDocument(DATABASE_ID, ORDERS_COLLECTION, urlOrderId);
                        if (existingOrder) {
                            console.log("[SUCCESS] Found existing order:", urlOrderId, "Status:", existingOrder.status);

                            // If it's awaiting payment, update it
                            if (existingOrder.status === 'Awaiting Online Payment') {
                                await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, urlOrderId, {
                                    paymentStatus: 'Paid',
                                    status: 'Pending',
                                    updatedAt: new Date().toISOString()
                                });
                                console.log("[SUCCESS] Order status updated to Paid.");
                            }

                            // Setup state for UI
                            let parsedItems = [];
                            try { parsedItems = JSON.parse(existingOrder.items); } catch (e) { }
                            let parsedCustomer = {};
                            try { parsedCustomer = JSON.parse(existingOrder.customerInfo); } catch (e) { }

                            setOrderId(urlOrderId);
                            setOrderNumber(existingOrder.orderNumber);
                            const orderForUI = { id: urlOrderId, ...existingOrder, items: parsedItems, customer: parsedCustomer };
                            setFullOrder(orderForUI);

                            // Proceed to post-order updates
                            await runPostOrderActions(orderForUI, databases, DATABASE_ID, PRODUCTS_COLLECTION, PROMOS_COLLECTION, ABANDONED_COLLECTION);

                            safeLocalStorage.removeItem('pending_order');
                            safeLocalStorage.removeItem('pending_cart_items');
                            clearCart();
                            setProcessing(false);
                            return; // EXIT: Unified path handled
                        }
                    } catch (e) {
                        console.warn("[SUCCESS] Order not found or error fetching:", urlOrderId, e);
                    }
                }

                // 2. FALLBACK/LEGACY PATH: Create from pendingOrderData or Abandoned Cart
                if (pendingOrderData) {
                    orderData = JSON.parse(pendingOrderData);
                    cartItems = pendingCartItems ? JSON.parse(pendingCartItems) : [];
                } else if (!urlOrderId || (urlOrderId && urlOrderId.startsWith('temp_')) || isEasyKashReturn) {
                    console.log("[RECOVERY] Attempting fallback recovery from abandoned carts...");
                    const cartId = auth.currentUser ? auth.currentUser.uid : safeLocalStorage.getItem('cartSessionId');

                    if (cartId) {
                        try {
                            const abandonedDoc = await databases.getDocument(DATABASE_ID, ABANDONED_COLLECTION, cartId);
                            if (abandonedDoc && !abandonedDoc.recovered) {
                                orderData = {
                                    customer: {
                                        name: abandonedDoc.customerName,
                                        phone: abandonedDoc.customerPhone,
                                        email: abandonedDoc.email,
                                        address: abandonedDoc.customerAddress || '',
                                        governorate: abandonedDoc.customerGovernorate || '',
                                        city: abandonedDoc.customerCity || ''
                                    },
                                    subtotal: abandonedDoc.total,
                                    discount: 0,
                                    shipping_cost: 0,
                                    total: abandonedDoc.total,
                                    paymentMethod: 'EasyKash / Online',
                                    paymentType: 'online',
                                    notes: 'Recovered from abandoned cart'
                                };
                                cartItems = JSON.parse(abandonedDoc.items || '[]');
                                usedFallback = true;
                                console.log("[RECOVERY] Successfully mapped abandoned cart for recovery.");
                            }
                        } catch (e) { console.warn("[RECOVERY] Abandoned cart failure:", e); }
                    }
                }

                if (orderData) {

                    // 1. Get Next Order Number
                    let nextNumber = 3501;
                    try {
                        const counterDoc = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, 'counters');
                        nextNumber = (counterDoc.lastOrderNumber || 3500) + 1;
                        await databases.updateDocument(DATABASE_ID, SETTINGS_COLLECTION, 'counters', {
                            lastOrderNumber: nextNumber
                        });
                    } catch (e) {
                        console.warn("Counter sync failed", e);
                        nextNumber = parseInt(Date.now().toString().slice(-6));
                    }

                    // 2. Create Order in Appwrite
                    const appwritePayload = {
                        orderNumber: String(nextNumber),
                        userId: auth.currentUser?.uid || 'guest',
                        customerInfo: JSON.stringify(orderData.customer),
                        items: JSON.stringify(cartItems),
                        subtotal: orderData.subtotal,
                        discount: orderData.discount,
                        shippingCost: orderData.shipping_cost,
                        total: orderData.total,
                        paymentMethod: orderData.paymentMethod,
                        paymentType: orderData.paymentType,
                        paymentStatus: 'Paid', // Success page implies paid if it was online
                        status: 'Pending',
                        shippingAddress: JSON.stringify({ // Ensure accurate mapping
                            address: orderData.customer?.address || '',
                            governorate: orderData.customer?.governorate || '',
                            city: orderData.customer?.city || ''
                        }),
                        currentMileage: orderData.currentMileage ? Number(orderData.currentMileage) : null,
                        notes: orderData.notes,
                        promoCode: orderData.promoCode,
                        affiliateCode: orderData.affiliateCode,
                        createdAt: new Date().toISOString()
                    };

                    const result = await databases.createDocument(DATABASE_ID, ORDERS_COLLECTION, ID.unique(), appwritePayload);

                    safeLocalStorage.removeItem('pending_order');
                    safeLocalStorage.removeItem('pending_cart_items');
                    clearCart();

                    setOrderId(result.$id);
                    setOrderNumber(nextNumber);
                    setFullOrder({ id: result.$id, orderNumber: nextNumber, ...orderData, items: cartItems });

                    await runPostOrderActions({ id: result.$id, ...orderData, items: cartItems }, databases, DATABASE_ID, PRODUCTS_COLLECTION, PROMOS_COLLECTION, ABANDONED_COLLECTION);
                } else {
                    // Fetch existing order by ID (from URL)
                    const urlOrderId = searchParams.get('id');
                    if (urlOrderId) {
                        const doc = await databases.getDocument(DATABASE_ID, ORDERS_COLLECTION, urlOrderId);

                        let parsedItems = [];
                        try { parsedItems = JSON.parse(doc.items); } catch (e) { }

                        let parsedCustomer = {};
                        try { parsedCustomer = JSON.parse(doc.customerInfo); } catch (e) { }

                        setOrderId(urlOrderId);
                        setOrderNumber(doc.orderNumber);
                        setFullOrder({
                            id: urlOrderId,
                            ...doc,
                            items: parsedItems,
                            customer: parsedCustomer
                        });
                    }
                }
            } catch (error) {
                console.error("Error creating/fetching order:", error);
                toast.error(t('orderError'));
            } finally {
                setProcessing(false);
            }
        };

        createPendingOrder();
    }, [searchParams, clearCart, t]);

    useEffect(() => {
        if (!processing) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [processing]);

    if (processing) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="text-center space-y-4">
                    <Loader2 className="h-16 w-16 text-orange-600 animate-spin mx-auto" />
                    <p className="text-lg font-bold text-gray-900">{t('finalizingOrder')}</p>
                    <p className="text-sm text-gray-500">{t('processingPayment')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 font-sans" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="max-w-xl w-full text-center space-y-10">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-green-100 rounded-full scale-150 animate-pulse opacity-50"></div>
                    <CheckCircle className="h-28 w-28 text-green-500 relative z-10 animate-bounce" />
                </div>

                {(orderNumber || orderId) && (
                    <div className="space-y-1 font-bold">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('confNumber')}</p>
                        <h2 className="text-3xl font-black text-orange-600 tracking-tighter">
                            {orderNumber ? `#${orderNumber}` : `Order #${orderId.slice(-6).toUpperCase()}`}
                        </h2>
                    </div>
                )}

                <div className={`space-y-3 p-8 rounded-[2.5rem] border ${isAr ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('orderSuccessTitle')}</h1>
                    <p className="text-lg text-gray-600 font-bold leading-relaxed">
                        {t('orderSuccessDesc')}
                    </p>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                    <Link
                        to="/my-orders"
                        className="flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:-translate-y-1 active:scale-95 group"
                    >
                        <Package className="h-6 w-6" />
                        {t('trackOrder')}
                        <ArrowRight className={`h-5 w-5 opacity-0 group-hover:opacity-100 ${isAr ? 'rotate-180 translate-x-2' : '-translate-x-2'} group-hover:translate-x-0 transition-all`} />
                    </Link>

                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 bg-white border-2 border-gray-100 hover:border-orange-600 hover:text-orange-600 text-gray-500 px-8 py-4 rounded-2xl font-black text-lg transition-all"
                    >
                        <Home className="h-6 w-6" />
                        {t('continueShopping')}
                    </Link>

                    {fullOrder && (
                        <button
                            onClick={() => generateInvoice(fullOrder)}
                            className="sm:col-span-2 flex items-center justify-center gap-3 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border-2 border-green-100 px-8 py-4 rounded-2xl font-black text-lg transition-all group shadow-sm"
                        >
                            <Download className="h-6 w-6 group-hover:scale-110 transition-transform" />
                            {i18n.language === 'ar' ? 'تحميل الفاتورة' : 'Download Invoice (PDF)'}
                        </button>
                    )}
                </div>

                {isGuest && (
                    <div className="mt-12 bg-gradient-to-br from-orange-600 to-orange-500 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-orange-200 relative overflow-hidden text-white text-center">
                        <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-8 opacity-10`}>
                            <UserPlus className="h-32 w-32" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-2xl md:text-3xl font-black tracking-tight">{t('trackEasyTitle')}</h3>
                                <p className="text-sm md:text-base font-bold opacity-90 leading-relaxed">
                                    {t('trackEasyDesc')}
                                </p>
                            </div>

                            <div className="w-12 h-1 bg-white/30 mx-auto rounded-full"></div>

                            <Link
                                to="/signup"
                                className="inline-flex items-center justify-center gap-3 bg-white text-orange-600 px-10 py-4 rounded-2xl font-black text-lg hover:bg-orange-50 transition-all shadow-lg active:scale-95 group"
                            >
                                <UserPlus className="h-6 w-6" />
                                {t('createAccount')}
                                <ArrowRight className={`h-5 w-5 ${isAr ? 'rotate-180 translate-x-1' : '-translate-x-1'} group-hover:translate-x-0 transition-transform`} />
                            </Link>
                        </div>
                    </div>
                )}

                <div className="pt-12 border-t border-gray-100 opacity-50">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                        Zait & Filters • Genuine Spirits • Egypt
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
