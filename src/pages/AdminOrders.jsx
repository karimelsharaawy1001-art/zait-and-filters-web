import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { Eye, DollarSign, Edit2, CheckCircle, Search, Plus, Minus, Trash2, PlusCircle, Package, CreditCard, Clock, X, Save } from 'lucide-react';
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
            const q = query(collection(db, 'orders'), orderBy('orderNumber', 'desc'));
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

    const markAsOpened = async (orderId) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { isOpened: true });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isOpened: true } : o));
        } catch (error) {
            console.warn("Error marking as opened:", error);
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
                    const transRef = collection(db, `affiliates / ${affId}/transactions`);
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
            'Awaiting Payment Verification': 'bg-amber-50 text-amber-600 border-amber-100',
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
        if (status === 'Pending') {
            return orders.filter(order => order.status === 'Pending' || order.status === 'Awaiting Payment Verification').length;
        }
        return orders.filter(order => order.status === status).length;
    };

    // PART 2: Filtering Logic (Tabs + Search)
    const filteredOrders = orders.filter(order => {
        let matchesTab = activeTab === 'All' || order.status === activeTab;

        // Special mapping: Pending tab shows both Pending and Awaiting Verification
        if (activeTab === 'Pending') {
            matchesTab = order.status === 'Pending' || order.status === 'Awaiting Payment Verification';
        }

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

            <main className="max-w-full mx-auto py-8 px-4 md:px-10">
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
                        <div className="bg-white shadow-sm rounded-[32px] overflow-hidden border border-gray-100 mb-8">
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                                <table className="w-full min-w-[1200px] lg:min-w-0">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Registry</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Timestamp</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Consignee</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Flow</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Revenue</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Operational Phase</th>
                                            <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Actions</th>
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
                                                        <option value="Awaiting Payment Verification" className="bg-white">Awaiting Verification</option>
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
                                                                className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border border-green-100 rounded-xl transition-all active:scale-90"
                                                                title="Execute Payment"
                                                            >
                                                                <DollarSign className="h-5 w-5" />
                                                            </button>
                                                        )}

                                                        {/* Edit Details Button */}
                                                        <button
                                                            onClick={() => {
                                                                setEditingOrder(order);
                                                                if (order.isOpened === false) markAsOpened(order.id);
                                                            }}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-black"
                                                            title="Edit Order"
                                                        >
                                                            <Edit2 className="w-5 h-5" />
                                                        </button>

                                                        {/* View Details Link */}
                                                        <Link
                                                            to={`/admin/order/${order.id}`}
                                                            onClick={() => { if (order.isOpened === false) markAsOpened(order.id); }}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-black"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-5 h-5" />
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

// PART 3: Pro-Grade Order Editor Modal
const EditOrderModal = ({ order, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        paymentMethod: order.paymentMethod || '',
        paymentStatus: order.paymentStatus || 'Pending',
        status: order.status || 'Pending',
        items: [...(order.items || [])],
        extraFees: order.extraFees || 0,
        manualDiscount: order.manualDiscount || 0
    });
    const [saving, setSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleProductSearch = async (q) => {
        setProductSearch(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const productsRef = collection(db, 'products');
            const qSnap = await getDocs(productsRef);
            const all = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filtered = all.filter(p =>
                p.name?.toLowerCase().includes(q.toLowerCase()) ||
                p.sku?.toLowerCase().includes(q.toLowerCase()) ||
                p.partNumber?.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 5);
            setSearchResults(filtered);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const addProductToOrder = (product) => {
        const existing = formData.items.find(item => item.id === product.id);
        if (existing) {
            setFormData({
                ...formData,
                items: formData.items.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            });
        } else {
            setFormData({
                ...formData,
                items: [...formData.items, {
                    id: product.id,
                    name: product.name,
                    nameEn: product.nameEn || product.name,
                    price: product.price,
                    image: product.image || product.images?.[0] || '/placeholder.png',
                    quantity: 1,
                    brand: product.partBrand || product.brand || 'N/A'
                }]
            });
        }
        setProductSearch('');
        setSearchResults([]);
    };

    const updateItemQuantity = (id, delta) => {
        setFormData({
            ...formData,
            items: formData.items.map(item => {
                if (item.id === id) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            })
        });
    };

    const removeItem = (id) => {
        setFormData({
            ...formData,
            items: formData.items.filter(item => item.id !== id)
        });
    };

    const calculateNewTotals = () => {
        const subtotal = formData.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        const shipping = parseFloat(order.shipping_cost || 0);
        const promoDiscount = parseFloat(order.discount || 0);
        const total = subtotal + shipping + parseFloat(formData.extraFees || 0) - promoDiscount - parseFloat(formData.manualDiscount || 0);
        return { subtotal, total };
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { subtotal, total } = calculateNewTotals();
            const orderRef = doc(db, 'orders', order.id);
            const updateData = {
                ...formData,
                subtotal,
                total,
                updatedAt: serverTimestamp()
            };

            await updateDoc(orderRef, updateData);
            onSave({ ...order, ...updateData });
            toast.success('Order synchronized successfully!');
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Database Error: Failed to commit changes.");
        } finally {
            setSaving(false);
        }
    };

    const { subtotal: newSubtotal, total: newTotal } = calculateNewTotals();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-100 flex flex-col max-h-[95vh]">
                {/* Header: Premium Dark Style */}
                <div className="bg-[#1A1A1A] p-8 text-white relative overflow-hidden shrink-0">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-[#e31e24] animate-pulse"></div>
                                <h3 className="text-xl font-black uppercase tracking-widest poppins italic">Pro-Grade Order Editor</h3>
                            </div>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Precision Modification • #{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="h-6 w-6 text-white/50 hover:text-white" />
                        </button>
                    </div>
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Package className="w-48 h-48" />
                    </div>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto flex-1">
                    {/* Core Parameters Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <CreditCard className="w-3 h-3" />
                                Payment Flow
                            </label>
                            <div className="space-y-3">
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all font-bold text-xs"
                                >
                                    <option value="Cash on Delivery">Cash on Delivery</option>
                                    <option value="Credit Card (EasyKash)">Credit Card (EasyKash)</option>
                                    <option value="InstaPay">InstaPay</option>
                                    <option value="Wallet">Wallet</option>
                                </select>
                                <select
                                    value={formData.paymentStatus}
                                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                                    className={`w-full px-5 py-3.5 border rounded-2xl outline-none transition-all font-bold text-xs ${formData.paymentStatus === 'Paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-black border-gray-100'
                                        }`}
                                >
                                    <option value="Pending">Pending Verification</option>
                                    <option value="Paid">Verified: Paid</option>
                                    <option value="Failed">Operation: Failed</option>
                                    <option value="Refunded">Action: Refunded</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Operational Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all font-bold text-xs mb-3"
                            >
                                <option value="Pending">Inbound / Pending</option>
                                <option value="Awaiting Payment Verification">Awaiting Verification</option>
                                <option value="Processing">Workflow: Processing</option>
                                <option value="Shipped">Transit: Shipped</option>
                                <option value="Delivered">Terminal: Delivered</option>
                                <option value="Cancelled">Void: Cancelled</option>
                                <option value="Returned">Reversal: Returned</option>
                            </select>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                                <div className="h-10 w-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                                    <Package className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Consignee</p>
                                    <p className="text-xs font-black text-black truncate">{order.customer?.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Section: Robust Management */}
                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between gap-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Inventory Matrix</label>
                            <div className="relative flex-1 max-w-sm">
                                <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 focus-within:ring-2 ring-[#1A1A1A] transition-all">
                                    <Search className="h-4 w-4 text-gray-400 mr-3" />
                                    <input
                                        type="text"
                                        placeholder="Inject product..."
                                        value={productSearch}
                                        onChange={(e) => handleProductSearch(e.target.value)}
                                        className="bg-transparent border-none outline-none text-xs w-full font-bold text-black"
                                    />
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 shadow-2xl rounded-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {searchResults.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addProductToOrder(p)}
                                                className="w-full px-5 py-4 text-left hover:bg-gray-50 flex items-center gap-4 border-b border-gray-50 last:border-0 transition-colors"
                                            >
                                                <div className="bg-gray-100 rounded-lg h-10 w-10 shrink-0 overflow-hidden border border-gray-200">
                                                    <img src={p.image || p.images?.[0]} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-black truncate text-black">{p.name}</p>
                                                    <p className="text-[10px] text-[#e31e24] font-black uppercase tracking-widest">{p.price} EGP</p>
                                                </div>
                                                <PlusCircle className="h-5 w-5 text-[#e31e24] opacity-50 hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50/50 rounded-[28px] border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                            {formData.items.length === 0 ? (
                                <div className="p-12 text-center text-gray-300 italic text-xs font-bold uppercase tracking-widest">No Active Payloads</div>
                            ) : formData.items.map((item, idx) => (
                                <div key={idx} className="p-5 flex items-center gap-5 bg-white last:border-0">
                                    <div className="w-14 h-14 rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden shrink-0 shadow-sm">
                                        <img src={item.image} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate text-black uppercase tracking-tight poppins">{item.name}</p>
                                        <p className="text-[10px] font-black text-[#e31e24] tracking-widest mt-0.5">{item.price} EGP</p>
                                    </div>
                                    <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shadow-inner">
                                        <button onClick={() => updateItemQuantity(item.id, -1)} className="p-2.5 hover:bg-gray-200 text-gray-500 transition-all active:scale-90">
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="px-4 py-1 font-black text-xs min-w-[36px] text-center text-black">
                                            {item.quantity}
                                        </span>
                                        <button onClick={() => updateItemQuantity(item.id, 1)} className="p-2.5 hover:bg-gray-200 text-gray-500 transition-all active:scale-90">
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <button onClick={() => removeItem(item.id)} className="p-2.5 text-gray-300 hover:text-[#e31e24] hover:bg-red-50 rounded-xl transition-all active:scale-90">
                                        <Trash2 className="h-4.5 w-4.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Overrides */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Service Surcharge (EGP)</label>
                            <input
                                type="number"
                                value={formData.extraFees}
                                onChange={(e) => setFormData({ ...formData, extraFees: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all font-black text-xs"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Manual Adjustment (EGP)</label>
                            <input
                                type="number"
                                value={formData.manualDiscount}
                                onChange={(e) => setFormData({ ...formData, manualDiscount: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-black text-xs"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Financial Summary: High Contrast */}
                    <div className="bg-[#1A1A1A] rounded-[28px] p-8 text-white space-y-3 shrink-0 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                            <span>Subtotal Matrix</span>
                            <span>{newSubtotal} EGP</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                            <span>Logistics + Surcharge</span>
                            <span>+{(parseFloat(order.shipping_cost || 0) + parseFloat(formData.extraFees || 0))} EGP</span>
                        </div>
                        {order.discount > 0 && (
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#e31e24]">
                                <span>Promo Injection</span>
                                <span>-{order.discount} EGP</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-5 mt-2 border-t border-white/10 relative z-10">
                            <span className="text-sm font-black uppercase tracking-[0.2em] poppins italic opacity-60">Terminal Total</span>
                            <span className="text-3xl font-black text-white poppins tabular-nums transition-all">
                                {newTotal} <span className="text-[12px] font-bold text-white/30 tracking-widest uppercase">EGP</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-gray-50 shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl font-black text-gray-400 hover:text-black hover:bg-gray-50 transition-all uppercase tracking-[0.2em] text-[10px]"
                        >
                            Abort Changes
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-[2] bg-[#1A1A1A] hover:bg-black text-white font-black py-4 rounded-[20px] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-[11px]"
                        >
                            {saving ? "Processing..." : "Commit Protocol"}
                            {!saving && <Save className="h-5 w-5 text-[#e31e24]" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOrders;
