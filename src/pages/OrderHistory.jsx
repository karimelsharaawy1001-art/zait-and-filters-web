import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Package, Clock, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchOrders(currentUser.uid);
            } else {
                setLoading(false);
                // Optionally redirect to login
                // navigate('/login');
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchOrders = async (userId) => {
        try {
            const q = query(
                collection(db, 'orders'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders:", error);
            // Fallback for missing index
            if (error.code === 'failed-precondition') {
                const q = query(
                    collection(db, 'orders'),
                    where('userId', '==', userId)
                );
                const querySnapshot = await getDocs(q);
                const ordersList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => b.createdAt - a.createdAt);
                setOrders(ordersList);
            }
        } finally {
            setLoading(false);
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
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Login to see your orders</h2>
                <p className="text-gray-600 mb-8">You need to be logged in to view your order history.</p>
                <Link to="/login" className="inline-block bg-orange-600 text-white font-bold py-3 px-8 rounded-lg">
                    Login Now
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center mb-8">
                <Package className="h-8 w-8 text-orange-600 mr-3" />
                <h1 className="text-3xl font-black text-gray-900">My Orders</h1>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-lg mb-6">You haven't placed any orders yet.</p>
                    <Link to="/" className="text-orange-600 font-bold hover:underline">
                        Start Shopping →
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-orange-200 transition-colors">
                            <div className="bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-gray-100">
                                <div className="flex gap-6">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Order #</p>
                                        <p className="text-sm font-black text-gray-900">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                                        <p className="text-sm font-bold text-gray-700">
                                            {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total</p>
                                        <p className="text-sm font-black text-orange-600">{order.total} EGP</p>
                                    </div>
                                    {order.currentMileage && (
                                        <div className="bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg flex items-center gap-1.5">
                                            <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <p className="text-[10px] font-black text-orange-700 uppercase tracking-tight">
                                                قراءة العداد: {order.currentMileage} كم
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter
                                        ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : ''}
                                        ${order.paymentStatus === 'Pending' ? 'bg-gray-100 text-gray-700' : ''}
                                        ${order.paymentStatus === 'Failed' ? 'bg-red-100 text-red-700' : ''}
                                        ${order.paymentStatus === 'Refunded' ? 'bg-orange-100 text-orange-700' : ''}
                                    `}>
                                        {i18n.language === 'ar' ? (
                                            order.paymentStatus === 'Paid' ? 'تم الدفع' :
                                                order.paymentStatus === 'Pending' ? 'لم يتم الدفع' :
                                                    order.paymentStatus === 'Failed' ? 'فشل الدفع' :
                                                        order.paymentStatus === 'Refunded' ? 'مسترجع' : 'غير مدفوع'
                                        ) : order.paymentStatus || 'Unpaid'}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-tighter
                                        ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                                        ${order.status === 'Processing' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${order.status === 'Shipped' ? 'bg-purple-100 text-purple-700' : ''}
                                        ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : ''}
                                        ${order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : ''}
                                    `}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="divide-y divide-gray-50">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                                            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-gray-900 mb-1">{item.name}</h4>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                    <p className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                                        <span className="font-bold text-gray-400">Car:</span> {item.make} {item.model} ({item.yearRange})
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                                        <span className="font-bold text-gray-400">Brand:</span> {item.partBrand || item.brand}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                                        <span className="font-bold text-gray-400">Origin:</span> {item.countryOfOrigin || item.origin}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-gray-900">{item.price} EGP</p>
                                                <p className="text-xs text-gray-400 font-bold">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
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
