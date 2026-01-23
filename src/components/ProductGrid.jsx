import React, { useState, useEffect } from 'react';
import { ShoppingCart, FilterX, ChevronRight, ChevronDown, SlidersHorizontal, Car } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from './ProductCard';
import { toast } from 'react-hot-toast';

const ProductGrid = ({ showFilters = true }) => {
    const { t, i18n } = useTranslation();
    const { addToCart } = useCart();
    const { filters, updateFilter, resetFilters, isGarageFilterActive, activeCar } = useFilters();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [carHeaderImage, setCarHeaderImage] = useState('');

    // Dynamic filter options extracted from products
    const [filterOptions, setFilterOptions] = useState({
        categories: {}, // { categoryName: Set(subcategories) }
        makes: {},      // { makeName: Set(models) }
        brands: [],     // Array of brand names
        origins: [],    // Array of origin names
        years: []
    });

    // Accordion state - track which sections are open
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        makes: true,
        years: false,
        brands: false,
        origins: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Active filters state for multi-select
    const [activeFilters, setActiveFilters] = useState({
        categories: [],
        subcategories: [],
        makes: [],
        models: [],
        years: [],
        brands: [],
        origins: []
    });

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                let q;
                if (isGarageFilterActive && activeCar) {
                    q = query(
                        collection(db, 'products'),
                        where('isActive', '==', true),
                        where('make', 'in', [activeCar.make, '', null])
                    );
                } else {
                    q = query(
                        collection(db, 'products'),
                        where('isActive', '==', true)
                    );
                }

                const querySnapshot = await getDocs(q);
                const productsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setProducts(productsList);

                // Extract unique filter options from products
                extractFilterOptions(productsList);
            } catch (error) {
                console.error("Error fetching products: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [isGarageFilterActive, activeCar]);

    // Extract unique values for each filter type
    const extractFilterOptions = (productsList) => {
        const categories = {};
        const makes = {};
        const brands = new Set();
        const origins = new Set();
        const years = new Set();

        productsList.forEach(product => {
            // Group Subcategories by Category
            if (product.category) {
                if (!categories[product.category]) categories[product.category] = new Set();
                if (product.subcategory) categories[product.category].add(product.subcategory);
            }

            // Group Models by Make
            if (product.make) {
                if (!makes[product.make]) makes[product.make] = new Set();
                if (product.model) makes[product.make].add(product.model);
            }

            // Extract Brands
            const brand = product.brandEn || product.partBrand || product.brand;
            if (brand) brands.add(brand);

            // Extract Origins
            const origin = product.origin || product.countryOfOrigin;
            if (origin) origins.add(origin);

            // Extract years
            if (product.yearStart && product.yearEnd) {
                for (let year = product.yearStart; year <= product.yearEnd; year++) {
                    years.add(year.toString());
                }
            } else if (product.yearRange) {
                years.add(product.yearRange);
            }
        });

        // Convert Sets to sorted Arrays
        const finalizeGroups = (obj) => {
            const result = {};
            Object.keys(obj).sort().forEach(key => {
                result[key] = Array.from(obj[key]).sort();
            });
            return result;
        };

        setFilterOptions({
            categories: finalizeGroups(categories),
            makes: finalizeGroups(makes),
            brands: Array.from(brands).sort(),
            origins: Array.from(origins).sort(),
            years: Array.from(years).sort((a, b) => b - a)
        });
    };

    // Fetch car header image when make/model changes
    useEffect(() => {
        const fetchCarImage = async () => {
            if (filters.make && filters.model) {
                try {
                    const carsSnapshot = await getDocs(collection(db, 'cars'));
                    const car = carsSnapshot.docs.find(doc => {
                        const data = doc.data();
                        return data.make === filters.make && data.model === filters.model;
                    });
                    setCarHeaderImage(car ? car.data().imageUrl : '');
                } catch (error) {
                    console.error("Error fetching car image: ", error);
                    setCarHeaderImage('');
                }
            } else {
                setCarHeaderImage('');
            }
        };

        fetchCarImage();
    }, [filters.make, filters.model]);

    const handleAddToCart = (product) => {
        addToCart(product);
        toast.success(t('addedToCart'));
    };

    // Toggle filter selection (multi-select)
    const toggleFilter = (filterType, value) => {
        setActiveFilters(prev => {
            const currentValues = prev[filterType];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return { ...prev, [filterType]: newValues };
        });
    };

    const handleSelectFilter = (type, value) => {
        setActiveFilters(prev => {
            const newState = {
                ...prev,
                [type]: value ? [value] : []
            };

            // Reset subcategories when category changes
            if (type === 'categories') {
                newState.subcategories = [];
            }

            // Reset model when make changes
            if (type === 'makes') {
                newState.models = [];
            }

            return newState;
        });
    };

    // Reset all filters
    const handleResetFilters = () => {
        setActiveFilters({
            categories: [],
            subcategories: [],
            makes: [],
            models: [],
            years: [],
            brands: [],
            origins: []
        });
        resetFilters();
    };

    const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0) || filters.searchQuery || filters.viscosity || filters.make;

    const filteredProducts = products.filter(product => {
        // 1. Garage Filter Override (If active)
        if (isGarageFilterActive && activeCar) {
            const isUniversalModel = !product.model || product.model === '';
            const matchesModel = isUniversalModel || product.model === activeCar.model;
            if (!matchesModel) return false;

            const carYear = Number(activeCar.year);
            const hasRange = product.yearStart != null && product.yearEnd != null;
            const matchesYear = !hasRange || (carYear >= product.yearStart && carYear <= product.yearEnd);
            if (!matchesYear) return false;
        }

        // 2. Dynamic Multi-Select Filters
        // Category filter
        if (activeFilters.categories.length > 0) {
            if (!activeFilters.categories.includes(product.category)) return false;
        }

        // Subcategory filter
        if (activeFilters.subcategories.length > 0) {
            if (!activeFilters.subcategories.includes(product.subcategory)) return false;
        }

        // Make filter
        if (activeFilters.makes.length > 0) {
            if (!activeFilters.makes.includes(product.make)) return false;
        }

        // Model filter
        if (activeFilters.models.length > 0) {
            if (!activeFilters.models.includes(product.model)) return false;
        }

        // Year filter
        if (activeFilters.years.length > 0) {
            let matchesYear = false;
            for (const selectedYear of activeFilters.years) {
                const yearNum = Number(selectedYear);
                if (product.yearStart && product.yearEnd) {
                    if (yearNum >= product.yearStart && yearNum <= product.yearEnd) {
                        matchesYear = true;
                        break;
                    }
                } else if (product.yearRange === selectedYear) {
                    matchesYear = true;
                    break;
                }
            }
            if (!matchesYear) return false;
        }

        // Brand filter
        if (activeFilters.brands.length > 0) {
            const productBrand = product.brandEn || product.partBrand || product.brand;
            if (!activeFilters.brands.includes(productBrand)) return false;
        }

        // Origin filter
        if (activeFilters.origins.length > 0) {
            const productOrigin = product.origin || product.countryOfOrigin;
            if (!activeFilters.origins.includes(productOrigin)) return false;
        }

        // 3. Search Query (Always apply)
        let matchesSearch = true;
        if (filters.searchQuery) {
            const queryTokens = filters.searchQuery.toLowerCase().trim().split(/\s+/);
            const searchableString = `
                ${product.name || ''} 
                ${product.category || ''} 
                ${product.subCategory || ''} 
                ${product.brand || ''} 
                ${product.make || ''} 
                ${product.model || ''} 
                ${product.country || ''}
            `.toLowerCase();
            matchesSearch = queryTokens.every(token => searchableString.includes(token));
        }
        if (!matchesSearch) return false;

        // 4. Viscosity Filter (From Oil Advisor)
        const matchesViscosity = !filters.viscosity ||
            (product.viscosity && product.viscosity === filters.viscosity) ||
            (product.name && product.name.toLowerCase().includes(filters.viscosity.toLowerCase()));

        return matchesViscosity;
    });

    if (loading) {
        return (
            <div className="bg-gray-50 py-16 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 py-8 md:py-16" id="product-grid">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Garage Filtering Banner */}
                {isGarageFilterActive && activeCar && (
                    <div className="mb-8 bg-red-600 rounded-[2rem] p-6 text-white shadow-xl shadow-red-100 flex items-center justify-between animate-in slide-in-from-top duration-500">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Car className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">{t('garageActive')}</h3>
                                <p className="text-white/80 font-bold">{t('garageResults', { year: activeCar.year, make: activeCar.make, model: activeCar.model })}</p>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <span className="bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-md">{t('guaranteedFitment')}</span>
                        </div>
                    </div>
                )}

                {/* Car Header (If Selected) */}
                {carHeaderImage && filters.make && filters.model && (
                    <div className="mb-10 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row items-center animate-fade-in-up">
                        <div className="w-full md:w-1/3 h-48 md:h-64">
                            <img src={carHeaderImage} alt={`${filters.make} ${filters.model}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-8 md:w-2/3">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                {t('viewingPartsFor')} <span className="text-orange-600">{filters.make} {filters.model}</span>
                            </h2>
                            <p className="text-gray-500 text-lg">
                                {t('curatedSelection', { count: filteredProducts.length })}
                            </p>
                        </div>
                    </div>
                )}

                <div className={`flex flex-col lg:flex-row gap-8 ${!showFilters ? '' : 'pt-2 md:pt-0'}`}>

                    {/* Sidebar Filters (Desktop) - Only show if showFilters is true */}
                    {showFilters && (
                        <div className="hidden lg:block w-72 flex-shrink-0">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                                    <h3 className="font-black text-black text-lg uppercase tracking-tight">{t('filters')}</h3>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="text-[10px] font-black text-red-600 hover:text-red-800 uppercase tracking-widest transition-all hover:scale-105"
                                        >
                                            {t('clearAll') || 'مسح الكل'}
                                        </button>
                                    )}
                                </div>

                                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                                    {/* Category Selection (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t('category')}</label>
                                        <select
                                            value={activeFilters.categories[0] || ''}
                                            onChange={(e) => handleSelectFilter('categories', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                                        >
                                            <option value="">{t('allCategories') || 'كل الأقسام'}</option>
                                            {Object.keys(filterOptions.categories).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Dependent Subcategories (List) */}
                                    {activeFilters.categories.length > 0 && filterOptions.categories[activeFilters.categories[0]]?.length > 0 && (
                                        <div className="space-y-4 animate-in slide-in-from-top duration-300 pt-2 border-t border-gray-50">
                                            <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block">{t('subcategory')}</label>
                                            <div className="space-y-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                {filterOptions.categories[activeFilters.categories[0]].map(sub => (
                                                    <label key={sub} className="flex items-center cursor-pointer group">
                                                        <div className="relative flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={activeFilters.subcategories.includes(sub)}
                                                                onChange={() => toggleFilter('subcategories', sub)}
                                                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-all cursor-pointer"
                                                            />
                                                        </div>
                                                        <span className={`ml-3 text-sm transition-colors ${activeFilters.subcategories.includes(sub) ? 'font-black text-black' : 'font-medium text-gray-500 group-hover:text-black'}`}>
                                                            {sub}
                                                        </span>
                                                        {activeFilters.subcategories.includes(sub) && (
                                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-600" />
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Car Make (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t('carMake')}</label>
                                        <select
                                            value={activeFilters.makes[0] || ''}
                                            onChange={(e) => handleSelectFilter('makes', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                                        >
                                            <option value="">{t('allMakes') || 'كل الماركات'}</option>
                                            {Object.keys(filterOptions.makes).map(make => (
                                                <option key={make} value={make}>{make}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Car Model (Dropdown - Dependent on Make) */}
                                    {activeFilters.makes.length > 0 && filterOptions.makes[activeFilters.makes[0]]?.length > 0 && (
                                        <div className="space-y-2 animate-in slide-in-from-top duration-200">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t('carModel')}</label>
                                            <select
                                                value={activeFilters.models[0] || ''}
                                                onChange={(e) => handleSelectFilter('models', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                                            >
                                                <option value="">{t('allModels') || 'كل الموديلات'}</option>
                                                {filterOptions.makes[activeFilters.makes[0]].map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Year (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t('year')}</label>
                                        <select
                                            value={activeFilters.years[0] || ''}
                                            onChange={(e) => handleSelectFilter('years', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                                        >
                                            <option value="">{t('allYears') || 'كل السنوات'}</option>
                                            {filterOptions.years.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Origin (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t('origin')}</label>
                                        <select
                                            value={activeFilters.origins[0] || ''}
                                            onChange={(e) => handleSelectFilter('origins', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                                        >
                                            <option value="">{t('allOrigins') || 'كل بلد الصنع'}</option>
                                            {filterOptions.origins.map(origin => (
                                                <option key={origin} value={origin}>{origin}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Brand (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t('brand')}</label>
                                        <select
                                            value={activeFilters.brands[0] || ''}
                                            onChange={(e) => handleSelectFilter('brands', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                                        >
                                            <option value="">{t('allBrands') || 'كل الماركات'}</option>
                                            {filterOptions.brands.map(brand => (
                                                <option key={brand} value={brand}>{brand}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobile Filter Toggle - Only show if showFilters is true */}
                    {showFilters && (
                        <div className="lg:hidden mb-6">
                            <button
                                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                                className="w-full flex items-center justify-center space-x-2 bg-white p-3 rounded-lg shadow border border-gray-200"
                            >
                                <SlidersHorizontal className="h-5 w-5 text-gray-600" />
                                <span className="font-medium text-gray-800">{t('filters')} & {t('categories')}</span>
                            </button>
                        </div>
                    )}

                    {/* Mobile Sidebar (Collapsible) */}
                    {showFilters && isMobileFilterOpen && (
                        <div className="lg:hidden mb-8 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-in slide-in-from-top duration-300 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-6">
                                {Object.entries(filterOptions.categories).map(([cat, subs]) => (
                                    <div key={cat} className="space-y-3">
                                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">{cat}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => toggleFilter('categories', cat)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${activeFilters.categories.includes(cat) ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' : 'bg-gray-50 border-gray-100 text-gray-600'}`}
                                            >
                                                {t('all')} {cat}
                                            </button>
                                            {subs.map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => toggleFilter('subcategories', sub)}
                                                    className={`text-[10px] font-bold px-4 py-2 rounded-xl transition-all border ${activeFilters.subcategories.includes(sub) ? 'bg-black border-black text-white shadow-lg shadow-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-6 border-t border-gray-100 flex gap-4">
                                    <button
                                        onClick={handleResetFilters}
                                        className="flex-1 py-4 text-center text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        {t('resetAll')}
                                    </button>
                                    <button
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="flex-1 py-4 text-center bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg"
                                    >
                                        {t('applyFilters')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Main Content */}
                    <div className="flex-1">
                        {!carHeaderImage && (
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {showFilters ?
                                        (filters.make ? `${t('partsFor')} ${filters.make} ${filters.model}` : t('allProducts'))
                                        : t('featuredProducts')
                                    }
                                </h2>
                                <span className="text-sm text-gray-500">{filteredProducts.length} {t('products')}</span>
                            </div>
                        )}

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                                <FilterX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-xl font-medium text-gray-900">{t('noProducts')}</p>
                                <p className="text-gray-500 mt-2">{t('tryChanging')}</p>
                                <button
                                    onClick={resetFilters}
                                    className="mt-6 text-orange-600 font-semibold hover:text-orange-700 underline"
                                >
                                    {t('clearFilters')}
                                </button>
                            </div>
                        ) : (
                            <div className={`grid grid-cols-2 ${showFilters ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-4 sm:gap-6`}>
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductGrid;
