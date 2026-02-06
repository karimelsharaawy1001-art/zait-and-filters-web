import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases } from '../appwrite';
import { Query } from 'appwrite';
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
import AdminHeader from '../components/AdminHeader';

const AdminDashboard = () => {
    const navigate = useNavigate();
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
    const ORDERS_COLLECTION = 'orders';
    const USERS_COLLECTION = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID;

    useEffect(() => {
        fetchDashboardData();
    }, [DATABASE_ID]);

    const fetchDashboardData = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            // Parallel fetching using listDocuments
            const [ordersRes, usersRes, productsRes] = await Promise.all([
                databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.limit(100), Query.orderDesc('$createdAt')]),
                databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [Query.limit(1)]),
                databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [Query.limit(100)])
            ]);

            // 1. Calculate Revenue and Pending from recent batch
            let revenue = 0;
            let pendingCount = 0;
            ordersRes.documents.forEach(order => {
                if (order.status !== 'Cancelled') revenue += order.total || 0;
                if (order.status === 'Pending') pendingCount++;
            });

            // 2. Low Stock Logic
            const lowStock = productsRes.documents
                .filter(p => (p.stockQuantity || 0) < 5)
                .sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0))
                .slice(0, 5);
            setLowStockProducts(lowStock);

            // 3. Recent Orders
            setRecentOrders(ordersRes.documents.slice(0, 5).map(d => ({ id: d.$id, ...d })));

            // Update stats
            setStats({
                totalRevenue: revenue,
                totalOrders: ordersRes.total,
                activeCustomers: usersRes.total,
                productsInStock: productsRes.total,
                pendingOrders: pendingCount
            });
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AdminHeader title="Dashboard" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Dashboard" />

            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> Add New Product
                    </button>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Total Revenue', value: `${stats.totalRevenue.toLocaleString()} EGP`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
                        { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
                        { label: 'Active Customers', value: stats.activeCustomers, icon: Users, color: 'bg-red-50 text-red-600' },
                        { label: 'Products In Catalog', value: stats.productsInStock, icon: Package, color: 'bg-orange-50 text-orange-600' },
                    ].map((card, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-orange-200 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-xl ${card.color}`}><card.icon className="h-6 w-6" /></div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                            <h3 className="text-2xl font-black text-black">{card.value}</h3>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Activity Feed */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black uppercase italic">Recent Orders</h3>
                            <button onClick={() => navigate('/admin/orders')} className="text-orange-600 font-bold text-xs uppercase">View All</button>
                        </div>
                        <div className="space-y-4">
                            {recentOrders.map(order => (
                                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-sm font-black">#{order.id.slice(-6).toUpperCase()}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{order.customer?.name || 'Guest User'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black">{order.total} EGP</p>
                                        <span className="text-[9px] font-black uppercase text-orange-600">{order.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alerts */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-red-100">
                        <h3 className="text-lg font-black uppercase italic mb-6 text-red-600">Inventory Alerts</h3>
                        <div className="space-y-3">
                            {lowStockProducts.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                    <span className="text-xs font-bold truncate max-w-[200px]">{p.name}</span>
                                    <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-1 rounded">{p.stockQuantity || 0} left</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
