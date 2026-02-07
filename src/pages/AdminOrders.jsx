import React, { useEffect, useState } from 'react';
import { databases, auth as appwriteAuth } from '../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import {
    Eye, DollarSign, Edit2, Search, PlusCircle, Package, CreditCard, Clock, X, Save,
    User, MapPin, Loader2, Printer, Download, Filter, ArrowUpRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';
import { useStaticData } from '../context/StaticDataContext';
import { normalizeArabic } from '../utils/productUtils';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
    const AFFILIATES_COLLECTION = import.meta.env.VITE_APPWRITE_AFFILIATES_COLLECTION_ID || 'affiliates';
    const TRANSACTIONS_COLLECTION = import.meta.env.VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID || 'transactions';

    const fetchOrders = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.orderDesc('$createdAt'), Query.limit(100)]);
            setOrders(response.documents.map(doc => {
                let parsedCustomer = {};
                try {
                    parsedCustomer = doc.customerInfo ? (typeof doc.customerInfo === 'string' ? JSON.parse(doc.customerInfo) : doc.customerInfo) : {};
                } catch (e) {
                    console.warn("Failed to parse customer info");
                }
                return { id: doc.$id, ...doc, customer: parsedCustomer };
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, [DATABASE_ID]);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, orderId, { status: newStatus });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            toast.success(`Protocol updated to ${newStatus}`);

            // Affiliate commission logic if Delivered
            const targetOrder = orders.find(o => o.id === orderId);
            if (newStatus === 'Delivered' && targetOrder?.affiliateCode) {
                const affRes = await databases.listDocuments(DATABASE_ID, AFFILIATES_COLLECTION, [Query.equal('referralCode', targetOrder.affiliateCode)]);
                if (affRes.total > 0) {
                    const affDoc = affRes.documents[0];
                    const transRes = await databases.listDocuments(DATABASE_ID, TRANSACTIONS_COLLECTION, [Query.equal('orderId', orderId)]);
                    if (transRes.total === 0) {
                        const commission = Math.floor((targetOrder.subtotal || 0) * ((affDoc.commissionPercentage || 5) / 100));
                        await databases.createDocument(DATABASE_ID, TRANSACTIONS_COLLECTION, ID.unique(), {
                            type: 'commission', amount: targetOrder.subtotal, commission, orderId, affiliateId: affDoc.$id, orderNumber: String(targetOrder.orderNumber), status: 'Pending', createdAt: new Date().toISOString()
                        });
                        await databases.updateDocument(DATABASE_ID, AFFILIATES_COLLECTION, affDoc.$id, {
                            totalEarnings: (affDoc.totalEarnings || 0) + commission, referralCount: (affDoc.referralCount || 0) + 1
                        });
                    }
                }
            }
        } catch (error) {
            toast.error("Status sync failure");
        }
    };

    const handleMarkPaid = async (orderId) => {
        try {
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, orderId, { paymentStatus: 'Paid' });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: 'Paid' } : o));
            toast.success("Payment verified");
        } catch (error) {
            toast.error("Verification failed");
        }
    };

    const statusTabs = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    const filteredOrders = orders.filter(o => {
        const matchesTab = activeTab === 'All' || o.status === activeTab;
        const search = searchQuery.toLowerCase().trim();
        const matchesSearch = !search || String(o.orderNumber).includes(search) || o.customer?.name?.toLowerCase().includes(search) || o.customer?.phone?.includes(search);
        return matchesTab && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Logistics Center" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Order Registry</h2>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Oversight Feed: {orders.length} Active Protocols</p>
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
                        <button onClick={() => navigate('/admin/products/new')} className="admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10">
                            <PlusCircle size={14} /> New Order
                        </button>
                    </div>
                </div>

                <div className="admin-card-compact p-1.5 mb-6 overflow-x-auto">
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

                <div className="admin-card-compact overflow-hidden">
                    {loading ? (
                        <div className="p-16 text-center text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                            <p className="text-xs font-medium uppercase tracking-widest">Accessing Logs...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full admin-table-dense">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="text-left">Protocol ID</th>
                                        <th className="text-left">Consignee</th>
                                        <th className="text-left">Flow Type</th>
                                        <th className="text-center">Gross Revenue</th>
                                        <th className="text-center">Phase</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 group transition-all">
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-900">#{order.orderNumber}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{new Date(order.$createdAt).toLocaleDateString('en-GB')}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold uppercase">{order.customer?.name?.[0]}</div>
                                                    <div>
                                                        <h4 className="text-[12px] font-bold text-slate-800 leading-tight">{order.customer?.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">{order.customer?.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><CreditCard size={10} />{order.paymentMethod}</span>
                                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border w-fit ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{order.paymentStatus}</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className="text-sm font-bold text-slate-900 font-Cairo">{order.total?.toLocaleString()} EGP</span>
                                            </td>
                                            <td className="text-center">
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
                                            <td className="text-right">
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
