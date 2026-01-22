import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    DollarSign,
    ShoppingCart,
    Users,
    Package,
    Clock,
    AlertTriangle,
    TrendingUp,
    ArrowRight,
    Plus
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const Dashboard = () => {
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

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Parallel fetching for efficiency
            const [ordersSnap, usersSnap, productsSnap] = await Promise.all([
                getDocs(collection(db, 'orders')),
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'products'))
            ]);

            // 1. Calculate Total Revenue (exclude cancelled orders)
            let revenue = 0;
            let pendingCount = 0;
            const ordersList = [];

            ordersSnap.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                ordersList.push(order);

                if (order.status !== 'Cancelled') {
                    revenue += order.total || 0;
                }

                if (order.status === 'Pending') {
                    pendingCount++;
                }
            });

            // 2. Count Active Customers
            const customersCount = usersSnap.size;

            // 3. Count Products in Stock
            const productsCount = productsSnap.size;

            // 4. Find Low Stock Products (stockQuantity < 5)
            const lowStock = [];
            productsSnap.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                if ((product.stockQuantity || 0) < 5) {
                    lowStock.push(product);
                }
            });

            // Sort low stock by quantity (ascending) and take top 5
            lowStock.sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0));
            setLowStockProducts(lowStock.slice(0, 5));

            // 5. Get Recent Orders (last 5, sorted by date desc)
            const sortedOrders = ordersList.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            setRecentOrders(sortedOrders.slice(0, 5));

            // Update stats
            setStats({
                totalRevenue: revenue,
                totalOrders: ordersSnap.size,
                activeCustomers: customersCount,
                productsInStock: productsCount,
                pendingOrders: pendingCount
            });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-admin-bg pb-20 font-sans">
                <AdminHeader title="Dashboard" />
                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center min-h-[400px] flex-col gap-4">
                        <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Synchronizing control panel...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-matte-black pb-20 font-sans">
            <AdminHeader title="Dashboard" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Quick Actions - Top Right Corner */}
                <div className="flex justify-end mb-8">
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="bg-racing-red hover:bg-racing-red-dark hover:scale-105 text-snow-white font-black text-[11px] uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-xl shadow-racing-red/20 flex items-center gap-2"
                    >
                        <Plus className="h-4.5 w-4.5" />
                        Add New Product
                    </button>
                </div>

                {/* 1. Stats Cards Row - Unified Carbon Grey */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {/* Total Revenue */}
                    <div className="bg-carbon-grey rounded-2xl p-7 flex flex-col gap-4 border border-border-dark shadow-premium-3d hover:border-racing-red/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-green-500/10 text-green-500 rounded-xl group-hover:scale-110 transition-transform">
                                <DollarSign className="h-7 w-7" />
                            </div>
                            <TrendingUp className="h-6 w-6 text-green-500" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-dim-grey uppercase tracking-widest">Total Revenue</p>
                            <h3 className="text-3xl font-black text-snow-white">
                                {stats.totalRevenue.toLocaleString()} <span className="text-sm font-bold text-silver-grey">EGP</span>
                            </h3>
                        </div>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-carbon-grey rounded-2xl p-7 flex flex-col gap-4 border border-border-dark shadow-premium-3d hover:border-racing-red/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                                <ShoppingCart className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-dim-grey uppercase tracking-widest">Total Orders</p>
                            <h3 className="text-3xl font-black text-snow-white">{stats.totalOrders}</h3>
                        </div>
                    </div>

                    {/* Active Customers */}
                    <div className="bg-carbon-grey rounded-2xl p-7 flex flex-col gap-4 border border-border-dark shadow-premium-3d hover:border-racing-red/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-racing-red/10 text-racing-red rounded-xl group-hover:scale-110 transition-transform">
                                <Users className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-dim-grey uppercase tracking-widest">Active Customers</p>
                            <h3 className="text-3xl font-black text-snow-white">{stats.activeCustomers}</h3>
                        </div>
                    </div>

                    {/* Products in Stock */}
                    <div className="bg-carbon-grey rounded-2xl p-7 flex flex-col gap-4 border border-border-dark shadow-premium-3d hover:border-racing-red/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-orange-500/10 text-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                                <Package className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-dim-grey uppercase tracking-widest">Products in Stock</p>
                            <h3 className="text-3xl font-black text-snow-white">{stats.productsInStock}</h3>
                        </div>
                    </div>
                </div>

                {/* 2. Actionable Insights - Premium Modern */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    <div className="bg-carbon-grey rounded-[32px] p-10 shadow-premium-3d border border-orange-500/10 flex flex-col gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                            <Clock className="w-48 h-48" />
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="p-5 bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-500/20">
                                <Clock className="h-10 w-10" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest">Needs Attention</p>
                                <h3 className="text-5xl font-black text-snow-white">{stats.pendingOrders}</h3>
                            </div>
                        </div>
                        <p className="text-base font-medium text-silver-grey max-w-sm">There are currently {stats.pendingOrders} pending orders awaiting your immediate processing.</p>
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl transition-all flex items-center gap-3 w-fit shadow-lg shadow-orange-500/20"
                        >
                            Process Orders
                            <ArrowRight className="h-4.5 w-4.5" />
                        </button>
                    </div>

                    <div className="bg-carbon-grey rounded-[32px] p-10 shadow-premium-3d border border-racing-red/10 flex flex-col gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                            <AlertTriangle className="w-48 h-48" />
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="p-5 bg-racing-red text-white rounded-2xl shadow-xl shadow-racing-red/20">
                                <AlertTriangle className="h-10 w-10" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[11px] font-black text-racing-red uppercase tracking-widest">Stock Alert</p>
                                <h3 className="text-5xl font-black text-snow-white">{lowStockProducts.length}</h3>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            {lowStockProducts.length === 0 ? (
                                <p className="text-base font-medium text-silver-grey">Excellent! All your products are currently well-stocked.</p>
                            ) : (
                                lowStockProducts.map(product => (
                                    <div key={product.id} className="flex items-center justify-between bg-white/[0.03] border border-border-dark rounded-xl px-4 py-3">
                                        <span className="text-sm font-bold text-snow-white truncate max-w-[240px]">{product.name}</span>
                                        <span className="text-[10px] font-black text-racing-red bg-racing-red/10 border border-racing-red/20 px-3 py-1.5 rounded-full">
                                            {product.stockQuantity || 0} UNITS LEFT
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/admin/products')}
                            className="bg-racing-red hover:bg-racing-red-dark text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl transition-all flex items-center gap-3 w-fit shadow-lg shadow-racing-red/20"
                        >
                            Manage Stock
                            <ArrowRight className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>

                {/* 3. Recent Orders Table - High Contrast */}
                <div className="bg-carbon-grey rounded-3xl shadow-premium-3d border border-border-dark overflow-hidden">
                    <div className="px-10 py-8 border-b border-border-dark flex items-center justify-between">
                        <h3 className="text-xl font-black text-snow-white uppercase tracking-tight">Recent Orders</h3>
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="text-racing-red hover:text-racing-red-dark font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-colors"
                        >
                            View Order Log
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-matte-black/40">
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">ID</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Client</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Revenue</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Phase</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark/50">
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-10 py-20 text-center text-silver-grey font-bold italic opacity-40 capitalize">
                                            System quiet... No recent transaction activity.
                                        </td>
                                    </tr>
                                ) : (
                                    recentOrders.map(order => (
                                        <tr
                                            key={order.id}
                                            onClick={() => navigate(`/admin/order/${order.id}`)}
                                            className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                        >
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-black text-snow-white group-hover:text-racing-red transition-colors">#{order.id.slice(-6).toUpperCase()}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-bold text-silver-grey">{order.customer?.name || 'GUEST USER'}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-black text-snow-white">{order.total?.toLocaleString()} EGP</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-full border
                                                    ${order.status === 'Pending' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : ''}
                                                    ${order.status === 'Processing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                                                    ${order.status === 'Shipped' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : ''}
                                                    ${order.status === 'Delivered' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
                                                    ${order.status === 'Cancelled' ? 'bg-racing-red/10 text-racing-red border-racing-red/20' : ''}
                                                `}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-bold text-dim-grey">
                                                    {order.createdAt?.seconds
                                                        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB')
                                                        : 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
