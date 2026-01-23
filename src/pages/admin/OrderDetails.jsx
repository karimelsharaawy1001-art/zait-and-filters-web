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
            <div className="min-h-screen bg-admin-bg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-admin-accent" />
            </div>
        );
    }

    const { customer, items, total, status, createdAt, paymentMethod } = order;

    return (
        <div className="min-h-screen bg-admin-bg font-sans">
            <AdminHeader title={`Order Details #${order.orderNumber || id.slice(-6).toUpperCase()}`} />

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="flex items-center text-gray-500 hover:text-white font-bold transition-colors uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Orders
                    </button>
                    <button
                        onClick={handleEditOrder}
                        className="bg-admin-red hover:bg-admin-red-dark text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-admin-red/40 hover:scale-105 flex items-center gap-2"
                    >
                        <Edit2 className="h-4 w-4" />
                        Edit Order
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Items & Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Guard */}
                        <div className="bg-admin-card shadow-admin rounded-3xl p-8 border border-admin-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-[#ffffff05] p-3 rounded-2xl border border-admin-border">
                                        <Clock className="h-6 w-6 text-admin-accent" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ordered on</p>
                                        <p className="font-bold text-white poppins">
                                            {createdAt?.seconds ? new Date(createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Current Status</label>
                                    <select
                                        value={status}
                                        disabled={updating}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className={`block w-full rounded-xl border border-admin-border shadow-lg focus:ring-2 focus:ring-admin-accent outline-none sm:text-sm p-3 font-black uppercase tracking-widest cursor-pointer transition-all
                                            ${status === 'Pending' ? 'text-admin-yellow bg-admin-yellow/10' : ''}
                                            ${status === 'Processing' ? 'text-admin-accent bg-admin-accent/10' : ''}
                                            ${status === 'Shipped' ? 'text-purple-400 bg-purple-400/10' : ''}
                                            ${status === 'Delivered' ? 'text-admin-green bg-admin-green/10' : ''}
                                            ${status === 'Cancelled' ? 'text-admin-red bg-admin-red/10' : ''}
                                        `}
                                    >
                                        <option value="Pending" className="bg-admin-card">Pending</option>
                                        <option value="Processing" className="bg-admin-card">Processing</option>
                                        <option value="Shipped" className="bg-admin-card">Shipped</option>
                                        <option value="Delivered" className="bg-admin-card">Delivered</option>
                                        <option value="Cancelled" className="bg-admin-card">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="bg-admin-card shadow-admin rounded-3xl overflow-hidden border border-admin-border">
                            <div className="px-8 py-5 border-b border-[#ffffff0d] flex items-center bg-[#ffffff02]">
                                <Package className="h-5 w-5 text-admin-accent mr-3" />
                                <h3 className="font-black text-white uppercase tracking-widest text-sm poppins">Items Purchased</h3>
                            </div>
                            <div className="divide-y divide-[#ffffff0d]">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-8 flex items-start gap-6 hover:bg-[#ffffff01] transition-colors">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-24 h-24 object-cover rounded-2xl border border-admin-border shadow-lg"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/placeholder.png';
                                            }}
                                        />
                                        <div className="flex-1">
                                            <h4 className="text-lg font-black text-white mb-2 poppins">{item.name}</h4>

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Part Brand</p>
                                                    <p className="text-xs font-black text-gray-300 bg-[#ffffff05] px-3 py-1 rounded-lg border border-admin-border inline-block">{item.partBrand || item.brand}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Origin</p>
                                                    <p className="text-xs font-black text-admin-accent bg-admin-accent/5 px-3 py-1 rounded-lg border border-admin-accent/10 inline-block">{item.countryOfOrigin || item.origin || 'N/A'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Compatibility</p>
                                                    <p className="text-xs font-black text-admin-yellow bg-admin-yellow/5 px-3 py-1 rounded-lg border border-admin-yellow/10 inline-block">
                                                        {item.make} {item.model} {item.yearRange ? `(${item.yearRange})` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-center gap-2">
                                            <p className="text-xl font-black text-white poppins">{item.price} <span className="text-[10px] text-gray-500">EGP</span></p>
                                            <p className="text-[10px] font-black text-admin-text-secondary uppercase tracking-widest bg-[#ffffff05] px-3 py-1 rounded-lg border border-admin-border">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-8 py-6 bg-[#ffffff02] border-t border-[#ffffff0d] space-y-3">
                                <div className="flex justify-between items-center text-[10px] text-admin-text-secondary font-black uppercase tracking-widest">
                                    <span>Subtotal</span>
                                    <span className="text-gray-300">{order.subtotal || (total - (order.shipping_cost || 0))} EGP</span>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-admin-green font-black uppercase tracking-widest">
                                        <span>Discount ({order.promoCode || 'Applied'})</span>
                                        <span>-{order.discount} EGP</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-[10px] text-admin-accent font-black uppercase tracking-widest">
                                    <span>Shipping Cost</span>
                                    <span>+{order.shipping_cost || 0} EGP</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-[#ffffff0d]">
                                    <span className="text-sm font-black text-white uppercase tracking-widest poppins">Total Amount</span>
                                    <span className="text-2xl font-black text-admin-accent poppins">{total} <span className="text-[10px] font-normal text-gray-500">EGP</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Customer Info */}
                    <div className="space-y-6">
                        <div className="bg-admin-card shadow-admin rounded-3xl p-8 border border-admin-border">
                            <div className="flex items-center mb-6 text-white font-black uppercase tracking-widest text-sm poppins border-b border-[#ffffff0d] pb-4">
                                <User className="h-5 w-5 text-admin-accent mr-3" />
                                <h3>Customer Info</h3>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Name</p>
                                    <p className="font-bold text-white text-lg">{customer.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Phone</p>
                                    <p className="font-bold text-admin-accent text-lg">{customer.phone}</p>
                                </div>
                                {order.currentMileage && (
                                    <div className="pt-4 border-t border-[#ffffff0d]">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Current Mileage</p>
                                        <p className="text-lg font-black text-admin-yellow">{order.currentMileage} <span className="text-[10px] font-normal text-gray-500">KM</span></p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-admin-card shadow-admin rounded-3xl p-8 border border-admin-border">
                            <div className="flex items-center mb-6 text-white font-black uppercase tracking-widest text-sm poppins border-b border-[#ffffff0d] pb-4">
                                <MapPin className="h-5 w-5 text-admin-accent mr-3" />
                                <h3>Shipping Address</h3>
                            </div>
                            <div className="space-y-4">
                                {customer.governorate && (
                                    <p className="text-[10px] font-black text-admin-yellow bg-admin-yellow/5 px-3 py-1 rounded-lg border border-admin-yellow/10 inline-block uppercase tracking-widest">
                                        {customer.governorate} {customer.city ? `- ${customer.city}` : ''}
                                    </p>
                                )}
                                <p className="text-sm text-admin-text-secondary leading-relaxed font-bold">
                                    {customer.address}
                                </p>
                            </div>
                        </div>

                        <div className="bg-admin-card shadow-admin rounded-3xl p-8 border border-admin-border">
                            <div className="flex items-center mb-6 text-white font-black uppercase tracking-widest text-sm poppins border-b border-[#ffffff0d] pb-4">
                                <CreditCard className="h-5 w-5 text-admin-accent mr-3" />
                                <h3>Payment Info</h3>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white uppercase tracking-widest">{paymentMethod}</span>
                                <span className="px-3 py-1 text-[10px] font-black bg-admin-green/10 text-admin-green rounded-lg border border-admin-green/10 uppercase tracking-widest">Confirmed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Order Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#00000099] backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="bg-admin-card rounded-3xl shadow-2xl relative w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-admin-border">
                        <div className="bg-admin-red hover:bg-admin-red-dark p-8 text-white">
                            <h3 className="text-xl font-black uppercase tracking-widest poppins">Edit Order</h3>
                            <p className="text-white/70 text-[10px] font-black mt-1 uppercase tracking-widest">Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Payment Status */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Payment Status</label>
                                <select
                                    value={editForm.paymentStatus}
                                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg cursor-pointer"
                                >
                                    <option value="Pending" className="bg-admin-card">Pending</option>
                                    <option value="Paid" className="bg-admin-card">Paid</option>
                                    <option value="Failed" className="bg-admin-card">Failed</option>
                                    <option value="Refunded" className="bg-admin-card">Refunded</option>
                                </select>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Payment Method</label>
                                <select
                                    value={editForm.paymentMethod}
                                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg cursor-pointer"
                                >
                                    <option value="Cash on Delivery" className="bg-admin-card">Cash on Delivery</option>
                                    <option value="Credit Card (EasyKash)" className="bg-admin-card">Credit Card (EasyKash)</option>
                                    <option value="InstaPay" className="bg-admin-card">InstaPay</option>
                                    <option value="Wallet" className="bg-admin-card">Wallet</option>
                                </select>
                            </div>

                            {/* Delivery Status */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Delivery Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg cursor-pointer"
                                >
                                    <option value="Pending" className="bg-admin-card">Pending</option>
                                    <option value="Processing" className="bg-admin-card">Processing</option>
                                    <option value="Shipped" className="bg-admin-card">Shipped</option>
                                    <option value="Delivered" className="bg-admin-card">Delivered</option>
                                    <option value="Cancelled" className="bg-admin-card">Cancelled</option>
                                    <option value="Returned" className="bg-admin-card">Returned</option>
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-4">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={updating}
                                    className="w-full bg-admin-red hover:bg-admin-red-dark text-white font-black py-4 rounded-xl shadow-lg shadow-admin-red/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                                >
                                    {updating ? "Saving..." : "Save Changes"}
                                    {!updating && <CheckCircle className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="w-full text-gray-500 font-black py-3 text-[10px] uppercase tracking-widest hover:text-white transition-all"
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
