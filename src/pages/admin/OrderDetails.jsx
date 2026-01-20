import React, { useState, useEffect } from 'react';
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    increment,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Package, User, MapPin, CreditCard, Clock, Edit2, CheckCircle } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        paymentStatus: '',
        paymentMethod: '',
        status: ''
    });

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const docRef = doc(db, 'orders', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setOrder({ id: docSnap.id, ...docSnap.data() });
                } else {
                    toast.error('Order not found');
                    navigate('/admin/orders');
                }
            } catch (error) {
                console.error("Error fetching order:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id, navigate]);

    const handleStatusChange = async (newStatus) => {
        setUpdating(true);
        try {
            const orderRef = doc(db, 'orders', id);
            const statusUpdate = { status: newStatus };

            // Phase 3: Add deliveryDate if status is 'Delivered'
            if (newStatus === 'Delivered') {
                statusUpdate.deliveryDate = serverTimestamp();
            }

            // Update order status in Firestore
            await updateDoc(orderRef, statusUpdate);

            // Phase 3: Commission calculation & Voiding logic
            if (order.affiliateCode) {
                const batch = writeBatch(db);
                const affQuery = query(collection(db, 'affiliates'), where('referralCode', '==', order.affiliateCode));
                const affSnap = await getDocs(affQuery);

                if (!affSnap.empty) {
                    const affDoc = affSnap.docs[0];
                    const affData = affDoc.data();
                    const affId = affDoc.id;

                    // 1. Logic for STARTING commission cooling (Delivered)
                    if (newStatus === 'Delivered' && order.status !== 'Delivered') {
                        const newReferralCount = (affData.referralCount || 0) + 1;
                        let newTier = 1;
                        let newCommissionPerc = 5;

                        if (newReferralCount >= 30) {
                            newTier = 3;
                            newCommissionPerc = 10;
                        } else if (newReferralCount >= 10) {
                            newTier = 2;
                            newCommissionPerc = 7;
                        }

                        const newCommissionRate = newCommissionPerc / 100;
                        const baseAmount = order.subtotal || order.total;
                        const commissionAmount = Math.round(baseAmount * newCommissionRate);

                        batch.update(doc(db, 'affiliates', affId), {
                            referralCount: increment(1),
                            totalEarnings: increment(commissionAmount),
                            pendingBalance: increment(commissionAmount),
                            currentTier: newTier,
                            commissionPercentage: newCommissionPerc,
                            commissionRate: newCommissionRate
                        });

                        const txRef = doc(collection(db, `affiliates/${affId}/transactions`));
                        batch.set(txRef, {
                            orderId: id,
                            amount: baseAmount,
                            commission: commissionAmount,
                            commissionRate: newCommissionRate,
                            tier: newTier,
                            createdAt: serverTimestamp(),
                            status: 'confirmed'
                        });

                        await batch.commit();
                    }
                    // 2. Logic for VOIDING commission (Returned/Cancelled)
                    else if ((newStatus === 'Returned' || newStatus === 'Cancelled') && order.status === 'Delivered') {
                        // Find the transaction tied to this order
                        const txQuery = query(collection(db, `affiliates/${affId}/transactions`), where('orderId', '==', id));
                        const txSnap = await getDocs(txQuery);

                        if (!txSnap.empty) {
                            const txDoc = txSnap.docs[0];
                            const txData = txDoc.data();

                            if (txData.status !== 'void') {
                                batch.update(doc(db, 'affiliates', affId), {
                                    totalEarnings: increment(-txData.commission),
                                    pendingBalance: increment(-txData.commission),
                                    referralCount: increment(-1)
                                });

                                batch.update(doc(db, `affiliates/${affId}/transactions`, txDoc.id), {
                                    status: 'void',
                                    voidedAt: serverTimestamp()
                                });

                                await batch.commit();
                            }
                        }
                    }
                }
            }

            setOrder(prev => ({ ...prev, status: newStatus }));
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const handleEditOrder = () => {
        setEditForm({
            paymentStatus: order.paymentStatus || 'Pending',
            paymentMethod: order.paymentMethod || 'Cash on Delivery',
            status: order.status || 'Pending'
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        setUpdating(true);
        try {
            const orderRef = doc(db, 'orders', id);
            await updateDoc(orderRef, {
                paymentStatus: editForm.paymentStatus,
                paymentMethod: editForm.paymentMethod,
                status: editForm.status
            });

            setOrder(prev => ({
                ...prev,
                paymentStatus: editForm.paymentStatus,
                paymentMethod: editForm.paymentMethod,
                status: editForm.status
            }));

            setShowEditModal(false);
            toast.success('Order updated successfully!');
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Failed to update order");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    const { customer, items, total, status, createdAt, paymentMethod } = order;

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminHeader title={`Order Details #${order.orderNumber || id.slice(-6)}`} />

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Orders
                    </button>
                    <button
                        onClick={handleEditOrder}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                    >
                        <Edit2 className="h-4 w-4" />
                        Edit Order
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Items & Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Guard */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">Ordered on</p>
                                        <p className="font-medium text-gray-900">
                                            {createdAt?.seconds ? new Date(createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Current Status</label>
                                    <select
                                        value={status}
                                        disabled={updating}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm p-2 font-bold
                                            ${status === 'Pending' ? 'text-yellow-600 bg-yellow-50' : ''}
                                            ${status === 'Processing' ? 'text-blue-600 bg-blue-50' : ''}
                                            ${status === 'Shipped' ? 'text-purple-600 bg-purple-50' : ''}
                                            ${status === 'Delivered' ? 'text-green-600 bg-green-50' : ''}
                                            ${status === 'Cancelled' ? 'text-red-600 bg-red-50' : ''}
                                        `}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center bg-gray-50">
                                <Package className="h-5 w-5 text-gray-400 mr-2" />
                                <h3 className="font-bold text-gray-900">Items Purchased</h3>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-6 flex items-start">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-20 h-20 object-cover rounded-lg border shadow-sm"
                                        />
                                        <div className="ml-6 flex-1">
                                            <h4 className="text-lg font-black text-gray-900 mb-1">{item.name}</h4>

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Part Brand</p>
                                                    <p className="text-sm font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded inline-block">{item.partBrand || item.brand}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Country of Origin</p>
                                                    <p className="text-sm font-bold text-gray-800 bg-blue-50 px-2 py-0.5 rounded inline-block border border-blue-100">{item.countryOfOrigin || item.origin || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Car Compatibility</p>
                                                    <p className="text-sm font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded inline-block border border-orange-100">
                                                        {item.make} {item.model} {item.yearRange ? `(${item.yearRange})` : ''}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sub-category</p>
                                                    <p className="text-sm font-bold text-gray-800">{item.subcategory || item.subCategory || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-center h-full">
                                            <p className="text-lg font-black text-gray-900">{item.price} EGP</p>
                                            <p className="text-sm text-gray-500 font-bold uppercase tracking-tighter bg-gray-100 px-2 py-1 rounded mt-1">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-2">
                                <div className="flex justify-between items-center text-sm text-gray-600 font-bold">
                                    <span>Subtotal</span>
                                    <span>{order.subtotal || (total - (order.shipping_cost || 0))} EGP</span>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-green-600 font-bold">
                                        <span>Discount ({order.promoCode || 'Applied'})</span>
                                        <span>-{order.discount} EGP</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm text-orange-600 font-bold">
                                    <span>Shipping Cost</span>
                                    <span>+{order.shipping_cost || 0} EGP</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                                    <span className="text-xl font-black text-orange-600">{total} <span className="text-sm font-normal text-gray-500">EGP</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Customer Info */}
                    <div className="space-y-6">
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center mb-4 text-gray-900 font-bold border-b pb-2">
                                <User className="h-5 w-5 text-gray-400 mr-2" />
                                <h3>Customer Info</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 font-semibold uppercase">Name</p>
                                    <p className="text-sm font-medium">{customer.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-semibold uppercase">Phone</p>
                                    <p className="text-sm font-medium">{customer.phone}</p>
                                </div>
                                {order.currentMileage && (
                                    <div className="pt-2 border-t border-gray-50">
                                        <p className="text-xs text-gray-500 font-semibold uppercase">Current Mileage</p>
                                        <p className="text-sm font-black text-orange-600">{order.currentMileage} KM</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center mb-4 text-gray-900 font-bold border-b pb-2">
                                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                                <h3>Shipping Address</h3>
                            </div>
                            <div className="space-y-2">
                                {customer.governorate && (
                                    <p className="text-sm font-black text-gray-900 bg-orange-50 px-3 py-1 rounded-lg inline-block border border-orange-100">
                                        {customer.governorate} {customer.city ? `- ${customer.city}` : ''}
                                    </p>
                                )}
                                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                    {customer.address}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center mb-4 text-gray-900 font-bold border-b pb-2">
                                <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                                <h3>Payment Method</h3>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{paymentMethod}</span>
                                <span className="px-2 py-1 text-[10px] font-bold bg-green-100 text-green-800 rounded uppercase tracking-wider">Confirmed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Order Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl relative w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-orange-600 p-8 text-white">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Edit Order</h3>
                            <p className="text-orange-200 text-sm font-bold mt-1">Order #{order.orderNumber || order.id.slice(-6)}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Payment Status */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Payment Status</label>
                                <select
                                    value={editForm.paymentStatus}
                                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Failed">Failed</option>
                                    <option value="Refunded">Refunded</option>
                                </select>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Payment Method</label>
                                <select
                                    value={editForm.paymentMethod}
                                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold"
                                >
                                    <option value="Cash on Delivery">Cash on Delivery</option>
                                    <option value="Credit Card (EasyKash)">Credit Card (EasyKash)</option>
                                    <option value="InstaPay">InstaPay</option>
                                    <option value="Wallet">Wallet</option>
                                </select>
                            </div>

                            {/* Delivery Status */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="Returned">Returned</option>
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-4">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={updating}
                                    className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                >
                                    {updating ? "Saving..." : "Save Changes"}
                                    {!updating && <CheckCircle className="h-5 w-5" />}
                                </button>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="w-full bg-white text-gray-500 font-bold py-3 text-xs uppercase tracking-widest hover:text-gray-900 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderDetails;
