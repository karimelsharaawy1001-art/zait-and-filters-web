import React, { useState } from 'react';
import { Search, ShoppingCart, User, Menu, X, Package, Users, Car, Settings, LogOut, Droplets } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { getCartCount } = useCart();
    const { filters, updateFilter, isGarageFilterActive, activeCar, toggleGarageFilter } = useFilters();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const cartCount = getCartCount();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSearchChange = (e) => {
        const query = e.target.value;
        updateFilter('searchQuery', query);

        // If user is not on the shop page and starts typing, take them to the shop
        if (location.pathname !== '/shop' && query.length > 0) {
            navigate('/shop');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success('Logged out successfully');
            navigate('/login');
        } catch (error) {
            console.error("Logout Error:", error);
            toast.error("Failed to logout");
        }
    };

    const handleGarageToggle = () => {
        if (!auth.currentUser) {
            toast.error("Please login to use the Garage feature");
            navigate('/login');
            return;
        }

        const success = toggleGarageFilter();
        if (!success) {
            toast.error("Please add a car to your garage first!");
            navigate('/profile');
        } else {
            if (!isGarageFilterActive) {
                toast.success(`Garage mode ON: Fitting for ${activeCar.make} ${activeCar.model}`);
            } else {
                toast.success("Garage mode OFF: Showing all parts");
            }
        }
    };

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/30 shadow-sm w-full z-50 fixed top-0 left-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                        {settings.siteLogo && (
                            <img src={settings.siteLogo} alt={settings.siteName} className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
                        )}
                        <span className="font-bold text-xl md:text-2xl text-[#00b755]">
                            {settings.siteName}
                        </span>
                    </Link>

                    {/* Desktop Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder={t('search')}
                                value={filters.searchQuery}
                                onChange={handleSearchChange}
                                className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Desktop Icons */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link to="/cart" className="text-gray-600 hover:text-orange-600 transition-colors relative">
                            <ShoppingCart className="h-6 w-6" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        <Link to="/my-orders" className="text-gray-600 hover:text-orange-600 transition-colors" title="My Orders">
                            <Package className="h-6 w-6" />
                        </Link>
                        <Link to="/oil-advisor" className="text-gray-600 hover:text-orange-600 transition-colors" title={t('oilAdvisor')}>
                            <Droplets className="h-6 w-6" />
                        </Link>
                        <Link to="/affiliate-dashboard" className="text-gray-600 hover:text-orange-600 transition-colors" title="Affiliate Portal">
                            <Users className="h-6 w-6" />
                        </Link>

                        {/* Garage Toggle */}
                        <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
                            <button
                                onClick={handleGarageToggle}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${isGarageFilterActive ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                            >
                                <Car className={`h-4 w-4 ${isGarageFilterActive ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {isGarageFilterActive ? `Fitting: ${activeCar?.model}` : 'Garage'}
                                </span>
                            </button>
                        </div>

                        <Link to="/profile" className="text-gray-600 hover:text-orange-600 transition-colors" title="My Account">
                            <User className="h-6 w-6" />
                        </Link>
                        {auth.currentUser && (
                            <button
                                onClick={handleLogout}
                                className="text-gray-600 hover:text-red-600 transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="h-6 w-6" />
                            </button>
                        )}
                        <LanguageSwitcher />
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex items-center space-x-3 md:hidden">
                        <button
                            onClick={() => {
                                setIsSearchOpen(!isSearchOpen);
                                if (isOpen) setIsOpen(false);
                            }}
                            className="text-gray-600 p-2"
                        >
                            <Search className="h-6 w-6" />
                        </button>

                        <Link to="/cart" className="text-gray-600 relative p-2">
                            <ShoppingCart className="h-6 w-6" />
                            {cartCount > 0 && (
                                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        <Link to="/my-orders" className="text-gray-600 p-2">
                            <Package className="h-6 w-6" />
                        </Link>

                        <button
                            onClick={handleGarageToggle}
                            className={`p-2 rounded-lg transition-colors ${isGarageFilterActive ? 'bg-red-600 text-white' : 'text-gray-600'}`}
                        >
                            <Car className="h-6 w-6" />
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(!isOpen);
                                if (isSearchOpen) setIsSearchOpen(false);
                            }}
                            className="text-gray-600 p-2 focus:outline-none"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Search Bar (Expandable) */}
            {isSearchOpen && (
                <div className="md:hidden bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 animate-in slide-in-from-top duration-200">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('search')}
                            autoFocus
                            value={filters.searchQuery}
                            onChange={handleSearchChange}
                            className="w-full bg-gray-100 border-none rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-orange-500 text-base"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Menu (Dropdown Links) */}
            {isOpen && (
                <div className="md:hidden bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-top duration-200">
                    <div className="px-4 py-4 space-y-2">
                        <div className="space-y-1">
                            <Link
                                to="/"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-lg font-semibold text-gray-800 hover:text-orange-600 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                {t('home')}
                            </Link>
                            <Link
                                to="/oil-advisor"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-lg font-semibold text-gray-800 hover:text-orange-600 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                {t('oilAdvisor')}
                            </Link>
                            <Link
                                to="/shop"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-lg font-semibold text-gray-800 hover:text-orange-600 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                {t('shop')}
                            </Link>
                            <Link
                                to="#"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-lg font-semibold text-gray-800 hover:text-orange-600 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                {t('about')}
                            </Link>
                            <Link
                                to="/affiliate-dashboard"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-lg font-semibold text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                            >
                                {t('becomeAffiliate', 'Become an Affiliate')}
                            </Link>
                            <Link
                                to="/profile"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-lg font-semibold text-gray-800 hover:text-orange-600 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                {t('myAccount', 'My Account')}
                            </Link>
                            <Link
                                to="/my-orders"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-3 text-lg font-semibold text-gray-800 hover:text-orange-600 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                {t('myOrders', 'My Orders')}
                            </Link>
                            {auth.currentUser && (
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full text-left ml-0 px-4 py-3 text-lg font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                                >
                                    <LogOut className="h-5 w-5" />
                                    {t('signOut', 'Sign Out')}
                                </button>
                            )}
                        </div>

                        <div className="pt-4 mt-4 border-t border-gray-100">
                            <div className="px-4">
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
