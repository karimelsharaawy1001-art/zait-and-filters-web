import React, { useEffect, useState } from 'react';
import { Package, Clock, ChevronRight, Printer, Download, Edit2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { generateInvoice } from '../utils/invoiceGenerator';
import { useTranslation } from 'react-i18next';
import { getOptimizedImage } from '../utils/cloudinaryUtils';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '../firebase';

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMileage, setEditingMileage] = useState(null); // ID of order being edited
    const [mileageValue, setMileageValue] = useState('');
    const [updating, setUpdating] = useState(false);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            console.log('[OrderHistory] User logged in:', user);
            fetchOrders();
        } else {
            console.log('[OrderHistory] No user logged in');
            setLoading(false);
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            console.log('[OrderHistory] Fetching orders for user:', user.email);

            // Firestore Query: Match userId OR email (Client side filtering for email if needed, or composite query)
            // Ideally, we just query by userId for logged in users.
            // But legacy orders might only have email.
            // Let's try userId first, then fallback or parallel query?
            // "or" queries in Firestore are supported in newer SDKs but limited.
            // Let's just query by userId as primary.

            const ordersRef = collection(db, 'orders');
            // Strategy: Get by userId.
            // Also get by email if available.
            // Merge results.

            const constraints = [
                where('userId', '==', user.uid)
            ];

            const q = query(ordersRef, ...constraints, orderBy('createdAt', 'desc'), limit(50));
            const querySnapshot = await getDocs(q);

            let ordersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Also check for email matches if we didn't find much, or just always check?
            // If user has email, check for orders with that email (guest checkouts linked to account email)
            if (user.email) {
                const emailQuery = query(ordersRef, where('email', '==', user.email), orderBy('createdAt', 'desc'), limit(50));
                const emailSnapshot = await getDocs(emailQuery);
                const emailOrders = emailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Merge and deduplicate
                const combined = [...ordersList, ...emailOrders];
                const unique = new Map();
                combined.forEach(o => unique.set(o.id, o));
                ordersList = Array.from(unique.values()).sort((a, b) => {
                    const da = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt);
                    const db = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt);
                    return db - da;
                });
            }

            // Parse items if they are JSON strings (Legacy)
            ordersList = ordersList.map(doc => {
                let parsedItems = [];
                if (typeof doc.items === 'string') {
                    try { parsedItems = JSON.parse(doc.items); } catch (e) { }
                } else if (Array.isArray(doc.items)) {
                    parsedItems = doc.items;
                }

                return {
                    ...doc,
                    items: parsedItems
                };
            });

            console.log('[OrderHistory] Processed orders:', ordersList);
            setOrders(ordersList);
        } catch (error) {
            console.error("[OrderHistory] Error fetching orders:", error);
            toast.error(isAr ? 'فشل تحميل الطلبات' : 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusI18n = (status) => {
        const statuses = {
            'Pending': t('statusPending'),
            'Processing': t('statusProcessing'),
            'Shipped': t('statusShipped'),
            'Delivered': t('statusDelivered'),
            'Completed': t('statusCompleted'),
            'Cancelled': t('statusCancelled'),
            'Awaiting Payment Verification': t('statusAwaitingPaymentVerification')
        };
        return statuses[status] || status;
    };

    const getPaymentStatusI18n = (status) => {
        const statuses = {
            'Paid': t('paymentPaid'),
            'Pending': t('paymentPending'),
            'Failed': t('paymentFailed'),
            'Refunded': t('paymentRefunded'),
            'Awaiting Verification': t('paymentAwaitingVerification')
        };
        const result = statuses[status] || t('paymentUnpaid');
        return result;
    };

    const handleUpdateMileage = async (orderId) => {
        setUpdating(true);
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                currentMileage: mileageValue
            });

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, currentMileage: mileageValue } : o));
            setEditingMileage(null);
            toast.success(isAr ? 'تم تحديث العداد بنجاح!' : 'Mileage updated successfully!');
        } catch (error) {
            console.error("Error updating mileage:", error);
            toast.error(isAr ? 'فشل تحديث العداد' : 'Failed to update mileage');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={`max-w-4xl mx-auto px-4 py-16 text-center ${isAr ? 'rtl' : 'ltr'}`}>
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('loginToSeeOrders')}</h2>
                <p className="text-gray-600 mb-8">{t('needLoginDesc')}</p>
                <Link to="/login" className="inline-block bg-orange-600 text-white font-bold py-3 px-8 rounded-lg">
                    {t('loginNow')}
                </Link>
            </div>
        );
    }

    return (
        <div className={`max-w-5xl mx-auto px-4 py-8 ${isAr ? 'rtl text-right' : 'ltr text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
            <div className={`flex items-center mb-8 ${isAr ? 'flex-row-reverse' : ''}`}>
                <Package className={`h-8 w-8 text-orange-600 ${isAr ? 'ml-3' : 'mr-3'}`} />
                <h1 className="text-3xl font-black text-gray-900">{t('myOrders')}</h1>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-lg mb-6">{t('noOrdersYet')}</p>
                    <Link to="/" className="text-orange-600 font-bold hover:underline">
                        {t('startShopping')}
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-orange-200 transition-colors">
                            <div className={`bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 ${isAr ? 'flex-row-reverse text-right' : ''}`}>
                                <div className={`flex gap-6 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('orderNum')}</p>
                                        <p className="text-sm font-black text-gray-900">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('date')}</p>
                                        <p className="text-sm font-bold text-gray-700">
                                            {(order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt)).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('totalLabel')}</p>
                                        <p className="text-sm font-black text-orange-600">{order.total} {t('currency')}</p>
                                    </div>
                                    {editingMileage === order.id ? (
                                        <div className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg p-1">
                                            <input
                                                type="number"
                                                value={mileageValue}
                                                onChange={(e) => setMileageValue(e.target.value)}
                                                placeholder={t('km')}
                                                className="w-20 px-2 py-1 text-xs font-bold border-none focus:ring-0"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleUpdateMileage(order.id)}
                                                disabled={updating}
                                                className="text-green-600 hover:text-green-700"
                                            >
                                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => setEditingMileage(null)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className="bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg flex items-center gap-1.5 h-fit font-bold cursor-pointer hover:bg-orange-100 transition-colors group"
                                            onClick={() => {
                                                setEditingMileage(order.id);
                                                setMileageValue(order.currentMileage || '');
                                            }}
                                        >
                                            <Edit2 className="w-3 h-3 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <p className="text-[10px] font-black text-orange-700 uppercase tracking-tight">
                                                {t('mileageRecord')}: {order.currentMileage || '---'} {t('km')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter
                                        ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 font-bold' : ''}
                                        ${order.paymentStatus === 'Pending' ? 'bg-gray-100 text-gray-700 font-bold' : ''}
                                        ${order.paymentStatus === 'Failed' ? 'bg-red-100 text-red-700 font-bold' : ''}
                                        ${order.paymentStatus === 'Refunded' ? 'bg-orange-100 text-orange-700 font-bold' : ''}
                                        ${order.paymentStatus === 'Awaiting Verification' ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                                        ${!['Paid', 'Pending', 'Failed', 'Refunded', 'Awaiting Verification'].includes(order.paymentStatus) ? 'bg-gray-100 text-gray-700 font-bold' : ''}
                                    `}>
                                        {getPaymentStatusI18n(order.paymentStatus)}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-tighter
                                        ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 font-bold' : ''}
                                        ${order.status === 'Processing' ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                                        ${order.status === 'Shipped' ? 'bg-purple-100 text-purple-700 font-bold' : ''}
                                        ${order.status === 'Delivered' ? 'bg-green-100 text-green-700 font-bold' : ''}
                                        ${order.status === 'Completed' ? 'bg-green-600 text-white font-bold' : ''}
                                        ${order.status === 'Cancelled' ? 'bg-red-100 text-red-700 font-bold' : ''}
                                        ${order.status === 'Awaiting Payment Verification' ? 'bg-blue-600 text-white font-bold' : ''}
                                        ${!['Pending', 'Processing', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Awaiting Payment Verification'].includes(order.status) ? 'bg-gray-100 text-gray-700 font-bold' : ''}
                                    `}>
                                        {getStatusI18n(order.status)}
                                    </span>

                                    <button
                                        onClick={() => window.open(`/print-invoice/${order.id}`, '_blank')}
                                        className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors px-2 border-r border-gray-100"
                                        title={isAr ? "طباعة الفاتورة" : "Print Invoice"}
                                    >
                                        <Printer className="w-4 h-4 stroke-[3px]" />
                                        <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{isAr ? "طباعة" : "Print"}</span>
                                    </button>

                                    <button
                                        onClick={() => generateInvoice(order)}
                                        className="flex items-center gap-2 text-[#28B463] hover:text-green-700 transition-colors px-2"
                                        title={isAr ? "تحميل الفاتورة" : "Download Invoice"}
                                    >
                                        <Download className="w-4 h-4 stroke-[3px]" />
                                        <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{isAr ? "تحميل" : "Download"}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="divide-y divide-gray-50">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className={`py-4 first:pt-0 last:pb-0 flex items-center gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                                            <img
                                                src={getOptimizedImage(item.image, 'f_auto,q_auto,w_200')}
                                                alt={`${isAr ? item.name : (item.nameEn || item.name)} - ${isAr ? (item.brand || item.partBrand || '') : (item.brandEn || item.brand || item.partBrand || '')}`}
                                                className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                                            />
                                            <div className={`flex-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                                <h4 className="text-sm font-bold text-gray-900 mb-1">
                                                    {isAr ? item.name : (item.nameEn || item.name)}
                                                </h4>
                                                <div className={`flex flex-wrap gap-x-4 gap-y-1 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                    <p className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                                        <span className="font-bold text-gray-400">{t('carLabel')}:</span> {item.make} {item.model}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                                        <span className="font-bold text-gray-400">{t('brand')}:</span> {isAr ? (item.brand || item.partBrand) : (item.brandEn || item.brand || item.partBrand)}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                                        <span className="font-bold text-gray-400">{t('originLabel')}:</span> {item.countryOfOrigin || item.origin}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={isAr ? 'text-left' : 'text-right'}>
                                                <p className="text-sm font-black text-gray-900">{item.price} {t('currency')}</p>
                                                <p className="text-xs text-gray-400 font-bold">{t('quantityLabel')}: {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}

                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                    <div className={`flex justify-between items-center text-xs font-medium text-gray-500 ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <span>{t('subtotal')}</span>
                                        <span>{order.subtotal} {t('currency')}</span>
                                    </div>
                                    {(order.discount > 0 || order.manualDiscount > 0) && (
                                        <div className={`flex justify-between items-center text-xs font-medium text-green-600 ${isAr ? 'flex-row-reverse' : ''}`}>
                                            <span>{t('discount')}</span>
                                            <span>-{order.discount || order.manualDiscount} {t('currency')}</span>
                                        </div>
                                    )}
                                    <div className={`flex justify-between items-center text-xs font-medium text-gray-500 ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <span>{t('shipping')}</span>
                                        <span>{order.shippingCost || 0} {t('currency')}</span>
                                    </div>
                                    <div className={`flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-200 ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <span>{t('total')}</span>
                                        <span>{order.total} {t('currency')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }
        </div >
    );
};

export default OrderHistory;
