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
            'Pending': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            'Processing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'Shipped': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'Delivered': 'bg-green-500/10 text-green-500 border-green-500/20',
            'Cancelled': 'bg-racing-red/10 text-racing-red border-racing-red/20',
            'Returned': 'bg-racing-red/10 text-racing-red border-racing-red/20'
        };
        return colors[status] || 'bg-matte-black text-dim-grey border-border-dark';
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
        <div className="min-h-full bg-matte-black pb-20 font-sans text-snow-white">
            <AdminHeader title="Operations Center" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="">
                    <div className="flex flex-col md:flex-row gap-6 mb-10">
                        {/* Status Filter Hub - Carbon Surface */}
                        <div className="flex-1 bg-carbon-grey rounded-[24px] shadow-premium-3d border border-border-dark p-3 group/filters">
                            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-2 py-1">
                                {statusTabs.map(tab => {
                                    const count = getStatusCount(tab);
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-300 transform active:scale-95 ${isActive
                                                ? 'bg-racing-red text-snow-white shadow-xl shadow-racing-red/20 translate-y-[-2px]'
                                                : 'bg-matte-black/40 text-silver-grey hover:bg-racing-red/10 hover:text-racing-red'
                                                }`}
                                        >
                                            <span>{tab}</span>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black min-w-[32px] text-center border transition-colors ${isActive
                                                ? 'bg-white/20 text-white border-white/20'
                                                : 'bg-matte-black text-dim-grey border-border-dark'
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
                                className="w-full bg-carbon-grey border border-border-dark rounded-2xl pl-12 pr-6 py-4.5 text-sm font-black shadow-premium-3d text-snow-white placeholder-dim-grey focus:ring-2 focus:ring-racing-red outline-none transition-all group-hover/search:border-racing-red/30"
                            />
                            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-dim-grey group-focus-within/search:text-racing-red transition-colors" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-r-2 border-racing-red shadow-lg shadow-racing-red/20"></div>
                            <span className="text-xs font-black text-dim-grey uppercase tracking-widest animate-pulse">Scanning Order Log...</span>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-carbon-grey rounded-3xl p-20 text-center border border-border-dark shadow-premium-3d">
                            <p className="text-silver-grey text-lg font-black uppercase tracking-wide opacity-40 italic">System Idle. No Transaction Data Found.</p>
                        </div>
                    ) : (
                        <div className="bg-carbon-grey shadow-premium-3d rounded-[32px] overflow-hidden border border-border-dark">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-matte-black/60">
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Registry</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Timestamp</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Consignee</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Financials</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Revenue</th>
                                            <th scope="col" className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Current Phase</th>
                                            <th scope="col" className="px-8 py-5 text-right text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Quick Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-dark/50">
                                        {filteredOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <span className="text-sm font-black text-racing-red group-hover/row:scale-105 transition-transform inline-block">
                                                        #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap text-sm font-bold text-dim-grey">
                                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB') : 'N/A'}
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <div className="text-sm font-black text-snow-white">{order.customer?.name}</div>
                                                    <div className="text-[10px] font-bold text-dim-grey uppercase tracking-widest mt-0.5">{order.customer?.phone}</div>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <div className="text-[11px] font-black text-silver-grey tracking-tight">{order.paymentMethod}</div>
                                                    <div className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 px-3 py-1 rounded-full border inline-block ${order.paymentStatus === 'Paid'
                                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                        : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                        }`}>
                                                        {order.paymentStatus || 'Pending'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap text-base font-black text-snow-white">
                                                    {order.total?.toLocaleString()} <span className="text-[10px] text-dim-grey">EGP</span>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap">
                                                    <select
                                                        value={order.status || 'Pending'}
                                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border outline-none cursor-pointer transition-all shadow-md active:scale-95 ${getStatusColor(order.status)}`}
                                                    >
                                                        <option value="Pending" className="bg-carbon-grey">Pending</option>
                                                        <option value="Processing" className="bg-carbon-grey">Processing</option>
                                                        <option value="Shipped" className="bg-carbon-grey">Shipped</option>
                                                        <option value="Delivered" className="bg-carbon-grey">Delivered</option>
                                                        <option value="Cancelled" className="bg-carbon-grey">Cancelled</option>
                                                        <option value="Returned" className="bg-carbon-grey">Returned</option>
                                                    </select>
                                                </td>
                                                <td className="px-8 py-7 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {/* Mark Paid Button */}
                                                        {order.paymentStatus !== 'Paid' && (
                                                            <button
                                                                onClick={() => handleMarkPaid(order.id)}
                                                                className="p-3 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/20 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-green-500/5 group/btn"
                                                                title="Execute Payment"
                                                            >
                                                                <DollarSign className="h-4.5 w-4.5 transition-transform group-hover/btn:scale-110" />
                                                            </button>
                                                        )}

                                                        {/* Edit Details Button */}
                                                        <button
                                                            onClick={() => setEditingOrder(order)}
                                                            className="p-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-blue-500/5 group/btn"
                                                            title="Adjustment Layer"
                                                        >
                                                            <Edit2 className="h-4.5 w-4.5 transition-transform group-hover/btn:rotate-12" />
                                                        </button>

                                                        {/* View Details Link */}
                                                        <Link
                                                            to={`/admin/order/${order.id}`}
                                                            className="p-3 bg-racing-red/10 text-racing-red hover:bg-racing-red hover:text-white border border-racing-red/20 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-racing-red/5 group/btn"
                                                            title="Full Visual Log"
                                                        >
                                                            <Eye className="h-4.5 w-4.5 transition-transform group-hover/btn:scale-110" />
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
            <div className="absolute inset-0 bg-matte-black/90 backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-carbon-grey rounded-[32px] shadow-premium-3d relative w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 border border-border-dark flex flex-col">
                <div className="bg-racing-red p-10 text-snow-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-45 transition-transform duration-700">
                        <Edit2 className="w-48 h-48" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-widest poppins italic">Adjustment Protocol</h3>
                    <p className="text-snow-white/70 text-[11px] font-black mt-2 uppercase tracking-[0.25em]">System ID: {order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                </div>

                <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-racing-red/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Status Column */}
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Gateway Source</label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-snow-white focus:ring-2 focus:ring-racing-red outline-none transition-all font-black text-xs shadow-inner"
                                >
                                    <option value="Cash on Delivery" className="bg-carbon-grey">Cash on Delivery</option>
                                    <option value="Credit Card (EasyKash)" className="bg-carbon-grey">Credit Card (EasyKash)</option>
                                    <option value="InstaPay" className="bg-carbon-grey">InstaPay</option>
                                    <option value="Wallet" className="bg-carbon-grey">Wallet</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Payment Matrix</label>
                                <select
                                    value={formData.paymentStatus}
                                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-snow-white focus:ring-2 focus:ring-racing-red outline-none transition-all font-black text-xs shadow-inner"
                                >
                                    <option value="Pending" className="bg-carbon-grey">Pending</option>
                                    <option value="Paid" className="bg-carbon-grey">Verified: Paid</option>
                                    <option value="Failed" className="bg-carbon-grey">Exception: Failed</option>
                                    <option value="Refunded" className="bg-carbon-grey">Action: Refunded</option>
                                </select>
                            </div>
                        </div>

                        {/* Logistics Column */}
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Logistic Pipeline</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-snow-white focus:ring-2 focus:ring-racing-red outline-none transition-all font-black text-xs shadow-inner"
                                >
                                    <option value="Pending" className="bg-carbon-grey">Inbound / Pending</option>
                                    <option value="Processing" className="bg-carbon-grey">Workflow: Processing</option>
                                    <option value="Shipped" className="bg-carbon-grey">Transit: Shipped</option>
                                    <option value="Delivered" className="bg-carbon-grey">Terminal: Delivered</option>
                                    <option value="Cancelled" className="bg-carbon-grey">Void: Cancelled</option>
                                    <option value="Returned" className="bg-carbon-grey">Reversal: Returned</option>
                                </select>
                            </div>

                            <div className="bg-matte-black/40 rounded-2xl p-6 border border-border-dark shadow-inner">
                                <p className="text-[10px] font-black text-racing-red uppercase tracking-widest mb-3">Consignee Data</p>
                                <p className="text-sm font-black text-snow-white truncate mb-1">{order.customer?.name}</p>
                                <p className="text-xs text-silver-grey font-bold truncate opacity-80 mb-0.5">{order.customer?.phone}</p>
                                <p className="text-[10px] text-dim-grey truncate font-medium uppercase">{order.customer?.governorate}, {order.customer?.city}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Hub */}
                    <div className="flex flex-col gap-4 pt-6 border-t border-border-dark/50">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-racing-red hover:bg-racing-red-dark text-snow-white font-black py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-racing-red/20 disabled:opacity-50 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[11px]"
                        >
                            {saving ? "Synchronizing..." : "Finalize Modification"}
                            {!saving && <CheckCircle className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full text-dim-grey font-black py-4 text-[10px] uppercase tracking-widest hover:text-snow-white transition-colors"
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
