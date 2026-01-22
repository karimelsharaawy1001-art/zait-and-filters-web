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
        <div className="flex h-screen bg-matte-black font-sans overflow-hidden">
            {/* Unified Dark Sidebar */}
            <aside className="w-64 bg-carbon-grey border-r border-border-dark flex flex-col flex-shrink-0 shadow-2xl">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-racing-red rounded-lg flex items-center justify-center shadow-lg shadow-racing-red/20">
                            <Box className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-snow-white leading-tight tracking-tight">Z&F Admin</h2>
                            <p className="text-[10px] uppercase font-bold text-silver-grey tracking-[0.2em] opacity-80">Management</p>
                        </div>
                    </div>
                    <div className="mt-6 border-b border-border-dark opacity-30"></div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-2 scrollbar-thin scrollbar-thumb-racing-red/20">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group
                                ${isActive
                                    ? 'bg-racing-red text-snow-white shadow-lg shadow-racing-red/20 transform translate-x-1'
                                    : 'text-silver-grey hover:bg-snow-white/[0.04] hover:text-snow-white'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-all duration-300 ${isActive ? 'text-snow-white scale-110' : 'text-dim-grey group-hover:text-silver-grey group-hover:scale-110'}`}>
                                            {item.icon}
                                        </span>
                                        <span className={`text-sm font-semibold tracking-wide transition-all ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                                            {item.name}
                                        </span>
                                        {item.name === 'Messages' && unreadCount > 0 && (
                                            <span className="ml-auto bg-racing-red text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm border border-white/20">
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
                                        <div className="w-1 h-5 bg-white rounded-full"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-border-dark mt-auto bg-matte-black/20">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-racing-red hover:bg-racing-red/10 rounded-xl transition-all duration-300 font-bold text-sm group"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span>Logout</span>
                    </button>

                    <div className="mt-4 px-4 py-3 bg-matte-black/40 rounded-2xl flex items-center gap-3 border border-border-dark">
                        <div className="w-8 h-8 rounded-full bg-racing-red flex items-center justify-center text-white font-black text-xs shadow-lg shadow-racing-red/20">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-snow-white truncate">Administrator</p>
                            <p className="text-[10px] text-dim-grey truncate font-medium">{auth.currentUser?.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative bg-matte-black">
                <div className="min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
