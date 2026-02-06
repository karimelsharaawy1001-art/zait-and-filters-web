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
                databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [Query.lessThan('stockQuantity', 5), Query.limit(5)]),
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
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Dashboard" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-end mb-8">
                    <button onClick={() => navigate('/admin/products/new')} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"><Plus size={18} /> New Product</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-7 rounded-3xl border shadow-sm group">
                        <div className="flex justify-between mb-4"><div className="p-3.5 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all"><DollarSign size={28} /></div><TrendingUp className="text-green-600" /></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue (Last 100)</p>
                        <h3 className="text-3xl font-black mt-1">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-bold text-gray-400">EGP</span></h3>
                    </div>
                    <div className="bg-white p-7 rounded-3xl border shadow-sm group">
                        <div className="flex justify-between mb-4"><div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all"><ShoppingCart size={28} /></div></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Orders</p>
                        <h3 className="text-3xl font-black mt-1">{stats.totalOrders}</h3>
                    </div>
                    <div className="bg-white p-7 rounded-3xl border shadow-sm group">
                        <div className="flex justify-between mb-4"><div className="p-3.5 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all"><Users size={28} /></div></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Digital Citizens</p>
                        <h3 className="text-3xl font-black mt-1">{stats.activeCustomers}</h3>
                    </div>
                    <div className="bg-white p-7 rounded-3xl border shadow-sm group">
                        <div className="flex justify-between mb-4"><div className="p-3.5 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-all"><Package size={28} /></div></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Stock</p>
                        <h3 className="text-3xl font-black mt-1">{stats.productsInStock}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 text-white">
                    <div className="bg-black rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                        <Clock className="absolute right-0 bottom-0 opacity-10 w-64 h-64 -mb-10 -mr-10 group-hover:scale-110 transition-transform" />
                        <div className="relative">
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Manifest Queue</h4>
                            <div className="flex items-end gap-2 mb-6"><h3 className="text-7xl font-black italic">{stats.pendingOrders}</h3><p className="text-sm font-black uppercase opacity-60 mb-2">Pending</p></div>
                            <p className="text-white/60 font-bold mb-8 max-w-xs">Critical threshold detected in order queue. Immediate processing required.</p>
                            <button onClick={() => navigate('/admin/orders')} className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase italic text-xs hover:scale-105 transition-all flex items-center gap-2">Protocol Access <ArrowRight size={14} /></button>
                        </div>
                    </div>
                    <div className="bg-red-600 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                        <AlertTriangle className="absolute right-0 bottom-0 opacity-10 w-64 h-64 -mb-10 -mr-10 group-hover:scale-110 transition-transform" />
                        <div className="relative">
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Stock Alarm</h4>
                            <div className="flex items-end gap-2 mb-6"><h3 className="text-7xl font-black italic">{lowStockProducts.length}</h3><p className="text-sm font-black uppercase opacity-60 mb-2">Critical</p></div>
                            <div className="space-y-2 mb-8">
                                {lowStockProducts.map(p => (
                                    <div key={p.id} className="bg-white/10 p-3 rounded-xl flex justify-between items-center text-xs font-black uppercase italic">
                                        <span className="truncate">{p.name || p.nameEn}</span><span className="bg-white text-red-600 px-2 rounded-lg">{p.stockQuantity} UNIT</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/admin/products')} className="bg-white text-red-600 px-10 py-4 rounded-2xl font-black uppercase italic text-xs hover:scale-105 transition-all flex items-center gap-2">Stock Analysis <ArrowRight size={14} /></button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden text-gray-900">
                    <div className="p-10 border-b flex justify-between items-center bg-gray-50/50">
                        <div><h3 className="text-xl font-black uppercase italic">Recent Transactions</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Live telemetry log</p></div>
                        <button onClick={() => navigate('/admin/orders')} className="text-black font-black uppercase text-[10px] hover:text-red-600 transition-all flex items-center gap-2">Full Database <ArrowRight size={14} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 text-left">
                                <tr>
                                    <th className="px-10 py-6">ID</th><th className="px-10 py-6">Identity</th><th className="px-10 py-6">Revenue</th><th className="px-10 py-6">Phase</th><th className="px-10 py-6">Timeline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {recentOrders.map(order => (
                                    <tr key={order.id} onClick={() => navigate(`/admin/order/${order.id}`)} className="hover:bg-gray-50 cursor-pointer group transition-all">
                                        <td className="px-10 py-6"><span className="text-sm font-black group-hover:text-red-600">#{order.id.slice(-6).toUpperCase()}</span></td>
                                        <td className="px-10 py-6 font-bold text-gray-500 uppercase">{order.customer?.name || 'GUEST USER'}</td>
                                        <td className="px-10 py-6 font-black">{order.total?.toLocaleString()} EGP</td>
                                        <td className="px-10 py-6">
                                            <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase border ${order.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{order.status}</span>
                                        </td>
                                        <td className="px-10 py-6 font-bold text-gray-400">{new Date(order.$createdAt).toLocaleDateString()}</td>
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
