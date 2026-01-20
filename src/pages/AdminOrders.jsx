import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy, where, getDoc } from 'firebase/firestore';
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
            'Pending': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'Processing': 'bg-blue-50 text-blue-700 border-blue-200',
            'Shipped': 'bg-purple-50 text-purple-700 border-purple-200',
            'Delivered': 'bg-green-50 text-green-700 border-green-200',
            'Cancelled': 'bg-red-50 text-red-700 border-red-200',
            'Returned': 'bg-red-50 text-red-700 border-red-200'
        };
        return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
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
        <div className="min-h-full bg-gray-50 pb-20">
            <AdminHeader title="Orders Management" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {statusTabs.map(tab => {
                                    const count = getStatusCount(tab);
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all ${isActive
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span>{tab}</span>
                                            <span className={`px-2.5 py-1 rounded-full text-sm font-black min-w-[28px] text-center ${isActive
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="md:w-64 relative">
                            <input
                                type="text"
                                placeholder="Search #Number, Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-100 rounded-2xl px-10 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
                        </div>
                    ) : orders.length === 0 ? (
                        <p className="text-gray-500 text-center">No orders found.</p>
                    ) : (
                        <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order #</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-black text-blue-600">
                                                        #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">{order.customer?.name}</div>
                                                    <div className="text-xs text-gray-500">{order.customer?.phone}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs font-bold text-gray-900">{order.paymentMethod}</div>
                                                    <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-600'
                                                        }`}>
                                                        {order.paymentStatus || 'Pending'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                                                    {order.total} EGP
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {/* PART 1: Quick Status Dropdown */}
                                                    <select
                                                        value={order.status || 'Pending'}
                                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                        className={`text-xs font-black uppercase tracking-widest px-3 py-2 rounded-lg border-2 outline-none cursor-pointer transition-all ${getStatusColor(order.status)}`}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Processing">Processing</option>
                                                        <option value="Shipped">Shipped</option>
                                                        <option value="Delivered">Delivered</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                        <option value="Returned">Returned</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                    {order.items?.map(i => `${i.name} (${i.quantity})`).join(', ')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {/* PART 2: Actions Column */}
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Mark Paid Button - Show only if not paid */}
                                                        {order.paymentStatus !== 'Paid' && (
                                                            <button
                                                                onClick={() => handleMarkPaid(order.id)}
                                                                className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                                                                title="Mark as Paid"
                                                            >
                                                                <DollarSign className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {/* Edit Details Button */}
                                                        <button
                                                            onClick={() => setEditingOrder(order)}
                                                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                                            title="Edit Details"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>

                                                        {/* View Details Link */}
                                                        <Link
                                                            to={`/admin/order/${order.id}`}
                                                            className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                                                            title="View Full Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
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

            {/* PART 3: Edit Order Modal */}
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
            toast.success('Order updated successfully!');
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-3xl shadow-2xl relative w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-blue-600 p-8 text-white">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Edit Order</h3>
                    <p className="text-blue-200 text-sm font-bold mt-1">Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                </div>
                <div className="p-8 space-y-6">
                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Payment Method</label>
                        <select
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-bold"
                        >
                            <option value="Cash on Delivery">Cash on Delivery</option>
                            <option value="Credit Card (EasyKash)">Credit Card (EasyKash)</option>
                            <option value="InstaPay">InstaPay</option>
                            <option value="Wallet">Wallet</option>
                        </select>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Payment Status</label>
                        <select
                            value={formData.paymentStatus}
                            onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-bold"
                        >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Failed">Failed</option>
                            <option value="Refunded">Refunded</option>
                        </select>
                    </div>

                    {/* Delivery Status */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-bold"
                        >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Returned">Returned</option>
                        </select>
                    </div>

                    {/* Shipping Address View */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Shipping Address</p>
                        <p className="text-sm font-bold text-gray-900">{order.customer?.name}</p>
                        <p className="text-sm text-gray-600">{order.customer?.address}</p>
                        <p className="text-sm text-gray-600">{order.customer?.city}, {order.customer?.governorate}</p>
                        <p className="text-sm text-gray-600">{order.customer?.phone}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                            {!saving && <CheckCircle className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-white text-gray-500 font-bold py-3 text-xs uppercase tracking-widest hover:text-gray-900 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOrders;
