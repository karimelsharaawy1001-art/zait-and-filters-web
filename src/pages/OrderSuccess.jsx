import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, Package, ArrowRight, Loader2, UserPlus, Download } from 'lucide-react';
import confetti from 'canvas-confetti';
import { collection, doc, increment, runTransaction, getDoc, updateDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { generateInvoice } from '../utils/invoiceGenerator';
import { safeLocalStorage } from '../utils/safeStorage';
import axios from 'axios';

const runPostOrderActions = async (order) => {
    try {
        console.log("[POST-ORDER] Starting automated actions for order:", order.id);

        // 1. Mark abandoned cart as recovered
        const cartId = auth.currentUser ? auth.currentUser.uid : (safeLocalStorage.getItem('cartSessionId') || order.sessionId);
        if (cartId) {
            const cartRef = doc(db, 'carts', cartId);
            await updateDoc(cartRef, {
                recovered: true,
                recoveredAt: serverTimestamp(),
                orderId: order.id
            }).catch(e => console.warn("Cart recovery update failed (likely already inactive)", e));
        }

        // 2. Increment Promo Usage
        if (order.promoId) {
            try {
                const promoRef = doc(db, 'promo_codes', order.promoId);
                await updateDoc(promoRef, {
                    usedCount: increment(1)
                });
            } catch (e) { console.warn("Promo update failed", e); }
        }

        // 3. Update Product Sales
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(async (item) => {
            if (item.id && item.id !== 'unknown') {
                try {
                    const prodRef = doc(db, 'products', item.id);
                    await updateDoc(prodRef, {
                        soldCount: increment(item.quantity)
                    });
                } catch (e) {
                    // Start soldCount if missing
                    try {
                        const prodRef = doc(db, 'products', item.id);
                        await setDoc(prodRef, { soldCount: item.quantity }, { merge: true });
                    } catch (e2) { console.warn("Stock update failed", e2); }
                }
            }
        });

        // 4. Automated Sync (Mailchimp & SendGrid via API)
        try {
            const firstName = order.customer?.name?.split(' ')[0] || '';
            const lastName = order.customer?.name?.split(' ').slice(1).join(' ') || '';
            const customerEmail = order.customer?.email || order.customerEmail;

            if (customerEmail) {
                // Background firing
                axios.post('/api/products?action=subscribe', {
                    email: customerEmail,
                    firstName: firstName,
                    lastName: lastName
                }).catch(e => console.warn("Sub sync failed", e));

                axios.post('/api/send-order-email', {
                    order: {
                        id: order.id,
                        orderNumber: order.orderNumber,
                        total: order.total,
                        items: items,
                        shippingAddress: order.customer,
                        customerName: order.customer?.name || 'Customer',
                        customerEmail: customerEmail
                    }
                }).catch(e => console.warn("Email API failed", e));

                console.log("[POST-ORDER] Email sync triggered.");
            }
        } catch (e) { console.error("Email sync setup failed", e); }

    } catch (e) { console.warn("Post-order actions completely failed", e); }
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
                // Check local storage for pending order data (set by Checkout for online payments)
                const pendingOrderData = safeLocalStorage.getItem('pending_order');

                const urlOrderId = searchParams.get('id');
                const isEasyKashReturn = searchParams.get('order') || searchParams.get('reference');

                // 1. Existing Order Path (URL ID exists and isn't temp)
                if (urlOrderId && !urlOrderId.startsWith('temp_')) {
                    try {
                        const orderRef = doc(db, 'orders', urlOrderId);
                        const orderSnap = await getDoc(orderRef);

                        if (orderSnap.exists()) {
                            const existingOrder = orderSnap.data();
                            console.log("[SUCCESS] Found existing order:", urlOrderId, "Status:", existingOrder.status);

                            // Update status if coming back from payment
                            if (existingOrder.status === 'Awaiting Online Payment' || isEasyKashReturn) {
                                await updateDoc(orderRef, {
                                    paymentStatus: 'Paid',
                                    status: 'Pending'
                                });
                                console.log("[SUCCESS] Order status updated to Paid.");
                            }

                            setOrderId(urlOrderId);
                            setOrderNumber(existingOrder.orderNumber);
                            const orderForUI = { id: urlOrderId, ...existingOrder };
                            setFullOrder(orderForUI);

                            // Run post-actions
                            await runPostOrderActions(orderForUI);

                            safeLocalStorage.removeItem('pending_order');
                            safeLocalStorage.removeItem('pending_cart_items');
                            clearCart();
                            setProcessing(false);
                            return;
                        }
                    } catch (e) {
                        console.warn("[SUCCESS] Order fetch error:", e);
                    }
                }

                // 2. Fallback / Reconstruction Path
                let orderData = null;
                let cartItems = [];

                if (pendingOrderData) {
                    orderData = JSON.parse(pendingOrderData);
                    // Items are usually inside orderData.items from Checkout.jsx construction
                    cartItems = orderData.items || [];
                } else if (isEasyKashReturn) {
                    // Try to recover from abandoned cart if no local storage
                    const cartId = auth.currentUser ? auth.currentUser.uid : safeLocalStorage.getItem('cartSessionId');
                    if (cartId) {
                        const cartRef = doc(db, 'carts', cartId);
                        const cartSnap = await getDoc(cartRef);
                        if (cartSnap.exists()) {
                            const cData = cartSnap.data();
                            if (!cData.recovered) {
                                orderData = {
                                    customer: {
                                        name: cData.customerName || 'Guest',
                                        phone: cData.customerPhone || '',
                                        email: cData.email || '',
                                        address: cData.customerAddress || '',
                                        governorate: cData.customerGovernorate || '',
                                        city: cData.customerCity || ''
                                    },
                                    subtotal: cData.total || 0,
                                    total: cData.total || 0,
                                    paymentMethod: 'EasyKash / Online',
                                    paymentType: 'online',
                                    notes: 'Recovered from abandoned cart (Callback)'
                                };
                                cartItems = cData.items || [];
                            }
                        }
                    }
                }

                if (orderData) {
                    // Create New Order

                    // 1. Get Next Order Number
                    let finalOrderNumber = 3501;
                    try {
                        const settingsRef = doc(db, 'settings', 'counters');
                        await runTransaction(db, async (transaction) => {
                            const sfDoc = await transaction.get(settingsRef);
                            if (!sfDoc.exists()) {
                                transaction.set(settingsRef, { lastOrderNumber: 3500 });
                                finalOrderNumber = 3501;
                            } else {
                                const newNum = (sfDoc.data().lastOrderNumber || 3500) + 1;
                                transaction.update(settingsRef, { lastOrderNumber: newNum });
                                finalOrderNumber = newNum;
                            }
                        });
                    } catch (e) {
                        finalOrderNumber = Math.floor(Date.now() / 1000);
                    }

                    // 2. Prepare Payload
                    const firestorePayload = {
                        ...orderData,
                        items: cartItems, // Ensure items are top level
                        orderNumber: String(finalOrderNumber),
                        userId: auth.currentUser?.uid || 'guest',
                        paymentStatus: 'Paid', // Implied success
                        status: 'Pending',
                        createdAt: serverTimestamp()
                    };

                    const ordersRef = collection(db, 'orders');
                    const docRef = await addDoc(ordersRef, firestorePayload);

                    safeLocalStorage.removeItem('pending_order');
                    safeLocalStorage.removeItem('pending_cart_items');
                    clearCart();

                    setOrderId(docRef.id);
                    setOrderNumber(finalOrderNumber);
                    setFullOrder({ id: docRef.id, ...firestorePayload });

                    await runPostOrderActions({ id: docRef.id, ...firestorePayload });

                } else {
                    // Just show ID if we can't do anything else and didn't find it
                    if (urlOrderId) setOrderId(urlOrderId);
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
                            {orderNumber ? `#${orderNumber}` : `Order #${orderId?.slice(-6).toUpperCase()}`}
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
