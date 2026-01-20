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
        { name: 'Policy Pages', icon: <FileText className="w-5 h-5" />, path: '/admin/policies' },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-200">
                            <Box className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">Z&F Admin</h2>
                            <p className="text-xs text-gray-500">Management Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                                ${isActive
                                    ? 'bg-orange-50 text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-colors ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                            {item.icon}
                                        </span>
                                        <span className="font-medium">{item.name}</span>
                                        {item.name === 'Messages' && unreadCount > 0 && (
                                            <span className="ml-auto bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-red-200">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    {item.name !== 'Messages' && (
                                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200 font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>

                    <div className="mt-4 px-4 py-3 bg-gray-50 rounded-xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">Administrator</p>
                            <p className="text-[10px] text-gray-500 truncate">{auth.currentUser?.email}</p>
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
