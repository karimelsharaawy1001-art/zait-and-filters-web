import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases } from '../../appwrite';
import { Query } from 'appwrite';
import { useStaticData } from '../../context/StaticDataContext';
import {
    DollarSign,
    ShoppingCart,
    Users,
    Package,
    Clock,
    AlertTriangle,
    TrendingUp,
    ArrowRight,
    Plus,
    Loader2
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const Dashboard = () => {
    const navigate = useNavigate();
    const { staticProducts, isStaticLoaded } = useStaticData();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        activeCustomers: 0,
        productsInStock: 0,
        pendingOrders: 0
    });
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';
    const USERS_COLLECTION = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || 'users';

    const fetchDashboardData = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const [ordersRes, usersRes, recentRes, lowStockRes, pendingRes] = await Promise.all([
                databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.limit(1)]),
                databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [Query.limit(1)]),
                databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.orderDesc('$createdAt'), Query.limit(5)]),
                databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [Query.lessThan('stock', 5), Query.limit(5)]),
                databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.equal('status', 'Pending'), Query.limit(1)])
            ]);

            // Proxy for revenue: Fetch last 100 orders and sum
            const revenueRes = await databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            let revenue = 0;
            revenueRes.documents.forEach(doc => {
                if (doc.status !== 'Cancelled') revenue += (doc.total || 0);
            });

            setRecentOrders(recentRes.documents.map(d => ({ id: d.$id, ...d })));
            setLowStockProducts(lowStockRes.documents.map(d => ({ id: d.$id, ...d })));

            setStats({
                totalRevenue: revenue,
                totalOrders: ordersRes.total,
                activeCustomers: usersRes.total,
                productsInStock: isStaticLoaded ? staticProducts.length : 0,
                pendingOrders: pendingRes.total
            });
        } catch (error) {
            console.error("Dashboard Sync Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [DATABASE_ID, isStaticLoaded, staticProducts.length]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4 font-Cairo">
            <Loader2 className="animate-spin text-black w-12 h-12" />
            <p className="font-black uppercase text-[10px] tracking-widest text-gray-400">Synchronizing Control Center...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Operations Overview" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Telemetry Feed</h2>
                    <button onClick={() => navigate('/admin/products/new')} className="admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10">
                        <Plus size={14} /> New Product
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="admin-card-compact p-5 group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <DollarSign size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12.5%</span>
                        </div>
                        <p className="admin-text-subtle">Revenue (Last 100)</p>
                        <h3 className="text-xl font-bold mt-1 text-slate-900">{stats.totalRevenue.toLocaleString()} <span className="text-xs font-medium text-slate-400">EGP</span></h3>
                    </div>
                    <div className="admin-card-compact p-5 group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <ShoppingCart size={20} />
                            </div>
                        </div>
                        <p className="admin-text-subtle">Total Orders</p>
                        <h3 className="text-xl font-bold mt-1 text-slate-900">{stats.totalOrders}</h3>
                    </div>
                    <div className="admin-card-compact p-5 group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Users size={20} />
                            </div>
                        </div>
                        <p className="admin-text-subtle">Total Customers</p>
                        <h3 className="text-xl font-bold mt-1 text-slate-900">{stats.activeCustomers}</h3>
                    </div>
                    <div className="admin-card-compact p-5 group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all">
                                <Package size={20} />
                            </div>
                        </div>
                        <p className="admin-text-subtle">Stock Units</p>
                        <h3 className="text-xl font-bold mt-1 text-slate-900">{stats.productsInStock}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-900 rounded-2xl p-8 shadow-xl relative overflow-hidden group">
                        <Clock className="absolute -right-8 -bottom-8 opacity-5 w-48 h-48 group-hover:scale-110 transition-transform" />
                        <div className="relative">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">Pending Operations</h4>
                            <div className="flex items-baseline gap-2 mb-4">
                                <h3 className="text-5xl font-bold text-white tracking-tighter">{stats.pendingOrders}</h3>
                                <p className="text-[11px] font-bold uppercase text-emerald-500">Awaiting Process</p>
                            </div>
                            <p className="text-slate-400 text-xs font-medium mb-6 max-w-[240px]">Critical items detected in the order queue. Immediate protocol required.</p>
                            <button onClick={() => navigate('/admin/orders')} className="bg-white text-slate-900 px-6 py-2.5 rounded-lg font-bold uppercase text-[10px] tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2">
                                Access Queue <ArrowRight size={12} />
                            </button>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden group">
                        <AlertTriangle className="absolute -right-8 -bottom-8 text-amber-500/10 w-48 h-48 group-hover:scale-110 transition-transform" />
                        <div className="relative">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">Inventory Alarms</h4>
                            <div className="flex items-baseline gap-2 mb-4">
                                <h3 className="text-5xl font-bold text-slate-900 tracking-tighter">{lowStockProducts.length}</h3>
                                <p className="text-[11px] font-bold uppercase text-amber-600">Stock Alerts</p>
                            </div>
                            <div className="space-y-1.5 mb-6 max-w-sm">
                                {lowStockProducts.slice(0, 3).map(p => (
                                    <div key={p.id} className="bg-slate-50 px-3 py-1.5 rounded-lg flex justify-between items-center text-[11px] font-bold text-slate-600">
                                        <span className="truncate">{p.name || p.nameAr}</span>
                                        <span className="text-amber-600 bg-amber-50 px-2 rounded-md">{p.stock} UNIT</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/admin/products')} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold uppercase text-[10px] tracking-wider hover:bg-slate-800 transition-all flex items-center gap-2">
                                Inventory Audit <ArrowRight size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="admin-card-compact overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Live operational log</p>
                        </div>
                        <button onClick={() => navigate('/admin/orders')} className="text-emerald-600 font-bold uppercase text-[10px] hover:text-emerald-700 transition-all flex items-center gap-1.5">
                            Full Database <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full admin-table-dense">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="text-left">ID</th>
                                    <th className="text-left">Customer</th>
                                    <th className="text-left">Revenue</th>
                                    <th className="text-left">Status</th>
                                    <th className="text-left text-right">Timeline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentOrders.map(order => (
                                    <tr key={order.id} onClick={() => navigate(`/admin/order/${order.id}`)} className="hover:bg-slate-50/50 cursor-pointer transition-all">
                                        <td><span className="text-[11px] font-bold text-slate-900">#{order.id.slice(-6).toUpperCase()}</span></td>
                                        <td className="text-[12px] font-medium text-slate-600">{order.customer?.name || 'GUEST USER'}</td>
                                        <td className="text-[12px] font-bold text-slate-900">{order.total?.toLocaleString()} EGP</td>
                                        <td>
                                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase border ${order.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="text-right text-[11px] font-medium text-slate-400">{new Date(order.$createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
