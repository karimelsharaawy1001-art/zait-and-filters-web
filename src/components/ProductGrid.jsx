import React, { useState, useEffect } from 'react';
import { ShoppingCart, FilterX, ChevronRight, ChevronDown, SlidersHorizontal, Car } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, where, limit, startAfter, getCountFromServer, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from './ProductCard';
import { toast } from 'react-hot-toast';

const ProductGrid = ({ showFilters = true }) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { addToCart } = useCart();
    const { filters, updateFilter, resetFilters, isGarageFilterActive, activeCar } = useFilters();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [carHeaderImage, setCarHeaderImage] = useState('');

    // Dynamic filter options extracted from products
    const [filterOptions, setFilterOptions] = useState({
        categories: {},
        makes: {},
        brands: [],
        origins: [],
        years: []
    });
    const [totalProducts, setTotalProducts] = useState(0);
    const PAGE_SIZE = 12;

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
        subcategory: [],
        makes: [],
        models: [],
        years: [],
        brands: [],
        origins: []
    });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Start with a broad query to avoid complex index requirements initially
            let qConstraints = [where('isActive', '==', true)];

            // 1. Garage Filter (Active Car)
            if (isGarageFilterActive && activeCar?.make) {
                const makeValues = [activeCar.make].filter(Boolean);
                if (makeValues.length > 0) {
                    qConstraints.push(where('make', 'in', makeValues));
                }
                // If garage is active, we also filter by model and year if possible
                if (activeCar.model) qConstraints.push(where('model', '==', activeCar.model));
            } else {
                // 2. Manual Car Filters (only if garage NOT active)
                if (filters.make) qConstraints.push(where('make', '==', filters.make));
                if (filters.model) qConstraints.push(where('model', '==', filters.model));
                if (filters.year) {
                    const yearNum = parseInt(filters.year);
                    if (!isNaN(yearNum)) {
                        qConstraints.push(where('yearStart', '<=', yearNum));
                        qConstraints.push(where('yearEnd', '>=', yearNum));
                    }
                }
            }

            // 3. Category & Subcategory
            if (filters.category && filters.category !== 'All') {
                qConstraints.push(where('category', '==', filters.category));
            }
            if (filters.subcategory) {
                qConstraints.push(where('subcategory', '==', filters.subcategory));
            }

            // 4. Other Metadata
            if (filters.brand) {
                qConstraints.push(where('partBrand', '==', filters.brand));
            }
            if (filters.origin) {
                qConstraints.push(where('countryOfOrigin', '==', filters.origin));
            }

            // 5. Search Query - Prefix search on name if it's the only filter
            const hasOtherFilters = qConstraints.length > 1;
            let applySearchClientSide = false;

            if (filters.searchQuery) {
                if (!hasOtherFilters) {
                    const searchLower = filters.searchQuery.toLowerCase();
                    qConstraints.push(where('name', '>=', searchLower));
                    qConstraints.push(where('name', '<=', searchLower + '\uf8ff'));
                } else {
                    applySearchClientSide = true;
                }
            }

            // Get count
            const countQuery = query(collection(db, 'products'), ...qConstraints);
            const countSnapshot = await getCountFromServer(countQuery);
            const rawCount = countSnapshot.data().count;
            setTotalProducts(rawCount);

            // Fetch
            const currentPage = Math.max(1, parseInt(filters.page) || 1);
            const limitedQuery = query(
                collection(db, 'products'),
                ...qConstraints,
                limit(PAGE_SIZE * currentPage)
            );

            const querySnapshot = await getDocs(limitedQuery);
            let allFetched = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side search if needed
            if (applySearchClientSide && filters.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                allFetched = allFetched.filter(p =>
                    (p.name || '').toLowerCase().includes(searchLower) ||
                    (p.nameEn || '').toLowerCase().includes(searchLower) ||
                    (p.partNumber || '').toLowerCase().includes(searchLower) ||
                    (p.partBrand || '').toLowerCase().includes(searchLower)
                );
                setTotalProducts(allFetched.length);
            }

            // Slice for local pagination
            const startIndex = (currentPage - 1) * PAGE_SIZE;
            const paginatedItems = allFetched.slice(startIndex, startIndex + PAGE_SIZE);
            setProducts(paginatedItems);

            // Metadata extraction (only once or when empty)
            if (!filterOptions.categories || Object.keys(filterOptions.categories).length === 0) {
                const metaSnapshot = await getDocs(query(collection(db, 'products'), where('isActive', '==', true), limit(300)));
                extractFilterOptions(metaSnapshot.docs.map(doc => doc.data()));
            }
        } catch (error) {
            console.error("Firestore Fetch Error:", error);
            // If we get an index error, we'll try to fallback to a simpler query or just show the error
            if (error.code === 'failed-precondition') {
                toast.error("Query requires composite index. Check console for setup link.");
            } else {
                toast.error(`Shop Sync Error: ${error.message}`);
            }
            setProducts([]);
            setTotalProducts(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('[ProductGrid] Triggering fetch with filters:', filters);
        fetchProducts();

        // Scroll to grid top on page change
        if (filters.page > 1) {
            const gridElement = document.getElementById('product-grid');
            if (gridElement) {
                gridElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
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
            const productMake = product.make || product.car_make;
            const productModel = product.model || product.car_model;
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

            // Extract years
            if (product.yearStart && product.yearEnd) {
                for (let year = product.yearStart; year <= product.yearEnd; year++) {
                    years.add(year.toString());
                }
            } else if (product.yearRange) {
                years.add(product.yearRange);
            }
        });

        // ALSO fetch from categories collection to ensure category/subcategory dropdowns are populated
        try {
            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            categoriesSnapshot.docs.forEach(doc => {
                const category = doc.data();
                if (category.name) {
                    if (!categories[category.name]) categories[category.name] = new Set();

                    // Add subcategories if they exist
                    if (Array.isArray(category.subCategories)) {
                        category.subCategories.forEach(sub => {
                            if (sub) {
                                // Extract name if subcategory is an object {imageUrl, name}
                                const subName = typeof sub === 'string' ? sub : sub.name;
                                if (subName) categories[category.name].add(subName);
                            }
                        });
                    }
                }
            });
            console.log('[ProductGrid] Categories from admin:', categories);
        } catch (error) {
            console.error('[ProductGrid] Error fetching categories:', error);
        }

        // ALSO fetch from cars collection to ensure make/model dropdowns are always populated
        try {
            const carsSnapshot = await getDocs(collection(db, 'cars'));
            carsSnapshot.docs.forEach(doc => {
                const car = doc.data();
                if (car.make) {
                    if (!makes[car.make]) makes[car.make] = new Set();
                    if (car.model) makes[car.make].add(car.model);
                }

                // Also add year ranges from cars
                if (car.yearStart && car.yearEnd) {
                    for (let year = car.yearStart; year <= car.yearEnd; year++) {
                        years.add(year.toString());
                    }
                }
            });
            console.log('[ProductGrid] Makes from admin:', makes);
        } catch (error) {
            console.error('[ProductGrid] Error fetching cars for filters:', error);
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
                                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                                className="w-full flex items-center justify-center space-x-2 bg-white p-3 rounded-lg shadow border border-gray-200"
                            >
                                <SlidersHorizontal className="h-5 w-5 text-gray-600" />
                                <span className="font-medium text-gray-800">{t('shopFilters.category')} & {t('filters')}</span>
                            </button>
                        </div>
                    )}

                    {/* Mobile Sidebar (Collapsible) */}
                    {showFilters && isMobileFilterOpen && (
                        <div className="lg:hidden mb-8 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-in slide-in-from-top duration-300 overflow-y-auto max-h-[85vh]">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                    <h3 className="font-black text-black text-lg uppercase tracking-tight">{t('filters')}</h3>
                                    <button
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronDown className="h-6 w-6 text-gray-400" />
                                    </button>
                                </div>

                                {/* Mobile Category Selection */}
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                        {t('shopFilters.category')}
                                    </label>
                                    <select
                                        value={activeFilters.categories[0] || ''}
                                        onChange={(e) => handleSelectFilter('categories', e.target.value)}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                    >
                                        <option value="">{t('shopFilters.allCategories')}</option>
                                        {Object.keys(filterOptions?.categories || {}).map(cat => {
                                            const catName = typeof cat === 'string' ? cat : (cat?.name || String(cat));
                                            return <option key={catName} value={catName}>{catName}</option>;
                                        })}
                                    </select>
                                </div>

                                {/* Mobile Subcategory Selection */}
                                {activeFilters.categories.length > 0 && filterOptions.categories[activeFilters.categories[0]]?.length > 0 && (
                                    <div className="space-y-2 animate-in slide-in-from-top duration-300">
                                        <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                            {t('shopFilters.subcategory')}
                                        </label>
                                        <select
                                            value={activeFilters.subcategory[0] || ''}
                                            onChange={(e) => handleSelectFilter('subcategory', e.target.value)}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                        >
                                            <option value="">{t('shopFilters.allSubcategories') || 'كل الفئات الفرعية'}</option>
                                            {(filterOptions?.categories?.[activeFilters.categories[0]] || []).map(sub => {
                                                const subName = typeof sub === 'string' ? sub : (sub?.name || String(sub));
                                                return <option key={subName} value={subName}>{subName}</option>;
                                            })}
                                        </select>
                                    </div>
                                )}

                                {/* Mobile Make Selection */}
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                        {t('shopFilters.make')}
                                    </label>
                                    <select
                                        value={activeFilters.makes[0] || ''}
                                        onChange={(e) => handleSelectFilter('makes', e.target.value)}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                    >
                                        <option value="">{t('shopFilters.allMakes')}</option>
                                        {Object.keys(filterOptions?.makes || {}).map(make => (
                                            <option key={make} value={make}>{make}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Mobile Model Selection */}
                                {activeFilters.makes.length > 0 && (filterOptions?.makes?.[activeFilters.makes[0]] || []).length > 0 && (
                                    <div className="space-y-2 animate-in slide-in-from-top duration-300">
                                        <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                            {t('shopFilters.model')}
                                        </label>
                                        <select
                                            value={activeFilters.models[0] || ''}
                                            onChange={(e) => handleSelectFilter('models', e.target.value)}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                        >
                                            <option value="">{t('shopFilters.allModels')}</option>
                                            {(filterOptions?.makes?.[activeFilters.makes[0]] || []).map(model => (
                                                <option key={model} value={model}>{model}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Mobile Year Selection */}
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                        {t('shopFilters.year')}
                                    </label>
                                    <select
                                        value={activeFilters.years[0] || ''}
                                        onChange={(e) => handleSelectFilter('years', e.target.value)}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                    >
                                        <option value="">{t('shopFilters.allYears')}</option>
                                        {Array.isArray(filterOptions?.years) && filterOptions.years.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Mobile Origin Selection */}
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                        {t('shopFilters.origin')}
                                    </label>
                                    <select
                                        value={activeFilters.origins[0] || ''}
                                        onChange={(e) => handleSelectFilter('origins', e.target.value)}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                    >
                                        <option value="">{t('shopFilters.allOrigins')}</option>
                                        {Array.isArray(filterOptions?.origins) && filterOptions.origins.map(origin => (
                                            <option key={origin} value={origin}>{origin}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Mobile Brand Selection */}
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black text-gray-400 uppercase tracking-widest block ${isRTL ? 'text-right' : ''}`}>
                                        {t('shopFilters.brand')}
                                    </label>
                                    <select
                                        value={activeFilters.brands[0] || ''}
                                        onChange={(e) => handleSelectFilter('brands', e.target.value)}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-no-repeat ${isRTL ? 'bg-[left_1rem_center] text-right' : 'bg-[right_1rem_center] text-left'}`}
                                    >
                                        <option value="">{t('shopFilters.allBrands')}</option>
                                        {Array.isArray(filterOptions?.brands) && filterOptions.brands.map(brand => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-6 border-t border-gray-100 flex gap-4">
                                    <button
                                        onClick={handleResetFilters}
                                        className="flex-1 py-4 text-center text-[#1A1A1A] text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        {t('resetAll')}
                                    </button>
                                    <button
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="flex-1 py-4 text-center bg-[#28B463] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#28B463]/20"
                                    >
                                        {t('applyFilters')}
                                    </button>
                                </div>
                            </div>
                        </div>
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

                        {products.length === 0 ? (
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
                                    <ProductCard key={product.id} product={product} />
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
