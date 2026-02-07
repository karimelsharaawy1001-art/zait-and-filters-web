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
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Logistics Center" />
            <main className="max-w-full mx-auto py-8 px-4 md:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Order Registry</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Operational Oversight: {orders.length} Active Protocols</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 p-4 bg-white border rounded-2xl font-black italic shadow-sm focus:ring-2 focus:ring-black outline-none transition-all" placeholder="Search Matrix..." />
                        </div>
                        <button onClick={() => navigate('/admin/products/new')} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase italic shadow-2xl flex items-center gap-2 hover:scale-105 transition-all"><PlusCircle size={20} /> New Order</button>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-3xl border shadow-sm mb-10 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {statusTabs.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-4 rounded-2xl font-black uppercase italic text-xs transition-all ${activeTab === tab ? 'bg-red-600 text-white shadow-xl translate-y-[-2px]' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                {tab} <span className="ml-2 opacity-50 text-[10px]">{orders.filter(o => tab === 'All' || o.status === tab).length}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
                    {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div> : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-8 py-6">Protocol ID</th>
                                    <th className="px-8 py-6">Consignee</th>
                                    <th className="px-8 py-6">Flow Type</th>
                                    <th className="px-8 py-6 text-center">Gross Revenue</th>
                                    <th className="px-8 py-6 text-center">Phase</th>
                                    <th className="px-8 py-6 text-right">Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 group transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-lg font-black italic tracking-wider">#{order.orderNumber}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(order.$createdAt).toLocaleDateString('en-GB')}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black">{order.customer?.name?.[0]}</div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase italic">{order.customer?.name}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{order.customer?.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="inline-flex flex-col">
                                                <span className="text-[11px] font-black uppercase text-gray-500 flex items-center gap-1"><CreditCard size={12} />{order.paymentMethod}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mt-2 w-fit ${order.paymentStatus === 'Paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{order.paymentStatus}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-block px-5 py-2 bg-black text-white rounded-2xl font-black italic text-lg shadow-lg">{order.total?.toLocaleString()}<span className="text-[10px] ml-1 opacity-50 not-italic">EGP</span></div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)} className={`text-[10px] font-black uppercase italic px-6 py-3 rounded-2xl border-2 shadow-sm transition-all outline-none ${order.status === 'Delivered' ? 'bg-green-50 text-green-600 border-green-200' :
                                                order.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    order.status === 'Processing' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                        'bg-orange-50 text-orange-600 border-orange-200'
                                                }`}>
                                                {statusTabs.map(s => s !== 'All' && <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                                {order.paymentStatus !== 'Paid' && <button onClick={() => handleMarkPaid(order.id)} className="p-3 bg-white text-green-600 border rounded-xl shadow-xl hover:bg-green-600 hover:text-white transition-all"><DollarSign size={18} /></button>}
                                                <Link to={`/admin/order/${order.id}`} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Eye size={18} /></Link>
                                                <button onClick={() => generateInvoice(order)} className="p-3 bg-white text-orange-600 border rounded-xl shadow-xl hover:bg-orange-600 hover:text-white transition-all"><Printer size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminOrders;
