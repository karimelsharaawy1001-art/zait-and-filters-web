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
    const { t } = useTranslation();
    const { addToCart } = useCart();
    const { filters, updateFilter, resetFilters, isGarageFilterActive, activeCar } = useFilters();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [carHeaderImage, setCarHeaderImage] = useState('');

    // Categories structure
    const categories = [
        { name: 'Maintenance', sub: ['Oils', 'Filters', 'Fluids'] },
        { name: 'Braking', sub: ['Brake Pads', 'Discs', 'Calipers'] },
        { name: 'Engine', sub: ['Spark Plugs', 'Belts', 'Gaskets'] },
        { name: 'Electrical', sub: ['Batteries', 'Lights', 'Sensors'] },
        { name: 'Accessories', sub: ['Interior', 'Exterior'] }
    ];

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
            } catch (error) {
                console.error("Error fetching products: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [isGarageFilterActive, activeCar]);

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

    const handleCategorySelect = (categoryName) => {
        if (filters.category === categoryName) {
            updateFilter('category', 'All');
            updateFilter('subCategory', '');
        } else {
            updateFilter('category', categoryName);
            updateFilter('subCategory', '');
        }
    };

    const handleSubCategorySelect = (subName) => {
        updateFilter('subCategory', subName);
    };

    const filteredProducts = products.filter(product => {
        // 1. Garage Filter Override (If active)
        if (isGarageFilterActive && activeCar) {
            // Firestore already filtered by Make (activeCar.make OR universal)
            // Now we check Model and Year in memory

            const isUniversalModel = !product.model || product.model === '';
            const matchesModel = isUniversalModel || product.model === activeCar.model;

            if (!matchesModel) return false;

            const carYear = Number(activeCar.year);
            const hasRange = product.yearStart != null && product.yearEnd != null;
            const matchesYear = !hasRange || (carYear >= product.yearStart && carYear <= product.yearEnd);

            if (!matchesYear) return false;
        }

        // 2. Normal Sidebar/Header Car Filters (Manual selection)
        // If garage filter is on, we skip these as they would clash
        if (!isGarageFilterActive) {
            const matchesMake = !filters.make || product.make === filters.make;
            const matchesModel = !filters.model || product.model === filters.model;

            let matchesYear = true;
            if (filters.year) {
                const userYear = Number(filters.year);
                const hasRange = product.yearStart != null && product.yearEnd != null;
                matchesYear = !hasRange || (userYear >= product.yearStart && userYear <= product.yearEnd);
            }

            if (!matchesMake || !matchesModel || !matchesYear) return false;
        }

        // 3. Category & Search (Always apply)
        const matchesCategory = !filters.category || filters.category === 'All' || product.category === filters.category;
        const matchesSubCategory = !filters.subCategory || product.subCategory === filters.subCategory;

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

        // 4. Viscosity Filter (From Oil Advisor)
        const matchesViscosity = !filters.viscosity ||
            (product.viscosity && product.viscosity === filters.viscosity) ||
            (product.name && product.name.toLowerCase().includes(filters.viscosity.toLowerCase()));

        return matchesCategory && matchesSubCategory && matchesSearch && matchesViscosity;
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
                        <div className="hidden lg:block w-64 flex-shrink-0">
                            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900 text-lg">{t('filters')}</h3>
                                    <button onClick={resetFilters} className="text-xs text-orange-600 hover:text-orange-800 font-medium">{t('resetAll')}</button>
                                </div>

                                {/* Active Filters Summary */}
                                {(filters.make || filters.model) && (
                                    <div className="mb-6 p-3 bg-gray-100 rounded-md">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Vehicle</p>
                                        <p className="text-sm font-semibold text-gray-800">{filters.make} {filters.model} {filters.year}</p>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {categories.map((cat) => (
                                        <div key={cat.name}>
                                            <button
                                                onClick={() => handleCategorySelect(cat.name)}
                                                className={`flex items-center justify-between w-full text-left font-medium ${filters.category === cat.name ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'}`}
                                            >
                                                {cat.name}
                                                {filters.category === cat.name && <ChevronDown className="h-4 w-4" />}
                                            </button>

                                            {/* Subcategories (Expanded if active) */}
                                            {filters.category === cat.name && (
                                                <div className="mt-2 ml-2 pl-2 border-l-2 border-gray-100 space-y-2">
                                                    {cat.sub.map(sub => (
                                                        <button
                                                            key={sub}
                                                            onClick={() => handleSubCategorySelect(sub)}
                                                            className={`block text-sm w-full text-left ${filters.subCategory === sub ? 'text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-900'}`}
                                                        >
                                                            {sub}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
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
                        <div className="lg:hidden mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="space-y-4">
                                {categories.map(cat => (
                                    <div key={cat.name}>
                                        <h4 className="font-medium text-gray-900 mb-2">{cat.name}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {cat.sub.map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => {
                                                        updateFilter('category', cat.name);
                                                        updateFilter('subCategory', sub);
                                                        setIsMobileFilterOpen(false);
                                                    }}
                                                    className={`text-xs px-3 py-1 rounded-full border ${filters.subCategory === sub ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={resetFilters} className="w-full py-2 text-center text-red-600 text-sm font-medium border-t border-gray-100 mt-4">
                                    {t('clearFilters')}
                                </button>
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
