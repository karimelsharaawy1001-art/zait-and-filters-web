import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, updateDoc, doc, deleteDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import {
    Eye, DollarSign, Edit2, Search, PlusCircle, Package, CreditCard, Clock, X, Save,
    User, MapPin, Loader2, Filter, Printer, Trash2, ChevronLeft, ChevronRight, Download, Calendar, Phone, FileImage
} from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';
import { useStaticData } from '../context/StaticDataContext';
import { normalizeArabic } from '../utils/productUtils';

import { databases } from '../appwrite';
import { Query } from 'appwrite';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // 1. Fetch from Firebase
            const fetchFirebaseOrders = async () => {
                const ordersRef = collection(db, 'orders');
                const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(100));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => {
                    const data = doc.data();

                    // Normalize customer data (check both 'customer' and 'customerInfo')
                    let customer = {};
                    const rawCustomer = data.customer || data.customerInfo;
                    if (typeof rawCustomer === 'string') {
                        try { customer = JSON.parse(rawCustomer); } catch (e) { }
                    } else {
                        customer = rawCustomer || {};
                    }

                    let parsedItems = [];
                    if (typeof data.items === 'string') {
                        try { parsedItems = JSON.parse(data.items); } catch (e) { }
                    } else if (Array.isArray(data.items)) {
                        parsedItems = data.items;
                    }

                    let parsedAddress = {};
                    const rawAddress = data.shippingAddress || customer.address; // Fallback to customer address if shippingAddress missing
                    if (typeof rawAddress === 'string') {
                        try { parsedAddress = JSON.parse(rawAddress); } catch (e) { }
                    } else {
                        parsedAddress = rawAddress || {};
                    }

                    return {
                        id: doc.id,
                        ...data,
                        source: 'firebase',
                        customer,
                        items: parsedItems,
                        shippingAddress: parsedAddress,
                        createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now())
                    };
                });
            };

            // 2. Fetch from Appwrite
            const fetchAppwriteOrders = async () => {
                if (!DATABASE_ID) return [];
                try {
                    const response = await databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [
                        Query.orderDesc('$createdAt'),
                        Query.limit(100)
                    ]);
                    return response.documents.map(doc => {
                        let customer = {};
                        const rawCustomer = doc.customer || doc.customerInfo;
                        if (typeof rawCustomer === 'string') {
                            try { customer = JSON.parse(rawCustomer); } catch (e) { }
                        } else {
                            customer = rawCustomer || {};
                        }

                        let items = [];
                        if (typeof doc.items === 'string') {
                            try { items = JSON.parse(doc.items); } catch (e) { }
                        } else if (Array.isArray(doc.items)) {
                            items = doc.items;
                        }

                        return {
                            id: doc.$id,
                            ...doc,
                            source: 'appwrite',
                            customer,
                            items: items,
                            createdAt: new Date(doc.$createdAt).getTime()
                        };
                    });
                } catch (err) {
                    console.error("Appwrite fetch error:", err);
                    return [];
                }
            };

            // 3. Fetch from Static JSON (Workaround for Quota Blocks)
            const fetchStaticOrders = async () => {
                try {
                    const response = await fetch('/data/orders-legacy.json');
                    if (!response.ok) return [];
                    const data = await response.json();

                    // Appwrite export is usually { documents: [...] } or an array
                    const documents = Array.isArray(data) ? data : (data.documents || []);

                    return documents.map(doc => {
                        let customer = {};
                        const rawCustomer = doc.customer || doc.customerInfo;
                        if (typeof rawCustomer === 'string') {
                            try { customer = JSON.parse(rawCustomer); } catch (e) { }
                        } else {
                            customer = rawCustomer || {};
                        }

                        let items = [];
                        if (typeof doc.items === 'string') {
                            try { items = JSON.parse(doc.items); } catch (e) { }
                        } else if (Array.isArray(doc.items)) {
                            items = doc.items;
                        }

                        return {
                            id: doc.$id || doc.id,
                            ...doc,
                            source: 'static',
                            customer,
                            items: items,
                            createdAt: doc.$createdAt ? new Date(doc.$createdAt).getTime() : (doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now())
                        };
                    });
                } catch (err) {
                    console.log("[AdminOrders] No static legacy orders found or fetch failed.");
                    return [];
                }
            };

            const [fbOrders, awOrders, staticOrders] = await Promise.all([
                fetchFirebaseOrders().catch(err => {
                    console.error("Firebase fetch error:", err);
                    return [];
                }),
                fetchAppwriteOrders().catch(err => {
                    console.error("Appwrite fetch error:", err);
                    return [];
                }),
                fetchStaticOrders()
            ]);

            console.log(`[AdminOrders] Fetched: ${fbOrders.length} FB, ${awOrders.length} AW, ${staticOrders.length} Static`);

            // Combine and sort by createdAt desc
            const combinedOrders = [...fbOrders, ...awOrders, ...staticOrders].sort((a, b) => b.createdAt - a.createdAt);

            setOrders(combinedOrders);
            if (combinedOrders.length === 0) {
                console.warn("[AdminOrders] No orders found in any source");
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        const targetOrder = orders.find(o => o.id === orderId);
        if (!targetOrder) return;

        try {
            if (targetOrder.source === 'firebase') {
                const orderRef = doc(db, 'orders', orderId);
                await updateDoc(orderRef, { status: newStatus });
            } else {
                await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, orderId, { status: newStatus });
            }

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            toast.success(`Protocol updated to ${newStatus}`);

            // Affiliate commission logic if Delivered (Firebase only for simplicity, or if affiliate exists in data)
            if (newStatus === 'Delivered' && targetOrder?.affiliateCode) {
                // ... (existing affiliate logic)
                try {
                    const affiliatesRef = collection(db, 'affiliates');
                    const qAff = query(affiliatesRef, where('referralCode', '==', targetOrder.affiliateCode));
                    const affSnap = await getDocs(qAff);

                    if (!affSnap.empty) {
                        const affDoc = affSnap.docs[0];
                        const affData = affDoc.data();

                        // Check transaction existence
                        const transactionsRef = collection(db, 'transactions');
                        const qTrans = query(transactionsRef, where('orderId', '==', orderId));
                        const transSnap = await getDocs(qTrans);

                        if (transSnap.empty) {
                            const commission = Math.floor((targetOrder.subtotal || 0) * ((affData.commissionPercentage || 5) / 100));

                            await addDoc(transactionsRef, {
                                type: 'commission',
                                amount: targetOrder.subtotal,
                                commission,
                                orderId,
                                affiliateId: affDoc.id,
                                orderNumber: String(targetOrder.orderNumber),
                                status: 'Pending',
                                createdAt: serverTimestamp() // Firestore Timestamp
                            });

                            const affRef = doc(db, 'affiliates', affDoc.id);
                            await updateDoc(affRef, {
                                totalEarnings: (affData.totalEarnings || 0) + commission,
                                referralCount: (affData.referralCount || 0) + 1
                            });
                        }
                    }
                } catch (err) {
                    console.error("Affiliate logic error:", err);
                }
            }
        } catch (error) {
            console.error("Status update error:", error);
            toast.error("Status sync failure");
        }
    };

    const handleMarkPaid = async (orderId) => {
        const targetOrder = orders.find(o => o.id === orderId);
        if (!targetOrder) return;

        try {
            if (targetOrder.source === 'firebase') {
                const orderRef = doc(db, 'orders', orderId);
                await updateDoc(orderRef, { paymentStatus: 'Paid' });
            } else {
                await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, orderId, { paymentStatus: 'Paid' });
            }
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: 'Paid' } : o));
            toast.success("Payment verified");
        } catch (error) {
            console.error("Payment update error:", error);
            toast.error("Verification failed");
        }
    };

    const handleDeleteOrder = async (orderId, orderNumber) => {
        const targetOrder = orders.find(o => o.id === orderId);
        if (!targetOrder) return;

        if (!window.confirm(`Are you sure you want to permanently delete order #${orderNumber}? This action cannot be undone.`)) return;

        try {
            toast.loading("Deleting protocol...");
            if (targetOrder.source === 'firebase') {
                await deleteDoc(doc(db, 'orders', orderId));
            } else {
                await databases.deleteDocument(DATABASE_ID, ORDERS_COLLECTION, orderId);
            }
            setOrders(prev => prev.filter(o => o.id !== orderId));
            toast.dismiss();
            toast.success(`Protocol #${orderNumber} purged successfully`);
        } catch (error) {
            toast.dismiss();
            console.error("Purge failure:", error);
            toast.error("Failed to delete order");
        }
    };

    const statusTabs = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    const filteredOrders = orders.filter(o => {
        const matchesTab = activeTab === 'All' || o.status === activeTab;
        const search = searchQuery.toLowerCase().trim();
        const matchesSearch = !search || String(o.orderNumber || '').includes(search) || o.customer?.name?.toLowerCase().includes(search) || o.customer?.phone?.includes(search);
        return matchesTab && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Logistics Center" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Order Registry</h2>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                            Oversight Feed: {orders.length} Protocols
                            <span className="ml-2 text-slate-300">
                                ({orders.filter(o => o.source === 'firebase').length} FB | {orders.filter(o => o.source === 'appwrite').length} AW | {orders.filter(o => o.source === 'static').length} ST)
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium shadow-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                                placeholder="Search Protocol..."
                            />
                        </div>
                        <button onClick={() => navigate('/admin/products/new')} className="text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            <PlusCircle size={14} /> New Order
                        </button>
                    </div>
                </div>

                <div className="bg-white p-1.5 mb-6 overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex gap-1 min-w-max">
                        {statusTabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                {tab} <span className={`ml-1.5 text-[9px] ${activeTab === tab ? 'text-slate-400' : 'text-slate-400'}`}>{orders.filter(o => tab === 'All' || o.status === tab).length}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-16 text-center text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                            <p className="text-xs font-medium uppercase tracking-widest">Accessing Logs...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                                    <tr>
                                        <th className="p-4 rounded-tl-xl text-left">Protocol ID</th>
                                        <th className="p-4 text-left">Consignee</th>
                                        <th className="p-4 text-left">Flow Type</th>
                                        <th className="p-4 text-center">Gross Revenue</th>
                                        <th className="p-4 text-center">Phase</th>
                                        <th className="p-4 rounded-tr-xl text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 group transition-all">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-900">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                                                        {new Date(order.createdAt).toLocaleDateString('en-GB')} | {new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold uppercase">{order.customer?.name?.[0]}</div>
                                                    <div>
                                                        <h4 className="text-[12px] font-bold text-slate-800 leading-tight">{order.customer?.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">{order.customer?.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                        <CreditCard size={10} />
                                                        {order.paymentMethod}
                                                        {(order.receiptUrl || order.notes?.includes('[Receipt URL]:')) && (
                                                            <span className="ml-1 text-[8px] bg-blue-100 text-blue-600 px-1 rounded flex items-center gap-0.5" title="Payment Proof Uploaded">
                                                                <FileImage size={8} /> PROOF
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border w-fit ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{order.paymentStatus}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-sm font-bold text-slate-900">{order.total?.toLocaleString()} EGP</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <select
                                                    value={order.status}
                                                    onChange={e => handleStatusChange(order.id, e.target.value)}
                                                    className={`text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg border shadow-sm outline-none transition-all cursor-pointer ${order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        order.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                                                            order.status === 'Processing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                'bg-amber-50 text-amber-600 border-amber-100'
                                                        }`}
                                                >
                                                    {statusTabs.map(s => s !== 'All' && <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-all">
                                                    {order.paymentStatus !== 'Paid' && (
                                                        <button onClick={() => handleMarkPaid(order.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Mark Paid">
                                                            <DollarSign size={14} />
                                                        </button>
                                                    )}
                                                    <Link to={`/admin/order/${order.id}`} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="View Details">
                                                        <Eye size={14} />
                                                    </Link>
                                                    <button onClick={() => generateInvoice(order)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Print Invoice">
                                                        <Printer size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Order"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminOrders;
