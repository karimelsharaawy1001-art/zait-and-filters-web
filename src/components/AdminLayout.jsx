import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Box,
    ShoppingBag,
    FolderTree,
    Car,
    LogOut,
    Settings,
    ChevronRight,
    Award,
    CreditCard,
    FileText,
    Truck,
    Ticket,
    Users,
    Star,
    Inbox
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';

const AdminLayout = () => {
    const navigate = useNavigate();

    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

    useEffect(() => {
        const q = query(
            collection(db, 'contact_messages'),
            where('status', '==', 'Unread')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(
            collection(db, 'reviews'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingReviewsCount(snapshot.size);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/admin/login');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const navItems = [
        { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin/dashboard' },
        { name: 'Products', icon: <Box className="w-5 h-5" />, path: '/admin/products' },
        { name: 'Orders', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/orders' },
        { name: 'Abandoned Carts', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/abandoned-carts' },
        { name: 'Messages', icon: <Inbox className="w-5 h-5" />, path: '/admin/messages' },
        { name: 'Categories', icon: <FolderTree className="w-5 h-5" />, path: '/admin/categories' },
        { name: 'Reviews', icon: <Star className="w-5 h-5" />, path: '/admin/reviews' },
        { name: 'Car Specs', icon: <Settings className="w-5 h-5" />, path: '/admin/car-specs' },
        { name: 'Cars', icon: <Car className="w-5 h-5" />, path: '/admin/cars' },
        { name: 'Hero Slider', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin/hero' },
        { name: 'Brands', icon: <Award className="w-5 h-5" />, path: '/admin/brands' },
        { name: 'Payment Partners', icon: <CreditCard className="w-5 h-5" />, path: '/admin/payments-manager' },
        { name: 'Payment Methods', icon: <CreditCard className="w-5 h-5" />, path: '/admin/payments' },
        { name: 'General Settings', icon: <Settings className="w-5 h-5" />, path: '/admin/settings' },
        { name: 'Shipping Rates', icon: <Truck className="w-5 h-5" />, path: '/admin/shipping' },
        { name: 'Promo Codes', icon: <Ticket className="w-5 h-5" />, path: '/admin/promo-codes' },
        { name: 'Affiliates', icon: <Users className="w-5 h-5" />, path: '/admin/affiliates' },
        { name: 'Integrations', icon: <Settings className="w-5 h-5" />, path: '/admin/integrations' },
        { name: 'Policy Pages', icon: <FileText className="w-5 h-5" />, path: '/admin/policies' },
    ];

    return (
        <div className="admin-theme-container flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* Sidebar - Clean White Style */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-sm z-40">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#28B463] rounded-lg flex items-center justify-center shadow-lg shadow-[#28B463]/20">
                            <Box className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-black leading-tight tracking-tight">Z&F Admin</h2>
                            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-[0.2em]">Management</p>
                        </div>
                    </div>
                    <div className="mt-6 border-b border-gray-100"></div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-2 scrollbar-thin scrollbar-thumb-[#28B463]/20">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group
                                ${isActive
                                    ? 'bg-[#28B463]/10 text-[#28B463] shadow-sm transform translate-x-1'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-black'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-all duration-300 ${isActive ? 'text-[#28B463] scale-110' : 'text-gray-400 group-hover:text-black group-hover:scale-110'}`}>
                                            {item.icon}
                                        </span>
                                        <span className={`text-sm font-semibold tracking-wide transition-all ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                                            {item.name}
                                        </span>
                                        {item.name === 'Messages' && unreadCount > 0 && (
                                            <span className="ml-auto bg-[#28B463] text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm border border-white/20">
                                                {unreadCount}
                                            </span>
                                        )}
                                        {item.name === 'Reviews' && pendingReviewsCount > 0 && (
                                            <span className="ml-auto bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm border border-white/20">
                                                {pendingReviewsCount}
                                            </span>
                                        )}
                                    </div>
                                    {isActive && (
                                        <div className="w-1 h-5 bg-[#28B463] rounded-full"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 mt-auto bg-gray-50/50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[#28B463] hover:bg-green-50 rounded-xl transition-all duration-300 font-bold text-sm group"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span>Logout</span>
                    </button>

                    <div className="mt-4 px-4 py-3 bg-white rounded-2xl flex items-center gap-3 border border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-[#28B463] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-[#28B463]/20">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-black truncate">Administrator</p>
                            <p className="text-[10px] text-gray-500 truncate font-medium">{auth.currentUser?.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
