import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, FilterX, ChevronRight, ChevronDown, SlidersHorizontal, Car, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFilters } from '../context/FilterContext';
import { useStaticData } from '../context/StaticDataContext';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, where, limit, startAfter, getCountFromServer, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from './ProductCard';
import { toast } from 'react-hot-toast';
import { parseYearRange, normalizeArabic, getSearchableText } from '../utils/productUtils';
import useScrollRestoration from '../hooks/useScrollRestoration';
import inventoryData from '../data/inventory.json';
import SkeletonProductCard from './SkeletonProductCard';

const ProductGrid = ({ showFilters = true }) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { addToCart } = useCart();
    const {
        staticProducts,
        categories: staticCategories,
        cars: staticCars,
        isStaticLoaded,
        isQuotaExceeded,
        withFallback
    } = useStaticData();
    const { filters, updateFilter, resetFilters, isGarageFilterActive, activeCar } = useFilters();
    const { hasSavedPosition } = useScrollRestoration();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);
    const [filterOptions, setFilterOptions] = useState({
        categories: {},
        makes: {},
        brands: [],
        origins: [],
        years: []
    });
    const [activeFilters, setActiveFilters] = useState({
        categories: [],
        subcategory: [],
        makes: [],
        models: [],
        years: [],
        brands: [],
        origins: []
    });
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [carHeaderImage, setCarHeaderImage] = useState('');
    const [isFiltering, setIsFiltering] = useState(false);
    const PAGE_SIZE = 20;

    // ⚡ High-Performance Memoized Static Search Engine
    const filteredStaticProducts = useMemo(() => {
        console.log('⚡ Calculating Memoized Static Search');

        // Data Priority: 1. Runtime-fetched staticProducts, 2. Bundled inventoryData
        let results = [];
        if (staticProducts && staticProducts.length > 0) {
            results = [...staticProducts];
        } else if (inventoryData && inventoryData.length > 0) {
            results = [...inventoryData];
        }

        // 1. Garage Filter
        if (isGarageFilterActive && activeCar?.make) {
            const cMake = activeCar.make.toUpperCase();
            const cModel = (activeCar.model || '').toUpperCase();
            results = results.filter(p => {
                const pMake = (p.make || p.carMake || p.car_make || '').toUpperCase();
                const pModel = (p.model || p.carModel || p.car_model || '').toUpperCase();
                const isUniversal = !pMake || pMake === 'UNIVERSAL' || pMake === 'GENERAL' ||
                    p.category === 'إكسسوارات وعناية' || p.category === 'إضافة للموتور و البنزين';
                if (isUniversal) return true;
                const isCarMatch = pMake === cMake && (!cModel || pModel === cModel);
                let isYearMatch = true;
                if (isCarMatch && activeCar.year) {
                    const y = parseInt(activeCar.year);
                    isYearMatch = (!p.yearStart || y >= p.yearStart) && (!p.yearEnd || y <= p.yearEnd);
                }
                return isCarMatch && isYearMatch;
            });
        } else {
            if (filters.make) results = results.filter(p => p.make === filters.make);
            if (filters.model) results = results.filter(p => p.model === filters.model);
            if (filters.year) {
                const yearNum = parseInt(filters.year);
                results = results.filter(p => {
                    const start = Number(p.yearStart);
                    const end = Number(p.yearEnd) || start; // Default to start year if end missing
                    return start <= yearNum && end >= yearNum;
                });
            }
        }

        // 2. Category & Subcategory
        if (filters.category && filters.category !== 'All') results = results.filter(p => p.category === filters.category);
        if (filters.subcategory) results = results.filter(p => p.subcategory === filters.subcategory);

        // 3. Other Metadata
        if (filters.brand) results = results.filter(p => p.partBrand === filters.brand);
        if (filters.origin) results = results.filter(p => p.countryOfOrigin === filters.origin);
        if (filters.viscosity) results = results.filter(p => p.viscosity === filters.viscosity);

        // 4. Search Query
        if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
            const searchKeywords = filters.searchQuery.trim().split(/\s+/).filter(Boolean).map(k => normalizeArabic(k));
            results = results.filter(p => {
                const searchTarget = normalizeArabic(getSearchableText(p));
                return searchKeywords.every(keyword => searchTarget.includes(keyword));
            });
        }

        const total = results.length;
        results.sort((a, b) => a.name.localeCompare(b.name));

        return { results, total };
    }, [
        isStaticLoaded,
        isGarageFilterActive,
        activeCar?.id,
        filters.category,
        filters.subcategory,
        filters.make,
        filters.model,
        filters.year,
        filters.brand,
        filters.origin,
        filters.searchQuery,
        filters.viscosity,
        staticProducts
    ]);

    const fetchProducts = async (isDebounced = false) => {
        if (!isDebounced) setLoading(true);
        setIsFiltering(true);
        try {
            // 1. Try Static/Context Data First (Now includes "Fresh" items from Context)
            if (isStaticLoaded || inventoryData.length > 0) {
                const { results, total } = filteredStaticProducts;
                setTotalProducts(total);

                const currentPage = Math.max(1, parseInt(filters.page) || 1);
                const startIndex = (currentPage - 1) * PAGE_SIZE;
                setProducts(results.slice(startIndex, startIndex + PAGE_SIZE));

                if (!filterOptions.categories || Object.keys(filterOptions.categories).length === 0) {
                    extractFilterOptions(staticProducts.length > 0 ? staticProducts : inventoryData);
                }
                return;
            }

            // 2. Fallback Firestore logic (Shielded - Only if Context failed entirely)
            await withFallback(async () => {
                let qConstraints = [where('isActive', '==', true)];

                if (isGarageFilterActive && activeCar?.make) {
                    qConstraints.push(where('make', '==', activeCar.make));
                    if (activeCar.model) qConstraints.push(where('model', '==', activeCar.model));
                } else {
                    if (filters.make) qConstraints.push(where('make', '==', filters.make));
                    if (filters.model) qConstraints.push(where('model', '==', filters.model));
                    if (filters.year) {
                        const yearNum = parseInt(filters.year);
                        qConstraints.push(where('yearStart', '<=', yearNum), where('yearEnd', '>=', yearNum));
                    }
                }

                if (filters.category && filters.category !== 'All') qConstraints.push(where('category', '==', filters.category));
                if (filters.subcategory) qConstraints.push(where('subcategory', '==', filters.subcategory));
                if (filters.brand) qConstraints.push(where('partBrand', '==', filters.brand));
                if (filters.origin) qConstraints.push(where('countryOfOrigin', '==', filters.origin));

                const countQuery = query(collection(db, 'products'), ...qConstraints);
                const countSnapshot = await getCountFromServer(countQuery);
                setTotalProducts(countSnapshot.data().count);

                const currentPage = Math.max(1, parseInt(filters.page) || 1);
                const q = query(collection(db, 'products'), ...qConstraints, limit(PAGE_SIZE * currentPage));
                const querySnapshot = await getDocs(q);

                let fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (filters.searchQuery) {
                    const keywords = filters.searchQuery.toLowerCase().split(' ');
                    fetched = fetched.filter(p => keywords.every(k => getSearchableText(p).toLowerCase().includes(k)));
                    setTotalProducts(fetched.length);
                }

                setProducts(fetched.slice((currentPage - 1) * PAGE_SIZE));

                if (Object.keys(filterOptions.categories).length === 0) {
                    extractFilterOptions(fetched);
                }
            });
        } catch (error) {
            console.error("Fetch Failure:", error);
            toast.error("Shopping data sync error. using offline backup...");
        } finally {
            setLoading(false);
            setIsFiltering(false);
        }
    };

    useEffect(() => {
        console.log('[ProductGrid] Scheduling debounced fetch...');

        // Show skeletons immediately for immediate feedback
        setIsFiltering(true);

        const handler = setTimeout(() => {
            fetchProducts(true);
        }, 300);

        return () => clearTimeout(handler);
    }, [
        isGarageFilterActive,
        activeCar?.id,
        filters.category,
        filters.subcategory,
        filters.make,
        filters.model,
        filters.year,
        filters.brand,
        filters.origin,
        filters.searchQuery,
        filters.page,
        filters.viscosity
    ]);

    // Scroll to grid top on page change - ONLY if not restoring position
    useEffect(() => {
        if (filters.page > 1 && !hasSavedPosition()) {
            const gridElement = document.getElementById('product-grid');
            if (gridElement) {
                gridElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [filters.page, hasSavedPosition]);

    // Extract unique values for each filter type
    const extractFilterOptions = async (productsList) => {
        const categories = {};
        const makes = {};
        const brands = new Set();
        const origins = new Set();
        const years = new Set();

        // Extract from products
        productsList.forEach(product => {
            // Group Subcategories by Category (from products)
            if (product.category) {
                if (!categories[product.category]) categories[product.category] = new Set();
                if (product.subcategory) categories[product.category].add(product.subcategory);
            }

            // Group Models by Make (from products)
            const productMake = product.make || product.carMake || product.car_make;
            const productModel = product.model || product.carModel || product.car_model;
            if (productMake) {
                if (!makes[productMake]) makes[productMake] = new Set();
                if (productModel) makes[productMake].add(productModel);
            }

            // Extract Brands
            const brand = product.brandEn || product.partBrand || product.brand;
            if (brand) brands.add(brand);

            // Extract Origins
            const origin = product.origin || product.countryOfOrigin;
            if (origin) origins.add(origin);

            // Extract years - use yearStart/yearEnd if available, otherwise parse yearRange
            const { yearStart: start, yearEnd: end } = product.yearStart && product.yearEnd
                ? { yearStart: Number(product.yearStart), yearEnd: Number(product.yearEnd) }
                : (product.yearRange ? parseYearRange(product.yearRange) : { yearStart: null, yearEnd: null });

            if (start && end) {
                for (let y = start; y <= end; y++) {
                    years.add(y.toString());
                }
            } else if (start) {
                years.add(start.toString());
            } else if (product.yearRange) {
                // Last resort: if parse failed but string exists, don't add it to keep dropdown numeric
                // years.add(product.yearRange); 
            }
        });

        // ALSO use static categories and cars to ensure dropdowns are populated without Firestore
        if (staticCategories && staticCategories.length > 0) {
            staticCategories.forEach(category => {
                if (category.name) {
                    if (!categories[category.name]) categories[category.name] = new Set();
                    if (Array.isArray(category.subCategories)) {
                        category.subCategories.forEach(sub => {
                            const subName = typeof sub === 'string' ? sub : sub.name;
                            if (subName) categories[category.name].add(subName);
                        });
                    }
                }
            });
        }

        if (staticCars && staticCars.length > 0) {
            staticCars.forEach(car => {
                if (car.make) {
                    if (!makes[car.make]) makes[car.make] = new Set();
                    if (car.model) makes[car.make].add(car.model);
                }
                if (car.yearStart && car.yearEnd) {
                    for (let year = car.yearStart; year <= car.yearEnd; year++) {
                        years.add(year.toString());
                    }
                }
            });
        }

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

    // Fetch car header image using static data fallback
    useEffect(() => {
        const fetchCarImage = async () => {
            if (filters.make && filters.model) {
                const car = staticCars?.find(c => c.make === filters.make && c.model === filters.model);
                if (car) {
                    setCarHeaderImage(car.imageUrl || '');
                } else {
                    setCarHeaderImage('');
                }
            } else {
                setCarHeaderImage('');
            }
        };

        fetchCarImage();
    }, [filters.make, filters.model, staticCars]);

    // Sync Global Filters to Local Active Filters
    useEffect(() => {
        setActiveFilters(prev => ({
            ...prev,
            categories: filters.category && filters.category !== 'All' ? [filters.category] : [],
            subcategory: filters.subcategory ? [filters.subcategory] : [],
            makes: filters.make ? [filters.make] : [],
            models: filters.model ? [filters.model] : [],
            years: filters.year ? [filters.year] : [],
            brands: filters.brand ? [filters.brand] : [],
            origins: filters.origin ? [filters.origin] : []
        }));
    }, [filters.category, filters.subcategory, filters.make, filters.model, filters.year, filters.brand, filters.origin]);

    const handleAddToCart = (product) => {
        addToCart(product);
        toast.success(t('addedToCart'));
    };

    // Toggle filter selection
    const toggleFilter = (filterType, value) => {
        const typeMap = {
            categories: 'category',
            subcategory: 'subcategory',
            makes: 'make',
            models: 'model',
            years: 'year',
            brands: 'brand',
            origins: 'origin'
        };

        const contextKey = typeMap[filterType];
        if (contextKey) {
            // Check if currently active
            const isActive = filters[contextKey] === value;
            updateFilter(contextKey, isActive ? '' : value);
        }
    };

    const handleSelectFilter = (type, value) => {
        const typeMap = {
            categories: 'category',
            subcategory: 'subcategory',
            makes: 'make',
            models: 'model',
            years: 'year',
            brands: 'brand',
            origins: 'origin'
        };

        const contextKey = typeMap[type];
        if (contextKey) {
            updateFilter(contextKey, value);

            // Auto-clear dependent filters when parent changes
            if (type === 'categories') updateFilter('subcategory', '');
            if (type === 'makes') updateFilter('model', '');
        }
    };

    // Reset all filters
    const handleResetFilters = () => {
        setActiveFilters({
            categories: [],
            subcategory: [],
            makes: [],
            models: [],
            years: [],
            brands: [],
            origins: []
        });
        resetFilters();
    };

    const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0) || filters.searchQuery || filters.viscosity || filters.make;

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
                    <div className="mb-8 bg-[#28B463] rounded-[2rem] p-6 text-white shadow-xl shadow-[#28B463] flex items-center justify-between animate-in slide-in-from-top duration-500">
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
                                {t('curatedSelection', { count: totalProducts })}
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
                                            className="text-[10px] font-black text-[#1A1A1A] hover:text-red-800 uppercase tracking-widest transition-all hover:scale-105"
                                        >
                                            {t('clearAll') || 'مسح الكل'}
                                        </button>
                                    )}
                                </div>

                                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                                    {/* Category Selection (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                            {t('shopFilters.category')}
                                        </label>
                                        <select
                                            value={activeFilters.categories[0] || ''}
                                            onChange={(e) => handleSelectFilter('categories', e.target.value)}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                        >
                                            <option value="">{t('shopFilters.allCategories')}</option>
                                            {Object.keys(filterOptions?.categories || {}).map(cat => {
                                                // Defensive check: ensure cat is a string
                                                const catName = typeof cat === 'string' ? cat : (cat?.name || String(cat));
                                                return (
                                                    <option key={catName} value={catName}>{catName}</option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* Dependent Subcategories (List) */}
                                    {activeFilters.categories.length > 0 && filterOptions.categories[activeFilters.categories[0]]?.length > 0 && (
                                        <div className="space-y-4 animate-in slide-in-from-top duration-300 pt-2 border-t border-gray-50">
                                            <label className={`text-[10px] font-black text-[#1A1A1A] uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                                {t('shopFilters.subcategory')}
                                            </label>
                                            <div className="space-y-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                {(filterOptions?.categories?.[activeFilters.categories[0]] || []).map(sub => {
                                                    // Defensive check: ensure sub is a string
                                                    const subName = typeof sub === 'string' ? sub : (sub?.name || String(sub));
                                                    return (
                                                        <label key={subName} className={`flex items-center gap-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                            <div className="flex items-center justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={activeFilters.subcategory.includes(subName)}
                                                                    onChange={() => toggleFilter('subcategory', subName)}
                                                                    className="w-4 h-4 rounded border-gray-300 text-[#1A1A1A] focus:ring-[#28B463] transition-all cursor-pointer"
                                                                />
                                                            </div>
                                                            <span className={`text-sm transition-colors ${activeFilters.subcategory.includes(subName) ? 'font-black text-black' : 'font-medium text-gray-500 group-hover:text-black'}`}>
                                                                {subName}
                                                            </span>
                                                            {activeFilters.subcategory.includes(subName) && (
                                                                <div className={`${isRTL ? 'mr-auto' : 'ml-auto'} w-1.5 h-1.5 rounded-full bg-[#28B463]`} />
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Car Make (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                            {t('shopFilters.make')}
                                        </label>
                                        <select
                                            value={activeFilters.makes[0] || ''}
                                            onChange={(e) => handleSelectFilter('makes', e.target.value)}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                        >
                                            <option value="">{t('shopFilters.allMakes')}</option>
                                            {Object.keys(filterOptions?.makes || {}).map(make => (
                                                <option key={make} value={make}>{make}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Car Model (Dropdown - Dependent on Make) */}
                                    {activeFilters.makes.length > 0 && filterOptions.makes[activeFilters.makes[0]]?.length > 0 && (
                                        <div className="space-y-2 animate-in slide-in-from-top duration-200">
                                            <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                                {t('shopFilters.model')}
                                            </label>
                                            <select
                                                value={activeFilters.models[0] || ''}
                                                onChange={(e) => handleSelectFilter('models', e.target.value)}
                                                dir={isRTL ? 'rtl' : 'ltr'}
                                                className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                            >
                                                <option value="">{t('shopFilters.allModels')}</option>
                                                {(filterOptions?.makes?.[activeFilters.makes[0]] || []).map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Year (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                            {t('shopFilters.year')}
                                        </label>
                                        <select
                                            value={activeFilters.years[0] || ''}
                                            onChange={(e) => handleSelectFilter('years', e.target.value)}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                        >
                                            <option value="">{t('shopFilters.allYears')}</option>
                                            {Array.isArray(filterOptions?.years) && filterOptions.years.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Origin (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                            {t('shopFilters.origin')}
                                        </label>
                                        <select
                                            value={activeFilters.origins[0] || ''}
                                            onChange={(e) => handleSelectFilter('origins', e.target.value)}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                        >
                                            <option value="">{t('shopFilters.allOrigins')}</option>
                                            {Array.isArray(filterOptions?.origins) && filterOptions.origins.map(origin => (
                                                <option key={origin} value={origin}>{origin}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Brand (Dropdown) */}
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                            {t('shopFilters.brand')}
                                        </label>
                                        <select
                                            value={activeFilters.brands[0] || ''}
                                            onChange={(e) => handleSelectFilter('brands', e.target.value)}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                        >
                                            <option value="">{t('shopFilters.allBrands')}</option>
                                            {Array.isArray(filterOptions?.brands) && filterOptions.brands.map(brand => (
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
                                onClick={() => setIsMobileFilterOpen(true)}
                                className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-[0.98] active:bg-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#28B463]/10 p-2 rounded-xl">
                                        <SlidersHorizontal className="h-5 w-5 text-[#28B463]" />
                                    </div>
                                    <span className="font-black text-black text-sm uppercase tracking-tight">
                                        {t('shopFilters.filtersButton')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasActiveFilters && (
                                        <span className="flex h-2 w-2 rounded-full bg-[#28B463] animate-pulse" />
                                    )}
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Mobile Sidebar (Professional Drawer) */}
                    {showFilters && (
                        <>
                            {/* Backdrop */}
                            <div
                                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity duration-300 lg:hidden ${isMobileFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                                onClick={() => setIsMobileFilterOpen(false)}
                            />

                            {/* Drawer */}
                            <div
                                className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-[9999] p-8 shadow-2xl transition-transform duration-500 lg:hidden max-h-[90vh] flex flex-col ${isMobileFilterOpen ? 'translate-y-0' : 'translate-y-full'}`}
                            >
                                {/* Drawer Header */}
                                <div className="flex justify-between items-center mb-8 shrink-0">
                                    <div>
                                        <h3 className="font-black text-black text-xl uppercase tracking-tighter">
                                            {t('shopFilters.filtersButton')}
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            {totalProducts} {t('products')} {t('available')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-90"
                                    >
                                        <X className="h-6 w-6 text-black" />
                                    </button>
                                </div>

                                {/* Drawer Content (Scrollable) */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8 pb-32">
                                    {/* All filter options same as desktop but styled for mobile touch targets */}
                                    <div className="space-y-6">
                                        {/* Repeat same filter logic as sidebar but with mobile-optimized spacing */}
                                        {/* Category Selection */}
                                        <div className="space-y-3">
                                            <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                                {t('shopFilters.category')}
                                            </label>
                                            <select
                                                value={activeFilters.categories[0] || ''}
                                                onChange={(e) => handleSelectFilter('categories', e.target.value)}
                                                dir={isRTL ? 'rtl' : 'ltr'}
                                                className={`w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-base font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px_22px] bg-no-repeat ${isRTL ? 'bg-[left_1.25rem_center] text-right' : 'bg-[right_1.25rem_center] text-left'}`}
                                            >
                                                <option value="">{t('shopFilters.allCategories')}</option>
                                                {Object.keys(filterOptions?.categories || {}).map(cat => {
                                                    const catName = typeof cat === 'string' ? cat : (cat?.name || String(cat));
                                                    return <option key={catName} value={catName}>{catName}</option>;
                                                })}
                                            </select>
                                        </div>

                                        {/* Subcategory */}
                                        {activeFilters.categories.length > 0 && filterOptions.categories[activeFilters.categories[0]]?.length > 0 && (
                                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                                <label className={`text-[10px] font-black text-black uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                                    {t('shopFilters.subcategory')}
                                                </label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {(filterOptions?.categories?.[activeFilters.categories[0]] || []).map(sub => {
                                                        const subName = typeof sub === 'string' ? sub : (sub?.name || String(sub));
                                                        return (
                                                            <button
                                                                key={subName}
                                                                onClick={() => toggleFilter('subcategory', subName)}
                                                                className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${activeFilters.subcategory.includes(subName) ? 'bg-[#28B463]/5 border-[#28B463] shadow-sm' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                                            >
                                                                <span className={`text-sm font-bold ${activeFilters.subcategory.includes(subName) ? 'text-black' : 'text-gray-500'}`}>
                                                                    {subName}
                                                                </span>
                                                                {activeFilters.subcategory.includes(subName) && (
                                                                    <div className="w-5 h-5 rounded-full bg-[#28B463] flex items-center justify-center">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Car Filters Header */}
                                        <div className="pt-6 border-t border-gray-100">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                                {t('carLabel')} & {t('technicalSpecs')}
                                            </h4>
                                            <div className="space-y-4">
                                                {/* Make */}
                                                <div className="space-y-2">
                                                    <select
                                                        value={activeFilters.makes[0] || ''}
                                                        onChange={(e) => handleSelectFilter('makes', e.target.value)}
                                                        dir={isRTL ? 'rtl' : 'ltr'}
                                                        className={`w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-base font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px_22px] bg-no-repeat ${isRTL ? 'bg-[left_1.25rem_center] text-right' : 'bg-[right_1.25rem_center] text-left'}`}
                                                    >
                                                        <option value="">{t('shopFilters.allMakes')}</option>
                                                        {Object.keys(filterOptions?.makes || {}).map(make => (
                                                            <option key={make} value={make}>{make}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Model */}
                                                {activeFilters.makes.length > 0 && filterOptions.makes[activeFilters.makes[0]]?.length > 0 && (
                                                    <div className="space-y-2 animate-in slide-in-from-top duration-200">
                                                        <select
                                                            value={activeFilters.models[0] || ''}
                                                            onChange={(e) => handleSelectFilter('models', e.target.value)}
                                                            dir={isRTL ? 'rtl' : 'ltr'}
                                                            className={`w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-base font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px_22px] bg-no-repeat ${isRTL ? 'bg-[left_1.25rem_center] text-right' : 'bg-[right_1.25rem_center] text-left'}`}
                                                        >
                                                            <option value="">{t('shopFilters.allModels')}</option>
                                                            {(filterOptions?.makes?.[activeFilters.makes[0]] || []).map(model => (
                                                                <option key={model} value={model}>{model}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Year */}
                                                <div className="space-y-2">
                                                    <select
                                                        value={activeFilters.years[0] || ''}
                                                        onChange={(e) => handleSelectFilter('years', e.target.value)}
                                                        dir={isRTL ? 'rtl' : 'ltr'}
                                                        className={`w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-base font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px_22px] bg-no-repeat ${isRTL ? 'bg-[left_1.25rem_center] text-right' : 'bg-[right_1.25rem_center] text-left'}`}
                                                    >
                                                        <option value="">{t('shopFilters.allYears')}</option>
                                                        {filterOptions.years.map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Metadata Header */}
                                        <div className="pt-6 border-t border-gray-100">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                                {t('brand')} & {t('originLabel')}
                                            </h4>
                                            <div className="space-y-4">
                                                {/* Origin */}
                                                <div className="space-y-2">
                                                    <select
                                                        value={activeFilters.origins[0] || ''}
                                                        onChange={(e) => handleSelectFilter('origins', e.target.value)}
                                                        dir={isRTL ? 'rtl' : 'ltr'}
                                                        className={`w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-base font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px_22px] bg-no-repeat ${isRTL ? 'bg-[left_1.25rem_center] text-right' : 'bg-[right_1.25rem_center] text-left'}`}
                                                    >
                                                        <option value="">{t('shopFilters.allOrigins')}</option>
                                                        {filterOptions.origins.map(origin => (
                                                            <option key={origin} value={origin}>{origin}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Brand */}
                                                <div className="space-y-2">
                                                    <select
                                                        value={activeFilters.brands[0] || ''}
                                                        onChange={(e) => handleSelectFilter('brands', e.target.value)}
                                                        dir={isRTL ? 'rtl' : 'ltr'}
                                                        className={`w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-base font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:22px_22px] bg-no-repeat ${isRTL ? 'bg-[left_1.25rem_center] text-right' : 'bg-[right_1.25rem_center] text-left'}`}
                                                    >
                                                        <option value="">{t('shopFilters.allBrands')}</option>
                                                        {filterOptions.brands.map(brand => (
                                                            <option key={brand} value={brand}>{brand}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Drawer Footer (Fixed) */}
                                <div className="absolute bottom-0 left-0 right-0 p-8 pt-4 bg-gradient-to-t from-white via-white to-white/0 shrink-0">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleResetFilters}
                                            className="flex-1 py-5 text-center text-[#1A1A1A] text-xs font-black uppercase tracking-widest border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                                        >
                                            {t('resetAll')}
                                        </button>
                                        <button
                                            onClick={() => setIsMobileFilterOpen(false)}
                                            className="flex-1 py-5 text-center bg-[#28B463] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#28B463]/20 transition-all active:scale-95"
                                        >
                                            {t('applyFilters')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}


                    {/* Main Content */}
                    <div className="flex-1" id="product-grid">
                        {!carHeaderImage && (
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {showFilters ?
                                        (filters.make ? `${t('partsFor')} ${filters.make} ${filters.model}` : t('allProducts'))
                                        : t('featuredProducts')
                                    }
                                </h2>
                                <span className="text-sm text-gray-500">{totalProducts} {t('products')}</span>
                            </div>
                        )}

                        {isFiltering ? (
                            <div className={`grid grid-cols-2 ${showFilters ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-4 sm:gap-6`}>
                                {[...Array(PAGE_SIZE)].map((_, i) => (
                                    <SkeletonProductCard key={i} isCompact={!showFilters} />
                                ))}
                            </div>
                        ) : products.length === 0 ? (
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
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} isCompact={!showFilters} />
                                ))}
                            </div>
                        )}

                        {/* Pagination UI */}
                        {totalProducts > PAGE_SIZE && (
                            <div className="mt-12 flex flex-col items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateFilter('page', Math.max(1, filters.page - 1))}
                                        disabled={filters.page === 1}
                                        className="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#28B463] hover:border-[#28B463] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className={`h-5 w-5 ${isRTL ? '' : 'rotate-180'}`} />
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        {(() => {
                                            const count = Math.ceil(totalProducts / PAGE_SIZE);
                                            const safeCount = (Number.isFinite(count) && count > 0 && count < 500) ? count : 0;
                                            const activePage = Math.max(1, parseInt(filters.page) || 1);

                                            return [...Array(safeCount)].map((_, i) => {
                                                const pageNum = i + 1;
                                                // Simple pagination: show current, first, last, and neighbors
                                                const isCurrentlyActive = activePage === pageNum;

                                                // Only show a limited range of page numbers
                                                if (
                                                    pageNum === 1 ||
                                                    pageNum === Math.ceil(totalProducts / PAGE_SIZE) ||
                                                    (pageNum >= activePage - 1 && pageNum <= activePage + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => updateFilter('page', pageNum)}
                                                            className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${isCurrentlyActive ? 'bg-[#28B463] text-white shadow-lg shadow-[#28B463]/30 scale-110' : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-300'}`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                } else if (
                                                    (pageNum === activePage - 2 && pageNum > 1) ||
                                                    (pageNum === activePage + 2 && pageNum < Math.ceil(totalProducts / PAGE_SIZE))
                                                ) {
                                                    return <span key={pageNum} className="text-gray-300 font-bold px-1">...</span>;
                                                }
                                                return null;
                                            });
                                        })()}
                                    </div>

                                    <button
                                        onClick={() => updateFilter('page', Math.min(Math.ceil(totalProducts / PAGE_SIZE), (parseInt(filters.page) || 1) + 1))}
                                        disabled={(parseInt(filters.page) || 1) >= Math.ceil(totalProducts / PAGE_SIZE)}
                                        className="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#28B463] hover:border-[#28B463] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {t('showing')} {(((parseInt(filters.page) || 1) - 1) * PAGE_SIZE) + 1} - {Math.min((parseInt(filters.page) || 1) * PAGE_SIZE, totalProducts)} {t('of')} {totalProducts} {t('products')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductGrid;
