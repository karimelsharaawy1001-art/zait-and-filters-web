import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy, where, getDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { Eye, DollarSign, Edit2, CheckCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingOrder, setEditingOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const fetchOrders = async () => {
        try {
            const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders: ", error);
            if (error.code === 'failed-precondition') {
                const querySnapshot = await getDocs(collection(db, 'orders'));
                const ordersList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setOrders(ordersList);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // PART 1: Quick Status Dropdown with Optimistic UI
    const handleStatusChange = async (orderId, newStatus) => {
        // Optimistic update
        const previousOrders = [...orders];
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            )
        );

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { status: newStatus });

            // AFFILIATE COMMISSION LOGIC
            // Only trigger if status became "Delivered" and order has an affiliate code
            const targetOrder = orders.find(o => o.id === orderId);
            if (newStatus === 'Delivered' && targetOrder && targetOrder.affiliateCode) {
                // 1. Find Affiliate by Code
                const affiliatesRef = collection(db, 'affiliates');
                const q = query(affiliatesRef, where('referralCode', '==', targetOrder.affiliateCode));
                const affSnap = await getDocs(q);

                if (!affSnap.empty) {
                    const affiliateDoc = affSnap.docs[0];
                    const affiliateData = affiliateDoc.data();
                    const affId = affiliateDoc.id;

                    // 2. Check if commission already exists for this order to avoid duplicates (idempotency)
                    const transRef = collection(db, `affiliates/${affId}/transactions`);
                    const checkTrans = query(transRef, where('orderId', '==', orderId));
                    const transSnap = await getDocs(checkTrans);

                    if (transSnap.empty) {
                        // 3. Calculate Commission
                        const rate = affiliateData.commissionPercentage || 5;
                        const commAmount = Math.floor((targetOrder.subtotal || 0) * (rate / 100));

                        // 4. Record Transaction
                        if (commAmount > 0) {
                            await addDoc(collection(db, `affiliates/${affId}/transactions`), {
                                type: 'commission',
                                amount: targetOrder.subtotal || 0,
                                commission: commAmount,
                                orderId: orderId,
                                orderNumber: targetOrder.orderNumber || 'N/A',
                                status: 'Pending', // Becomes withdrawable after 14 days logic in Dashboard
                                createdAt: new Date() // Use client date or serverTimestamp
                            });

                            // 5. Update Affiliate Aggregate Stats
                            await updateDoc(doc(db, 'affiliates', affId), {
                                totalEarnings: (affiliateData.totalEarnings || 0) + commAmount,
                                referralCount: (affiliateData.referralCount || 0) + 1
                            });

                            toast.success(`Commission of EGP ${commAmount} recorded for ${targetOrder.affiliateCode}`);
                        }
                    }
                }
            }

            toast.success("Status updated successfully!");
        } catch (error) {
            console.error("Error updating status: ", error);
            // Rollback on error
            setOrders(previousOrders);
            toast.error("Failed to update status");
        }
    };

    // PART 2: Mark Paid with Optimistic UI
    const handleMarkPaid = async (orderId) => {
        const previousOrders = [...orders];
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId ? { ...order, paymentStatus: 'Paid' } : order
            )
        );

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { paymentStatus: 'Paid' });
            toast.success("Order marked as paid!");
        } catch (error) {
            console.error("Error marking as paid: ", error);
            setOrders(previousOrders);
            toast.error("Failed to mark as paid");
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/admin/login');
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': 'bg-orange-50 text-orange-600 border-orange-100',
            'Processing': 'bg-blue-50 text-blue-600 border-blue-100',
            'Shipped': 'bg-purple-50 text-purple-600 border-purple-100',
            'Delivered': 'bg-green-50 text-green-600 border-green-100',
            'Cancelled': 'bg-red-50 text-[#e31e24] border-red-100',
            'Returned': 'bg-red-50 text-[#e31e24] border-red-100'
        };
        return colors[status] || 'bg-gray-50 text-gray-400 border-gray-100';
    };

    // Status tabs configuration
    const statusTabs = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

    // Calculate counts for each status
    const getStatusCount = (status) => {
        if (status === 'All') return orders.length;
        return orders.filter(order => order.status === status).length;
    };

    // PART 2: Filtering Logic (Tabs + Search)
    const filteredOrders = orders.filter(order => {
        const matchesTab = activeTab === 'All' || order.status === activeTab;

        const searchLower = searchQuery.toLowerCase().trim();
        const matchesSearch = !searchQuery ||
            (order.orderNumber && `#${order.orderNumber}`.includes(searchLower)) ||
            (order.orderNumber && String(order.orderNumber).includes(searchLower)) ||
            (order.customer?.name?.toLowerCase().includes(searchLower)) ||
            (order.customer?.phone?.includes(searchLower)) ||
            (order.id.toLowerCase().includes(searchLower));

        return matchesTab && matchesSearch;
    });

    return (
        <div className="min-h-full bg-gray-50 pb-20 font-sans text-gray-900">
            <AdminHeader title="Operations Center" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="">
                    <div className="flex flex-col md:flex-row gap-6 mb-10">
                        {/* Status Filter Hub - White Surface */}
                        <div className="flex-1 bg-white rounded-[24px] shadow-sm border border-gray-200 p-3 group/filters">
                            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-2 py-1">
                                {statusTabs.map(tab => {
                                    const count = getStatusCount(tab);
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-300 transform active:scale-95 ${isActive
                                                ? 'bg-[#e31e24] text-white shadow-xl shadow-[#e31e24]/20 translate-y-[-2px]'
                                                : 'bg-gray-50 text-gray-400 hover:bg-[#e31e24]/10 hover:text-[#e31e24]'
                                                }`}
                                        >
                                            <span>{tab}</span>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black min-w-[32px] text-center border transition-colors ${isActive
                                                ? 'bg-white/20 text-white border-white/20'
                                                : 'bg-white text-gray-400 border-gray-100'
                                                }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Order Search - High Performance Input */}
                        <div className="md:w-72 relative group/search">
                            <input
                                type="text"
                                placeholder="Search Order Matrix..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-6 py-4.5 text-sm font-black shadow-sm text-black placeholder-gray-300 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all group-hover/search:border-[#e31e24]/30"
                            />
                            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-300 group-focus-within/search:text-[#e31e24] transition-colors" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-r-2 border-[#e31e24] shadow-lg shadow-[#e31e24]/20"></div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Scanning Order Log...</span>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-white rounded-3xl p-20 text-center border border-gray-100 shadow-sm">
                            <p className="text-gray-400 text-lg font-black uppercase tracking-wide opacity-40 italic">System Idle. No Transaction Data Found.</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow-sm rounded-[32px] overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Registry</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Timestamp</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Consignee</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Financials</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Revenue</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Current Phase</th>
                                            <th scope="col" className="px-8 py-5 text-right text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Quick Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <span className="text-sm font-black text-[#e31e24] group-hover/row:scale-105 transition-transform inline-block">
                                                        #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap text-sm font-bold text-gray-400">
                                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB') : 'N/A'}
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <div className="text-sm font-black text-black">{order.customer?.name}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{order.customer?.phone}</div>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <div className="text-[11px] font-black text-gray-500 tracking-tight">{order.paymentMethod}</div>
                                                    <div className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 px-3 py-1 rounded-full border inline-block ${order.paymentStatus === 'Paid'
                                                        ? 'bg-green-50 text-green-600 border-green-100'
                                                        : 'bg-orange-50 text-orange-600 border-orange-100'
                                                        }`}>
                                                        {order.paymentStatus || 'Pending'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap text-base font-black text-black">
                                                    {order.total?.toLocaleString()} <span className="text-[10px] text-gray-400">EGP</span>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <select
                                                        value={order.status || 'Pending'}
                                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border outline-none cursor-pointer transition-all shadow-sm active:scale-95 ${getStatusColor(order.status)}`}
                                                    >
                                                        <option value="Pending" className="bg-white">Pending</option>
                                                        <option value="Processing" className="bg-white">Processing</option>
                                                        <option value="Shipped" className="bg-white">Shipped</option>
                                                        <option value="Delivered" className="bg-white">Delivered</option>
                                                        <option value="Cancelled" className="bg-white">Cancelled</option>
                                                        <option value="Returned" className="bg-white">Returned</option>
                                                    </select>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {/* Mark Paid Button */}
                                                        {order.paymentStatus !== 'Paid' && (
                                                            <button
                                                                onClick={() => handleMarkPaid(order.id)}
                                                                className="p-3 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border border-green-100 rounded-xl transition-all hover:-translate-y-1"
                                                                title="Execute Payment"
                                                            >
                                                                <DollarSign className="h-4.5 w-4.5" />
                                                            </button>
                                                        )}

                                                        {/* Edit Details Button */}
                                                        <button
                                                            onClick={() => setEditingOrder(order)}
                                                            className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 rounded-xl transition-all hover:-translate-y-1"
                                                            title="Adjustment Layer"
                                                        >
                                                            <Edit2 className="h-4.5 w-4.5" />
                                                        </button>

                                                        {/* View Details Link */}
                                                        <Link
                                                            to={`/admin/order/${order.id}`}
                                                            className="p-3 bg-red-50 text-[#e31e24] hover:bg-[#e31e24] hover:text-white border border-red-100 rounded-xl transition-all hover:-translate-y-1"
                                                            title="Full Visual Log"
                                                        >
                                                            <Eye className="h-4.5 w-4.5" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* PART 3: Edit Order Modal - Premium Glassmorphism */}
            {editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    onClose={() => setEditingOrder(null)}
                    onSave={(updatedOrder) => {
                        setOrders(prevOrders =>
                            prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
                        );
                        setEditingOrder(null);
                    }}
                />
            )}
        </div>
    );
};

// PART 3: Edit Order Modal Component
const EditOrderModal = ({ order, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        paymentMethod: order.paymentMethod || '',
        paymentStatus: order.paymentStatus || 'Pending',
        status: order.status || 'Pending'
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, {
                ...formData,
                updatedAt: new Date()
            });
            onSave({ ...order, ...formData });
            toast.success('Order synchronized successfully!');
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Sync Error: Database rejected modification.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-200 flex flex-col">
                <div className="bg-[#e31e24] p-10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-45 transition-transform duration-700">
                        <Edit2 className="w-48 h-48" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-widest poppins italic">Adjustment Protocol</h3>
                    <p className="text-white/70 text-[11px] font-black mt-2 uppercase tracking-[0.25em]">System ID: {order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                </div>

                <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Status Column */}
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Gateway Source</label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-black focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-black text-xs"
                                >
                                    <option value="Cash on Delivery" className="bg-white">Cash on Delivery</option>
                                    <option value="Credit Card (EasyKash)" className="bg-white">Credit Card (EasyKash)</option>
                                    <option value="InstaPay" className="bg-white">InstaPay</option>
                                    <option value="Wallet" className="bg-white">Wallet</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Matrix</label>
                                <select
                                    value={formData.paymentStatus}
                                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-black focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-black text-xs"
                                >
                                    <option value="Pending" className="bg-white">Pending</option>
                                    <option value="Paid" className="bg-white">Verified: Paid</option>
                                    <option value="Failed" className="bg-white">Exception: Failed</option>
                                    <option value="Refunded" className="bg-white">Action: Refunded</option>
                                </select>
                            </div>
                        </div>

                        {/* Logistics Column */}
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Logistic Pipeline</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-black focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-black text-xs"
                                >
                                    <option value="Pending" className="bg-white">Inbound / Pending</option>
                                    <option value="Processing" className="bg-white">Workflow: Processing</option>
                                    <option value="Shipped" className="bg-white">Transit: Shipped</option>
                                    <option value="Delivered" className="bg-white">Terminal: Delivered</option>
                                    <option value="Cancelled" className="bg-white">Void: Cancelled</option>
                                    <option value="Returned" className="bg-white">Reversal: Returned</option>
                                </select>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <p className="text-[10px] font-black text-[#e31e24] uppercase tracking-widest mb-3">Consignee Data</p>
                                <p className="text-sm font-black text-black truncate mb-1">{order.customer?.name}</p>
                                <p className="text-xs text-gray-500 font-bold truncate opacity-80 mb-0.5">{order.customer?.phone}</p>
                                <p className="text-[10px] text-gray-400 truncate font-medium uppercase">{order.customer?.governorate}, {order.customer?.city}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Hub */}
                    <div className="flex flex-col gap-4 pt-6 border-t border-gray-100">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-[#e31e24] hover:bg-[#b8181d] text-white font-black py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-[#e31e24]/20 disabled:opacity-50 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[11px]"
                        >
                            {saving ? "Synchronizing..." : "Finalize Modification"}
                            {!saving && <CheckCircle className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full text-gray-400 font-black py-4 text-[10px] uppercase tracking-widest hover:text-black transition-colors"
                        >
                            Abort Protocol
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOrders;
