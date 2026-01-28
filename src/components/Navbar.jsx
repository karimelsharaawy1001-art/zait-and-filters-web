import React, { useState } from 'react';
import { Search, ShoppingCart, User, Menu, X, Package, Users, Car, Settings, LogOut, Droplets, BookOpen, Home, ShoppingBag, UserCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, limit as firestoreLimit, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { normalizeArabic, getSearchableText } from '../utils/productUtils';

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

    const [suggestions, setSuggestions] = useState([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

    const handleSearchChange = (e) => {
        const queryVal = e.target.value;
        updateFilter('searchQuery', queryVal);

        // Fetch suggestions as user types
        if (queryVal.length > 2) {
            fetchSuggestions(queryVal);
        } else {
            setSuggestions([]);
        }

        // If user is not on the shop page and starts typing, take them to the shop
        if (location.pathname !== '/shop' && queryVal.length > 0) {
            navigate('/shop');
        }
    };

    const fetchSuggestions = async (searchTerm) => {
        setIsSuggestionsLoading(true);
        try {
            // Firestore prefix search is too limited. 
            // We fetch a larger batch and filter client-side for better results.
            const queryVal = normalizeArabic(searchTerm);
            const searchKeywords = queryVal.split(/\s+/).filter(Boolean);

            // Attempt to fetch ordered by name for a better subset, with fallback
            let q;
            try {
                q = query(
                    collection(db, 'products'),
                    where('isActive', '==', true),
                    orderBy('name', 'asc'),
                    firestoreLimit(2000) // High limit to ensure matching in large collections
                );
            } catch (e) {
                q = query(
                    collection(db, 'products'),
                    where('isActive', '==', true),
                    firestoreLimit(2000)
                );
            }

            const snapshot = await getDocs(q);
            const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const filtered = allItems.filter(p => {
                const searchTarget = normalizeArabic(getSearchableText(p));
                return searchKeywords.every(keyword => searchTarget.includes(keyword));
            });

            setSuggestions(filtered.slice(0, 5)); // Still only show top 5
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        } finally {
            setIsSuggestionsLoading(false);
        }
    };

    const handleSuggestionClick = (product) => {
        setSuggestions([]);
        navigate(`/product/${product.id}`);
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

    const activeClass = "text-[#28B463]";
    const inactiveClass = "text-[#000000] font-black";
    const linkBase = "text-[14px] font-black uppercase tracking-widest transition-colors font-Cairo mx-4 flex items-center h-full";

    const isActive = (path) => location.pathname === path;

    const mobileNavLinkClass = (path) => `
        flex items-center gap-4 px-4 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 uppercase italic font-Cairo
        ${isActive(path)
            ? 'bg-[#28B463]/10 text-[#28B463] shadow-sm'
            : 'text-[#1A1A1A] hover:bg-green-50'}
    `;

    const mobileIconClass = (path) => isActive(path) ? 'text-[#28B463]' : 'text-gray-400';

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300">
            {/* Main Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Desktop Layout (Hidden on Mobile) */}
                    <div className="hidden md:flex justify-between items-center w-full h-16 relative">
                        {/* Left: Logo */}
                        <div className="flex items-center gap-4 shrink-0">
                            <Link to="/" className="shrink-0">
                                {settings.siteLogo && (
                                    <img src={settings.siteLogo} alt={settings.siteName} className="h-10 w-auto object-contain" />
                                )}
                            </Link>
                            <Link to="/" className="flex flex-col justify-center">
                                <span className="font-black text-2xl lg:text-4xl tracking-tighter uppercase italic leading-none font-Cairo group-hover:scale-105 transition-transform duration-300">
                                    <span style={{ color: '#1A1A1A' }}>ZAIT</span> <span style={{ color: '#28B463' }}>& FILTERS</span>
                                </span>
                                <p className="text-[10px] lg:text-[12px] font-black text-[#000000] mt-1 tracking-widest uppercase font-Cairo">قطع الغيار بضغطة زرار</p>
                            </Link>
                        </div>

                        {/* Center: Search & Navigation Links */}
                        <div className="flex flex-1 justify-center items-center gap-x-6 px-4">
                            {/* Navigation Links Group */}
                            <div className="flex items-center gap-x-4 shrink-0" style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                                <Link to="/" className="text-[14px] !text-[#1A1A1A] !font-bold uppercase tracking-widest transition-colors font-Cairo hover:!text-[#28B463] whitespace-nowrap">
                                    {t('home')}
                                </Link>
                                <Link to="/oil-advisor" className="text-[14px] !text-[#1A1A1A] !font-bold uppercase tracking-widest transition-colors font-Cairo hover:!text-[#28B463] whitespace-nowrap flex items-center gap-2">
                                    <Droplets className="h-4 w-4 text-[#28B463]" />
                                    {t('oilAdvisor')}
                                </Link>
                                <Link to="/shop" className="text-[14px] !text-[#1A1A1A] !font-bold uppercase tracking-widest transition-colors font-Cairo hover:!text-[#28B463] whitespace-nowrap">
                                    {t('shop')}
                                </Link>
                                <Link to="/blog" className="text-[14px] !text-[#1A1A1A] !font-bold uppercase tracking-widest transition-colors font-Cairo hover:!text-[#28B463] whitespace-nowrap flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-[#28B463]" />
                                    {t('blog')}
                                </Link>
                                <Link to="/marketers" className="text-[14px] !text-[#1A1A1A] !font-bold uppercase tracking-widest transition-colors font-Cairo hover:!text-[#28B463] whitespace-nowrap">
                                    {t('nav.marketers')}
                                </Link>
                            </div>

                            {/* Search Bar */}
                            <div className="w-full max-w-[400px] hidden lg:block relative">
                                <div className="relative w-full">
                                    <input
                                        type="text"
                                        placeholder={t('search')}
                                        value={filters.searchQuery}
                                        onChange={handleSearchChange}
                                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                                        className="w-full bg-white border-[1px] border-[#1A1A1A] rounded-lg py-1.5 pl-10 pr-4 focus:ring-2 focus:ring-[#28B463] transition-all text-[14px] font-bold font-Cairo text-black placeholder:text-gray-500"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none force-black">
                                        <Search className="h-4 w-4 stroke-[3px]" />
                                    </div>
                                </div>

                                {/* Desktop Suggestions Dropdown */}
                                {suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[110] animate-in slide-in-from-top-2 duration-200">
                                        {suggestions.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleSuggestionClick(p)}
                                                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left transition-colors"
                                            >
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                                                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-black truncate">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{p.partBrand} | {p.salePrice || p.price} EGP</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Icon Group */}
                        <div className="flex items-center gap-x-4 shrink-0">
                            <Link to="/cart" className="relative group p-1 force-black">
                                <ShoppingCart className="h-6 w-6 stroke-[3px]" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#28B463] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-lg">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>

                            <button
                                onClick={handleGarageToggle}
                                className={`flex flex-row items-center gap-2 px-3 py-1.5 rounded-lg border-[1px] transition-all hover:scale-110 active:scale-95 duration-300 ${isGarageFilterActive
                                    ? 'bg-[#22c55e] border-[#22c55e] text-white shadow-md'
                                    : 'bg-transparent border-[#000000] text-[#000000] hover:border-[#22c55e]'
                                    }`}
                                style={{
                                    transform: 'translateZ(0)',
                                    willChange: 'transform',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important'
                                }}
                            >
                                <Car className={`h-5 w-5 stroke-[3px] ${isGarageFilterActive ? 'text-white' : 'text-[#000000]'}`} />
                                <span className={`text-[12px] font-bold font-Cairo uppercase leading-none tracking-wider ${isGarageFilterActive ? 'text-white' : 'text-[#000000]'}`}>
                                    {t('garage')}
                                </span>
                            </button>

                            <Link to="/profile" className="p-1 force-black">
                                <User className="h-6 w-6 stroke-[3px]" />
                            </Link>

                            <LanguageSwitcher />
                        </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="flex flex-col md:hidden py-1">
                        {/* Top Row: Menu | Logo | Marketers | Garage | Account | Cart */}
                        <div className="flex justify-between items-center w-full mb-3 gap-x-2 sm:gap-x-4 px-1">
                            {/* Left Group: Menu & Logo */}
                            <div className="flex items-center gap-x-3 shrink-0">
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="p-1.5 force-black active:bg-gray-100 rounded-full transition-colors"
                                    aria-label="Toggle Menu"
                                >
                                    {isOpen ? <X className="h-6 w-6 stroke-[3px]" /> : <Menu className="h-6 w-6 stroke-[3px]" />}
                                </button>
                                <Link to="/" className="flex flex-col justify-center">
                                    <span className="font-black text-[24px] sm:text-3xl tracking-tighter uppercase italic leading-none font-Cairo whitespace-nowrap" >
                                        <span style={{ color: '#1A1A1A' }}>ZAIT</span> <span style={{ color: '#28B463' }}>& FILTERS</span>
                                    </span>
                                    <p className="text-[7px] font-black text-[#000000] mt-0.5 tracking-widest uppercase font-Cairo">بضغطة زرار</p>
                                </Link>
                            </div>

                            {/* Right Group: Marketers | Garage | Account | Cart */}
                            <div className="flex items-center gap-x-1.5 sm:gap-x-3">
                                <Link
                                    to="/marketers"
                                    className="text-[9px] sm:text-[11px] !text-[#000000] !font-bold uppercase font-Cairo px-1.5 py-1 whitespace-nowrap"
                                >
                                    {t('nav.marketers')}
                                </Link>
                                <button
                                    onClick={handleGarageToggle}
                                    className={`p-1.5 rounded-xl transition-all active:scale-95 ${isGarageFilterActive
                                        ? 'bg-[#22c55e] text-white'
                                        : 'text-[#000000]'
                                        }`}
                                    aria-label="Toggle Garage"
                                >
                                    <Car className="h-6 w-6 stroke-[3px]" />
                                </button>
                                <Link to="/profile" className="p-1.5 force-black active:bg-gray-100 rounded-full transition-colors">
                                    <User className="h-6 w-6 stroke-[3px]" />
                                </Link>
                                <Link to="/cart" className="p-1.5 relative force-black active:bg-gray-100 rounded-full transition-colors">
                                    <ShoppingCart className="h-6 w-6 stroke-[3px]" />
                                    {cartCount > 0 && (
                                        <span className="absolute top-0 right-0 bg-[#28B463] text-white text-[8px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        </div>

                        {/* Search Bar Row (Mobile Full Input) */}
                        <div className="w-full relative">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder={t('search')}
                                    value={filters.searchQuery}
                                    onChange={handleSearchChange}
                                    onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                                    className="w-full bg-white border-[1px] border-[#1A1A1A] rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-[#28B463] transition-all text-[14px] font-bold font-Cairo text-black placeholder:text-gray-500"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none force-black">
                                    <Search className="h-4 w-4 stroke-[3px]" />
                                </div>
                            </div>

                            {/* Mobile Suggestions Dropdown */}
                            {suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[110] animate-in slide-in-from-top-2 duration-200">
                                    {suggestions.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSuggestionClick(p)}
                                            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left transition-colors"
                                        >
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                                                {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-black truncate">{p.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold">{p.partBrand} • {p.salePrice || p.price} EGP</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isOpen && (
                    <div className="md:hidden bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-top duration-200">
                        <div className="px-4 py-6 space-y-2">
                            <Link
                                to="/"
                                onClick={() => setIsOpen(false)}
                                className={mobileNavLinkClass('/')}
                            >
                                <Home className={`h-5 w-5 ${mobileIconClass('/')}`} />
                                {t('home')}
                            </Link>

                            <Link
                                to="/shop"
                                onClick={() => setIsOpen(false)}
                                className={mobileNavLinkClass('/shop')}
                            >
                                <ShoppingBag className={`h-5 w-5 ${mobileIconClass('/shop')}`} />
                                {t('shop')}
                            </Link>

                            <Link
                                to="/blog"
                                onClick={() => setIsOpen(false)}
                                className={mobileNavLinkClass('/blog')}
                            >
                                <BookOpen className={`h-5 w-5 ${mobileIconClass('/blog')}`} />
                                {t('blog')}
                            </Link>

                            <Link
                                to="/oil-advisor"
                                onClick={() => setIsOpen(false)}
                                className={mobileNavLinkClass('/oil-advisor')}
                            >
                                <Droplets className={`h-5 w-5 ${mobileIconClass('/oil-advisor')}`} />
                                {t('oilAdvisor')}
                            </Link>

                            <Link
                                to="/marketers"
                                onClick={() => setIsOpen(false)}
                                className={mobileNavLinkClass('/marketers')}
                            >
                                <Users className={`h-5 w-5 ${mobileIconClass('/marketers')}`} />
                                {t('nav.marketers')}
                            </Link>

                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    handleGarageToggle();
                                }}
                                className={`w-full text-left px-4 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 uppercase italic flex items-center gap-4 font-Cairo ${isGarageFilterActive
                                    ? 'bg-[#22c55e] text-white shadow-lg'
                                    : 'text-[#000000] hover:bg-gray-50'
                                    }`}
                            >
                                <Car
                                    className={`h-5 w-5 stroke-[3px] transition-all hover:scale-110 active:scale-90 ${isGarageFilterActive ? 'text-white' : 'text-gray-400'}`}
                                />
                                {t('garage')}
                            </button>

                            <Link
                                to="/profile"
                                onClick={() => setIsOpen(false)}
                                className={mobileNavLinkClass('/profile')}
                            >
                                <UserCircle2 className={`h-5 w-5 ${mobileIconClass('/profile')}`} />
                                {t('myAccount')}
                            </Link>

                            {auth.currentUser && (
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full text-left px-4 py-3 text-[14px] font-bold text-[#28B463] hover:bg-green-50 rounded-xl transition-colors uppercase italic flex items-center gap-4 font-Cairo"
                                >
                                    <LogOut className="h-5 w-5 text-[#28B463]" />
                                    {t('signOut')}
                                </button>
                            )}
                            <div className="pt-4 px-4">
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </header >
    );
};

export default Navbar;
