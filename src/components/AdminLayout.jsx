import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSafeNavigation } from '../utils/safeNavigation';
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
import { useState, useEffect, useRef } from 'react';

const AdminLayout = () => {
    const { navigate } = useSafeNavigation();
    const location = useLocation();

    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarRef = useRef(null);

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    // Close on click outside (mobile)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target) && isSidebarOpen) {
                setIsSidebarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSidebarOpen]);

    // QUOTA SHIELD: Real-time listeners disabled to prevent quota exhaustion
    // These onSnapshot listeners were consuming massive reads on every admin page
    // Badge counts are now static (set to 0) to eliminate Firestore reads

    // useEffect(() => {
    //     const q = query(
    //         collection(db, 'contact_messages'),
    //         where('status', '==', 'Unread')
    //     );
    //     const unsubscribe = onSnapshot(q, (snapshot) => {
    //         setUnreadCount(snapshot.size);
    //     });
    //     return () => unsubscribe();
    // }, []);

    // useEffect(() => {
    //     const q = query(
    //         collection(db, 'reviews'),
    //         where('status', '==', 'pending')
    //     );
    //     const unsubscribe = onSnapshot(q, (snapshot) => {
    //         setPendingReviewsCount(snapshot.size);
    //     });
    //     return () => unsubscribe();
    // }, []);

    // useEffect(() => {
    //     const q = query(
    //         collection(db, 'orders'),
    //         where('isOpened', '==', false)
    //     );
    //     const unsubscribe = onSnapshot(q, (snapshot) => {
    //         setPendingOrdersCount(snapshot.size);
    //     });
    //     return () => unsubscribe();
    // }, []);


    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('admin_token');
            navigate('/admin/login');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const navItems = [
        { name: 'Abandoned Carts', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/abandoned-carts' },
        { name: 'Admin Management', icon: <Users className="w-5 h-5" />, path: '/admin/management' },
        { name: 'Affiliates', icon: <Users className="w-5 h-5" />, path: '/admin/affiliates' },
        { name: 'Blog', icon: <FileText className="w-5 h-5" />, path: '/admin/blog' },
        { name: 'Brands', icon: <Award className="w-5 h-5" />, path: '/admin/brands' },
        { name: 'Car Specs', icon: <Settings className="w-5 h-5" />, path: '/admin/car-specs' },
        { name: 'Cars', icon: <Car className="w-5 h-5" />, path: '/admin/cars' },
        { name: 'Categories', icon: <FolderTree className="w-5 h-5" />, path: '/admin/categories' },
        { name: 'Customers', icon: <Users className="w-5 h-5" />, path: '/admin/customers' },
        { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin/dashboard' },
        { name: 'General Settings', icon: <Settings className="w-5 h-5" />, path: '/admin/settings' },
        { name: 'Hero Slider', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin/hero' },
        { name: 'Integrations', icon: <Settings className="w-5 h-5" />, path: '/admin/integrations' },
        { name: 'Messages', icon: <Inbox className="w-5 h-5" />, path: '/admin/messages' },
        { name: 'Orders', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/orders' },
        { name: 'Payment Methods', icon: <CreditCard className="w-5 h-5" />, path: '/admin/payment-methods' },
        { name: 'Payment Partners', icon: <CreditCard className="w-5 h-5" />, path: '/admin/payments-manager' },
        { name: 'Policy Pages', icon: <FileText className="w-5 h-5" />, path: '/admin/policies' },
        { name: 'Products', icon: <Box className="w-5 h-5" />, path: '/admin/products' },
        { name: 'Promo Codes', icon: <Ticket className="w-5 h-5" />, path: '/admin/promo-codes' },
        { name: 'Reviews', icon: <Star className="w-5 h-5" />, path: '/admin/reviews' },
        { name: 'Shipping Rates', icon: <Truck className="w-5 h-5" />, path: '/admin/shipping' },
    ];

    return (
        <div className="admin-theme-container flex h-screen bg-slate-50 font-admin overflow-hidden relative">
            {/* Mobile Hamburger Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <Box className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-xs font-bold text-slate-900 tracking-tight">Admin Console</h2>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-4 h-4" />
                </button>
            </header>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Pro SaaS Style */}
            <aside
                ref={sidebarRef}
                className={`
                    fixed lg:relative inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-[70] transition-transform duration-300 transform
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/20">
                            <Box className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1">Z&F Admin</h2>
                            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">v2.0 Managed</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group
                                ${isActive
                                    ? 'bg-slate-50 text-emerald-600 font-semibold'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                            `}
                        >
                            <span className={`transition-all duration-200 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {React.cloneElement(item.icon, { className: 'w-4.5 h-4.5' })}
                            </span>
                            <span className="text-[13px] tracking-tight">
                                {item.name}
                            </span>

                            <div className="ml-auto flex gap-1">
                                {item.name === 'Orders' && pendingOrdersCount > 0 && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                                        {pendingOrdersCount}
                                    </span>
                                )}
                                {item.name === 'Messages' && unreadCount > 0 && (
                                    <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 shadow-sm mb-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-900 truncate">Administrator</p>
                            <p className="text-[9px] text-slate-500 truncate">{auth.currentUser?.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-bold text-[11px] uppercase tracking-wider"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main
                key={location.pathname}
                className="flex-1 lg:max-w-none overflow-y-auto relative pt-16 lg:pt-0"
            >
                <div className="min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
