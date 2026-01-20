import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, Package, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { collection, addDoc, doc, updateDoc, writeBatch, increment, runTransaction, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';

const OrderSuccess = () => {
    const [searchParams] = useSearchParams();
    const { t, i18n } = useTranslation();
    const { clearCart } = useCart();
    const [orderId, setOrderId] = useState(null);
    const [orderNumber, setOrderNumber] = useState(null);
    const [processing, setProcessing] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        setIsGuest(!auth.currentUser);
    }, []);

    useEffect(() => {
        // PART 3: Handle pending order creation for online payments
        const createPendingOrder = async () => {
            try {
                const pendingOrderData = localStorage.getItem('pending_order');
                const pendingCartItems = localStorage.getItem('pending_cart_items');

                if (pendingOrderData) {
                    const orderData = JSON.parse(pendingOrderData);
                    const cartItems = pendingCartItems ? JSON.parse(pendingCartItems) : [];

                    // Create the order in Firestore NOW with Sequential Numbering
                    const result = await runTransaction(db, async (transaction) => {
                        const counterRef = doc(db, 'settings', 'counters');
                        const counterSnap = await transaction.get(counterRef);

                        let nextNumber = 3501;
                        if (counterSnap.exists()) {
                            nextNumber = (counterSnap.data().lastOrderNumber || 3500) + 1;
                        }

                        const orderRef = doc(collection(db, 'orders'));

                        // Update payment status to Paid
                        orderData.paymentStatus = 'Paid';
                        orderData.orderNumber = nextNumber;
                        orderData.updatedAt = new Date();

                        transaction.set(orderRef, orderData);

                        // Update counter
                        transaction.set(counterRef, { lastOrderNumber: nextNumber }, { merge: true });

                        // Atomic usage increment for promo code
                        if (orderData.promoId) {
                            const promoRef = doc(db, 'promo_codes', orderData.promoId);
                            transaction.update(promoRef, {
                                usedCount: increment(1)
                            });
                        }

                        // Update product sold counts
                        cartItems.forEach(item => {
                            const productRef = doc(db, 'products', item.id);
                            transaction.update(productRef, {
                                soldCount: increment(item.quantity || 1)
                            });
                        });

                        return { id: orderRef.id, number: nextNumber };
                    });

                    // Clear localStorage and cart
                    localStorage.removeItem('pending_order');
                    localStorage.removeItem('pending_cart_items');
                    clearCart();

                    setOrderId(result.id);
                    setOrderNumber(result.number);
                } else {
                    // Fallback: check URL params for existing order ID
                    const urlOrderId = searchParams.get('id');
                    if (urlOrderId) {
                        const orderSnap = await getDoc(doc(db, 'orders', urlOrderId));
                        if (orderSnap.exists()) {
                            setOrderId(urlOrderId);
                            setOrderNumber(orderSnap.data().orderNumber);
                        }
                    }
                }
            } catch (error) {
                console.error("Error creating order:", error);
                toast.error("There was an issue finalizing your order. Please contact support.");
            } finally {
                setProcessing(false);
            }
        };

        createPendingOrder();
    }, [searchParams, clearCart]);

    useEffect(() => {
        if (!processing) {
            // Trigger celebration confetti only after order is created
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [processing]);


    if (processing) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
                <div className="text-center space-y-4">
                    <Loader2 className="h-16 w-16 text-orange-600 animate-spin mx-auto" />
                    <p className="text-lg font-bold text-gray-900">Finalizing your order...</p>
                    <p className="text-sm text-gray-500">Please wait while we process your payment</p>
                </div>
            </div>
        );
    }

    const isArabic = i18n.language === 'ar';

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 font-sans">
            <div className="max-w-xl w-full text-center space-y-10">
                {/* 1. Large Green Success Icon */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-green-100 rounded-full scale-150 animate-pulse opacity-50"></div>
                    <CheckCircle className="h-28 w-28 text-green-500 relative z-10 animate-bounce" />
                </div>

                {/* 2. Prominent Order Number */}
                {(orderNumber || orderId) && (
                    <div className="space-y-1">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Confirmation Number</p>
                        <h2 className="text-3xl font-black text-orange-600 tracking-tighter">
                            {orderNumber ? `#${orderNumber}` : `Order #${orderId.slice(-6).toUpperCase()}`}
                        </h2>
                    </div>
                )}

                {/* 3. Message (Bilingual & Static) */}
                <div className={`space-y-8 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {/* Arabic Section */}
                    <div className="space-y-3 bg-orange-50/50 p-6 rounded-3xl border border-orange-100" dir="rtl">
                        <h1 className="text-3xl font-black text-gray-900 font-arabic">تم تسجيل طلبك بنجاح!</h1>
                        <p className="text-lg text-gray-600 font-medium leading-relaxed font-arabic">
                            شكراً لثقتك في زيت اند فلترز. جاري تجهيز طلبك وهيوصلك خلال 2-5 أيام عمل.
                        </p>
                    </div>

                    {/* English Section */}
                    <div className="space-y-3 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Placed Successfully!</h1>
                        <p className="text-lg text-gray-600 font-medium leading-relaxed">
                            Thank you for shopping with Zait & Filters. Your order is being processed and will be delivered within 2-5 business days.
                        </p>
                    </div>
                </div>

                {/* 4. Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <Link
                        to="/my-orders"
                        className="flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:-translate-y-1 active:scale-95 group"
                    >
                        <Package className="h-6 w-6" />
                        Track Order
                        <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </Link>

                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 bg-white border-2 border-gray-100 hover:border-orange-600 hover:text-orange-600 text-gray-500 px-8 py-4 rounded-2xl font-black text-lg transition-all"
                    >
                        <Home className="h-6 w-6" />
                        Continue Shopping
                    </Link>
                </div>

                {/* 5. Guest Conversion CTA */}
                {isGuest && (
                    <div className="mt-12 bg-gradient-to-br from-orange-600 to-orange-500 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-orange-200 relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <UserPlus className="h-32 w-32" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-2xl md:text-3xl font-black font-arabic tracking-tight" dir="rtl">تتبع شحنتك بسهولة!</h3>
                                <p className="text-sm md:text-base font-bold font-arabic opacity-90 leading-relaxed" dir="rtl">
                                    سجل حساب دلوقتي بنفس رقم الموبايل أو الإيميل اللي طلبت بيهم، وهتلاقي الأوردر ظهر في حسابك فوراً وتقدر تتبعه.
                                </p>
                            </div>

                            <div className="w-12 h-1 bg-white/30 mx-auto rounded-full"></div>

                            <div className="space-y-4">
                                <p className="text-lg font-black tracking-tight">Track your order easily!</p>
                                <p className="text-sm font-medium opacity-90">
                                    Register now with the same phone or email to track this order in your account instantly.
                                </p>
                            </div>

                            <Link
                                to="/signup"
                                className="inline-flex items-center justify-center gap-3 bg-white text-orange-600 px-10 py-4 rounded-2xl font-black text-lg hover:bg-orange-50 transition-all shadow-lg active:scale-95 group"
                            >
                                <UserPlus className="h-6 w-6" />
                                Create My Account
                                <ArrowRight className="h-5 w-5 -translate-x-1 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Footer Note */}
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
