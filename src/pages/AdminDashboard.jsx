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
import { db } from '../firebase';
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
            <div className="min-h-screen bg-gray-50">
                <AdminHeader title="Dashboard" />
                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                                <div className="h-12 bg-gray-200 rounded mb-4"></div>
                                <div className="h-8 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-admin-bg pb-20 font-sans" style={{ backgroundColor: '#191c24', color: '#ffffff', minHeight: '100vh' }}>
            <AdminHeader title="Dashboard" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Quick Actions - Top Right Corner */}
                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="bg-admin-red hover:bg-admin-red-dark hover:scale-105 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-admin-red/40 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add New Product
                    </button>
                </div>

                {/* 1. Stats Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Revenue */}
                    <div className="bg-admin-card rounded-2xl p-6 shadow-admin border border-admin-border hover:border-admin-red/30 transition-all group" style={{ backgroundColor: '#191c24', border: '1px solid #2c2e33' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-admin-green/10 text-admin-green rounded-xl group-hover:scale-110 transition-transform">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <TrendingUp className="h-5 w-5 text-admin-green" />
                        </div>
                        <p className="text-[10px] font-black text-admin-text-secondary uppercase tracking-widest mb-1">Total Revenue</p>
                        <h3 className="text-2xl font-black text-white">
                            {stats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-admin-text-secondary">EGP</span>
                        </h3>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-admin-card rounded-2xl p-6 shadow-admin border border-admin-border hover:border-admin-red/30 transition-all group" style={{ backgroundColor: '#191c24', border: '1px solid #2c2e33' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-admin-blue/10 text-admin-blue rounded-xl group-hover:scale-110 transition-transform">
                                <ShoppingCart className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-admin-text-secondary uppercase tracking-widest mb-1">Total Orders</p>
                        <h3 className="text-2xl font-black text-white">{stats.totalOrders}</h3>
                    </div>

                    {/* Active Customers */}
                    <div className="bg-admin-card rounded-2xl p-6 shadow-admin border border-admin-border hover:border-admin-red/30 transition-all group" style={{ backgroundColor: '#191c24', border: '1px solid #2c2e33' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-admin-red/10 text-admin-red rounded-xl group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-admin-text-secondary uppercase tracking-widest mb-1">Active Customers</p>
                        <h3 className="text-2xl font-black text-white">{stats.activeCustomers}</h3>
                    </div>

                    {/* Products in Stock */}
                    <div className="bg-admin-card rounded-2xl p-6 shadow-admin border border-admin-border hover:border-admin-red/30 transition-all group" style={{ backgroundColor: '#191c24', border: '1px solid #2c2e33' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-admin-orange/10 text-admin-orange rounded-xl group-hover:scale-110 transition-transform">
                                <Package className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-admin-text-secondary uppercase tracking-widest mb-1">Products in Stock</p>
                        <h3 className="text-2xl font-black text-white">{stats.productsInStock}</h3>
                    </div>
                </div>

                {/* 2. Actionable Insights Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Pending Orders Card */}
                    <div className="bg-gradient-to-br from-[#1e1b4b] to-[#27293d] rounded-3xl p-8 shadow-admin border border-admin-orange/20" style={{ background: '#2a2e3a', backgroundColor: '#2a2e3a' }}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-admin-orange text-white rounded-2xl shadow-lg shadow-admin-orange/20">
                                <Clock className="h-8 w-8" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-admin-orange uppercase tracking-widest">Needs Attention</p>
                                <h3 className="text-4xl font-black text-white">{stats.pendingOrders}</h3>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-gray-400 mb-4">Pending orders require immediate processing</p>
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="bg-admin-orange hover:bg-admin-orange/90 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-admin-orange/20"
                        >
                            View Orders
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Low Stock Alert */}
                    <div className="bg-gradient-to-br from-[#2e1065] to-[#27293d] rounded-3xl p-8 shadow-admin border border-admin-red/20" style={{ background: '#2a2e3a', backgroundColor: '#2a2e3a' }}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-admin-red text-white rounded-2xl shadow-lg shadow-admin-red/20">
                                <AlertTriangle className="h-8 w-8" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-admin-red uppercase tracking-widest">Low Stock Alert</p>
                                <h3 className="text-4xl font-black text-white">{lowStockProducts.length}</h3>
                            </div>
                        </div>
                        <div className="space-y-2 mb-4">
                            {lowStockProducts.length === 0 ? (
                                <p className="text-sm font-bold text-gray-400 italic">All products are well-stocked!</p>
                            ) : (
                                lowStockProducts.map(product => (
                                    <div key={product.id} className="flex items-center justify-between bg-[#ffffff05] border border-[#ffffff0d] rounded-lg px-3 py-2">
                                        <span className="text-xs font-bold text-gray-300 truncate max-w-[200px]">{product.name}</span>
                                        <span className="text-[10px] font-black text-admin-red bg-admin-red/10 border border-admin-red/20 px-2 py-1 rounded">
                                            {product.stockQuantity || 0} left
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/admin/products')}
                            className="bg-admin-red hover:bg-admin-red/90 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-admin-red/20"
                        >
                            Manage Inventory
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* 3. Recent Orders Table */}
                <div className="bg-admin-card rounded-3xl shadow-admin border border-[#ffffff0d] overflow-hidden" style={{ backgroundColor: '#191c24', border: '1px solid #2c2e33' }}>
                    <div className="px-8 py-6 border-b border-[#ffffff0d] flex items-center justify-between">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Recent Orders</h3>
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="text-admin-accent hover:text-admin-accent/80 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
                        >
                            View All
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full" style={{ backgroundColor: '#191c24' }}>
                            <thead style={{ backgroundColor: '#000000' }}>
                                <tr className="bg-[#ffffff02]">
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ color: '#ffffff' }}>Order ID</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ color: '#ffffff' }}>Customer Name</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ color: '#ffffff' }}>Total</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ color: '#ffffff' }}>Status</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ color: '#ffffff' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ffffff05]">
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-12 text-center text-gray-500 font-bold italic">
                                            No orders found
                                        </td>
                                    </tr>
                                ) : (
                                    recentOrders.map(order => (
                                        <tr
                                            key={order.id}
                                            onClick={() => navigate(`/admin/order/${order.id}`)}
                                            className="hover:bg-[#ffffff05] transition-colors cursor-pointer"
                                        >
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-black text-white">#{order.id.slice(-6)}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-bold text-gray-300">{order.customer?.name || 'N/A'}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-black text-white">{order.total?.toLocaleString()} EGP</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full
                                                    ${order.status === 'Pending' ? 'bg-admin-orange/10 text-admin-orange border border-admin-orange/20' : ''}
                                                    ${order.status === 'Processing' ? 'bg-admin-blue/10 text-admin-blue border border-admin-blue/20' : ''}
                                                    ${order.status === 'Shipped' ? 'bg-admin-accent/10 text-admin-accent border border-admin-accent/20' : ''}
                                                    ${order.status === 'Delivered' ? 'bg-admin-green/10 text-admin-green border border-admin-green/20' : ''}
                                                    ${order.status === 'Cancelled' ? 'bg-admin-red/10 text-admin-red border border-admin-red/20' : ''}
                                                `}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-bold text-gray-500">
                                                    {order.createdAt?.seconds
                                                        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
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

export default AdminDashboard;
