import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    getCountFromServer
} from 'firebase/firestore';
import { db } from '../../firebase';
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
    Plus
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

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Parallel fetching for high-level stats (Targeted & Efficient)
            const [ordersCountSnap, usersCountSnap, recentOrdersSnap, lowStockSnap] = await Promise.all([
                getCountFromServer(collection(db, 'orders')),
                getCountFromServer(collection(db, 'users')),
                getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5))),
                getDocs(query(collection(db, 'products'), where('stockQuantity', '<', 5), limit(5)))
            ]);

            // 1. Basic Stats
            const totalOrders = ordersCountSnap.data().count;
            const activeCustomers = usersCountSnap.data().count;
            const productsInStock = isStaticLoaded ? staticProducts.length : 0;

            // 2. Recent Orders
            const recent = recentOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecentOrders(recent);

            // 3. Low Stock 
            const low = lowStockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLowStockProducts(low);

            // 4. Revenue & Pending (Approximation or focused query)
            // Note: For full historic revenue, a stats document or cloud function is best.
            // For now, we fetch pending orders only to get the count.
            const pendingQuery = query(collection(db, 'orders'), where('status', '==', 'Pending'), limit(50));
            const pendingSnap = await getDocs(pendingQuery);

            // Approximation for total revenue (fetching only last 100 orders for current context)
            const revenueQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
            const revenueSnap = await getDocs(revenueQuery);
            let revenue = 0;
            revenueSnap.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'Cancelled') {
                    revenue += data.total || 0;
                }
            });

            setStats({
                totalRevenue: revenue, // Last 100 orders revenue as proxy
                totalOrders,
                activeCustomers,
                productsInStock,
                pendingOrders: pendingSnap.size
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
        <div className="min-h-screen bg-admin-bg pb-20 font-sans">
            <AdminHeader title="Dashboard" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Quick Actions - Top Right Corner */}
                <div className="flex justify-end mb-8">
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="admin-primary-btn px-8 py-4 rounded-xl flex items-center gap-2"
                    >
                        <Plus className="h-4.5 w-4.5" />
                        Add New Product
                    </button>
                </div>

                {/* 1. Stats Cards Row - Unified Carbon Grey */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {/* Total Revenue */}
                    <div className="bg-white rounded-2xl p-7 flex flex-col gap-4 border border-admin-border shadow-sm hover:border-admin-accent/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-green-500/10 text-green-500 rounded-xl group-hover:scale-110 transition-transform">
                                <DollarSign className="h-7 w-7" />
                            </div>
                            <TrendingUp className="h-6 w-6 text-green-500" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Revenue</p>
                            <h3 className="text-3xl font-black text-black">
                                {stats.totalRevenue.toLocaleString()} <span className="text-sm font-bold text-gray-500">EGP</span>
                            </h3>
                        </div>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-white rounded-2xl p-7 flex flex-col gap-4 border border-admin-border shadow-sm hover:border-admin-accent/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                                <ShoppingCart className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Orders</p>
                            <h3 className="text-3xl font-black text-black">{stats.totalOrders}</h3>
                        </div>
                    </div>

                    {/* Active Customers */}
                    <div className="bg-white rounded-2xl p-7 flex flex-col gap-4 border border-admin-border shadow-sm hover:border-admin-accent/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-admin-red/10 text-admin-red rounded-xl group-hover:scale-110 transition-transform">
                                <Users className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Customers</p>
                            <h3 className="text-3xl font-black text-black">{stats.activeCustomers}</h3>
                        </div>
                    </div>

                    {/* Products in Stock */}
                    <div className="bg-white rounded-2xl p-7 flex flex-col gap-4 border border-admin-border shadow-sm hover:border-admin-accent/30 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="p-3.5 bg-orange-500/10 text-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                                <Package className="h-7 w-7" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Products in Stock</p>
                            <h3 className="text-3xl font-black text-black">{stats.productsInStock}</h3>
                        </div>
                    </div>
                </div>

                {/* 2. Actionable Insights - Premium Modern */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    <div className="bg-white rounded-[32px] p-10 shadow-sm border border-admin-accent/10 flex flex-col gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                            <Clock className="w-48 h-48" />
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="p-5 bg-admin-red text-white rounded-2xl shadow-xl shadow-admin-red/20 text-white">
                                <Clock className="h-10 w-10" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[11px] font-black text-admin-red uppercase tracking-widest">Needs Attention</p>
                                <h3 className="text-5xl font-black text-black">{stats.pendingOrders}</h3>
                            </div>
                        </div>
                        <p className="text-base font-medium text-gray-500 max-w-sm">There are currently {stats.pendingOrders} pending orders awaiting your immediate processing.</p>
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="admin-primary-btn !w-fit !px-8"
                        >
                            Process Orders
                            <ArrowRight className="h-4.5 w-4.5" />
                        </button>
                    </div>

                    <div className="bg-white rounded-[32px] p-10 shadow-sm border border-admin-red/10 flex flex-col gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                            <AlertTriangle className="w-48 h-48" />
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="p-5 bg-admin-red text-white rounded-2xl shadow-xl shadow-admin-red/20 text-white">
                                <AlertTriangle className="h-10 w-10" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[11px] font-black text-admin-red uppercase tracking-widest">Stock Alert</p>
                                <h3 className="text-5xl font-black text-black">{lowStockProducts.length}</h3>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            {lowStockProducts.length === 0 ? (
                                <p className="text-base font-medium text-gray-500">Excellent! All your products are currently well-stocked.</p>
                            ) : (
                                lowStockProducts.map(product => (
                                    <div key={product.id} className="flex items-center justify-between bg-gray-50 border border-admin-border rounded-xl px-4 py-3">
                                        <span className="text-sm font-bold text-black truncate max-w-[240px]">{product.name}</span>
                                        <span className="text-[10px] font-black text-admin-red bg-admin-red/10 border border-admin-red/20 px-3 py-1.5 rounded-full">
                                            {product.stockQuantity || 0} UNITS LEFT
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/admin/products')}
                            className="admin-primary-btn !w-fit !px-8"
                        >
                            Manage Stock
                            <ArrowRight className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>

                {/* 3. Recent Orders Table - High Contrast */}
                <div className="bg-white rounded-3xl shadow-sm border border-admin-border overflow-hidden">
                    <div className="px-10 py-8 border-b border-admin-border flex items-center justify-between">
                        <h3 className="text-xl font-black text-black uppercase tracking-tight">Recent Orders</h3>
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="text-admin-red hover:text-admin-red-dark font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-colors"
                        >
                            View Order Log
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-admin-border">ID</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-admin-border">Client</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-admin-border">Revenue</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-admin-border">Phase</th>
                                    <th className="px-10 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-admin-border">Timestamp</th>
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
                                            className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-black text-black group-hover:text-admin-red transition-colors">#{order.id.slice(-6).toUpperCase()}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-bold text-gray-500">{order.customer?.name || 'GUEST USER'}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-black text-black">{order.total?.toLocaleString()} EGP</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-full border
                                                    ${order.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : ''}
                                                    ${order.status === 'Processing' ? 'bg-blue-50 text-blue-600 border-blue-100' : ''}
                                                    ${order.status === 'Shipped' ? 'bg-purple-50 text-purple-600 border-purple-100' : ''}
                                                    ${order.status === 'Delivered' ? 'bg-green-50 text-green-600 border-green-100' : ''}
                                                    ${order.status === 'Cancelled' ? 'bg-red-50 text-admin-red border-red-100' : ''}
                                                `}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-bold text-gray-400">
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
