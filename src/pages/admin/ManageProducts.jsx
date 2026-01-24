import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Edit3, Trash2, Plus, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye, MoreVertical, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BulkOperations from '../../components/admin/BulkOperations';

const ManageProducts = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [subcategoryFilter, setSubcategoryFilter] = useState('All');
    const [makeFilter, setMakeFilter] = useState('All');
    const [modelFilter, setModelFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('name-asc');

    const [allCategories, setAllCategories] = useState([]);
    const [availableSubcategories, setAvailableSubcategories] = useState([]);
    const [uniquePartBrands, setUniquePartBrands] = useState([]);
    const [cars, setCars] = useState([]);
    const [carMakes, setCarMakes] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);


    useEffect(() => {
        fetchProducts();
        fetchCars();
        fetchCategories();
    }, []);

    const fetchCars = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'cars'));
            const carsList = querySnapshot.docs.map(doc => doc.data());
            setCars(carsList);
            const makes = [...new Set(carsList.map(car => car.make))];
            setCarMakes(makes);
        } catch (error) {
            console.error("Error fetching cars:", error);
        }
    };

    // Category -> Subcategory Sync
    useEffect(() => {
        if (categoryFilter === 'All') {
            setAvailableSubcategories([]);
            setSubcategoryFilter('All');
        } else {
            const selectedCat = allCategories.find(c => c.name === categoryFilter);
            if (selectedCat) {
                const subs = (selectedCat.subCategories || []).map(s => typeof s === 'string' ? s : s.name);
                setAvailableSubcategories(subs);
                if (!subs.includes(subcategoryFilter)) {
                    setSubcategoryFilter('All');
                }
            }
        }
    }, [categoryFilter, allCategories]);

    // Make -> Model Sync
    useEffect(() => {
        if (makeFilter === 'All') {
            setAvailableModels([]);
            setModelFilter('All');
        } else {
            const models = cars
                .filter(car => car.make === makeFilter)
                .map(car => car.model);
            setAvailableModels([...new Set(models)]);
            if (!models.includes(modelFilter)) {
                setModelFilter('All');
            }
        }
    }, [makeFilter, cars]);

    const fetchCategories = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'categories'));
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllCategories(list);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'products'));
            const productsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(productsList);

            // Extract unique brands
            const brands = [...new Set(productsList.map(p => p.partBrand || p.brand))].filter(Boolean).sort();
            setUniquePartBrands(brands);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (productId, currentStatus) => {
        try {
            await updateDoc(doc(db, 'products', productId), {
                isActive: !currentStatus
            });
            setProducts(products.map(p =>
                p.id === productId ? { ...p, isActive: !currentStatus } : p
            ));
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (productId, productName) => {
        if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
            try {
                await deleteDoc(doc(db, 'products', productId));
                setProducts(products.filter(p => p.id !== productId));
                toast.success('Product deleted successfully!');
            } catch (error) {
                console.error("Error deleting product:", error);
                toast.error('Error deleting product');
            }
        }
    };

    const getYearDisplay = (product) => {
        if (product.yearStart && product.yearEnd) {
            return `${product.yearStart}-${product.yearEnd}`;
        }
        return 'All Years';
    };

    const getProfitMargin = (sellPrice, costPrice) => {
        if (!costPrice || costPrice === 0) return 'N/A';
        const margin = ((sellPrice - costPrice) / costPrice * 100).toFixed(1);
        return `${margin}%`;
    };

    const getProfitColor = (sellPrice, costPrice) => {
        if (!costPrice || costPrice === 0) return 'text-gray-500';
        const margin = ((sellPrice - costPrice) / costPrice * 100);
        if (margin > 30) return 'text-green-600';
        if (margin > 15) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Filter and sort products
    const filteredProducts = products
        .filter(product => {
            // Keyword Search (Name, Brand, or ID/PartNumber)
            const matchesSearch =
                (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.partBrand || product.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.partNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.id || '').toLowerCase().includes(searchQuery.toLowerCase());

            // Category & Subcategory
            const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
            const matchesSubcategory = subcategoryFilter === 'All' || product.subcategory === subcategoryFilter;

            // Make / Model
            const matchesMake = makeFilter === 'All' || product.make === makeFilter;
            const matchesModel = modelFilter === 'All' || product.model === modelFilter;

            // Brand
            const matchesBrand = brandFilter === 'All' || (product.partBrand || product.brand) === brandFilter;

            // Year Logic
            let matchesYear = true;
            if (yearFilter) {
                const year = Number(yearFilter);
                const hasRange = product.yearStart != null && product.yearEnd != null;
                if (!hasRange) {
                    matchesYear = true;
                } else {
                    matchesYear = year >= product.yearStart && year <= product.yearEnd;
                }
            }

            // Status Logic
            let matchesStatus = true;
            if (statusFilter === 'Active') matchesStatus = product.isActive !== false;
            else if (statusFilter === 'Inactive') matchesStatus = product.isActive === false;

            return matchesSearch && matchesCategory && matchesSubcategory && matchesMake && matchesModel && matchesYear && matchesBrand && matchesStatus;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });

    if (loading) {
        return (
            <>
                <AdminHeader title="Product Management" />
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
            <AdminHeader title="Product Management" />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-black uppercase tracking-tight italic font-Cairo">Inventory Control</h2>
                        <p className="text-sm text-gray-500 mt-1 font-bold">
                            Total catalog: {filteredProducts.length} high-performance items
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="flex items-center gap-3 bg-[#e31e24] hover:bg-[#b8181d] hover:scale-105 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#e31e24]/20"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Entry
                    </button>
                </div>

                {/* Bulk Import/Export */}
                <BulkOperations />

                {/* Filters Section - White Surface */}
                <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 p-8 mb-10 group/filters">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Filter className="h-4 w-4 text-[#e31e24]" />
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Master Filters</h3>
                        </div>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setCategoryFilter('All');
                                setSubcategoryFilter('All');
                                setMakeFilter('All');
                                setModelFilter('All');
                                setYearFilter('');
                                setBrandFilter('All');
                                setStatusFilter('All');
                            }}
                            className="text-[11px] font-black text-[#e31e24] hover:text-[#b8181d] uppercase tracking-widest transition-colors flex items-center gap-2 group"
                        >
                            <span className="group-hover:rotate-180 transition-transform duration-500">↺</span>
                            Reset All Data
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Keyword & Brand */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Keyword (CORE SEARCH)</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 group-focus-within/filters:text-[#e31e24] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Name, Brand, or Part #..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black placeholder-gray-300 focus:ring-2 focus:ring-[#e31e24] focus:border-transparent outline-none transition-all font-bold shadow-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Part Brand</label>
                                <select
                                    value={brandFilter}
                                    onChange={(e) => setBrandFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#e31e24] transition-all cursor-pointer outline-none font-bold"
                                >
                                    <option value="All">All Piece Brands</option>
                                    {uniquePartBrands.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Category & Subcategory */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Category (System)</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#e31e24] transition-all cursor-pointer outline-none font-bold"
                                >
                                    <option value="All">All Systems</option>
                                    {allCategories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sub-Category</label>
                                <select
                                    value={subcategoryFilter}
                                    onChange={(e) => setSubcategoryFilter(e.target.value)}
                                    disabled={categoryFilter === 'All'}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#e31e24] transition-all cursor-pointer outline-none font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <option value="All">All Sub-Categories</option>
                                    {availableSubcategories.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Manufacturer & Model */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Manufacturer</label>
                                    <select
                                        value={makeFilter}
                                        onChange={(e) => setMakeFilter(e.target.value)}
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#e31e24] transition-all cursor-pointer outline-none font-bold"
                                    >
                                        <option value="All">All Makes</option>
                                        {carMakes.map(make => (
                                            <option key={make} value={make}>{make}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Year</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 2024"
                                        value={yearFilter}
                                        onChange={(e) => setYearFilter(e.target.value)}
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black placeholder-gray-300 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Model</label>
                                <select
                                    value={modelFilter}
                                    onChange={(e) => setModelFilter(e.target.value)}
                                    disabled={makeFilter === 'All'}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#e31e24] transition-all cursor-pointer outline-none font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <option value="All">All Models</option>
                                    {availableModels.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status & Sorting (Optional additions if space permits, but user asked for specific ones) */}
                    </div>
                </div>

                {/* Main Data Manifest */}
                {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm p-20 text-center border border-gray-100">
                        <AlertTriangle className="h-16 w-16 text-[#e31e24] mx-auto mb-6 opacity-40 animate-pulse" />
                        <h4 className="text-xl font-bold text-black mb-2 uppercase tracking-wide">Data Matrix Empty</h4>
                        <p className="text-gray-500 font-medium max-w-md mx-auto">None of our high-performance components match your current filter parameters.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden transition-all group/table">
                        {/* Desktop Data Grid */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Visual</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Nomenclature / Group</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">System</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Vehicle Config</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100 italic">Cost</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100 font-black">Sell</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100 text-center">Active</th>
                                        <th className="px-8 py-5 text-right text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 group-hover/row:border-[#e31e24]/20 transition-all">
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="h-full w-full object-contain p-1 transition-transform group-hover/row:scale-110"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/placeholder.png';
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[10px] font-black text-[#e31e24] uppercase mb-1 tracking-widest opacity-80">
                                                    {product.brand || 'No Brand'}
                                                </div>
                                                <div className="text-sm font-black text-black line-clamp-1 max-w-[220px] group-hover/row:translate-x-1 transition-transform">
                                                    {product.name}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-gray-500">
                                                {product.make} <span className="text-gray-300 font-normal mx-1">|</span> {product.model}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-gray-400 italic">
                                                {product.costPrice ? `${product.costPrice} EGP` : '—'}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-sm font-black">
                                                {product.salePrice ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[#e31e24]">{product.salePrice} EGP</span>
                                                        <span className="text-gray-300 text-[10px] line-through decoration-[#e31e24]/40">{product.price} EGP</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-black">{product.price} EGP</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleToggleActive(product.id, product.isActive)}
                                                    className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${product.isActive !== false ? 'bg-green-500' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${product.isActive !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-4">
                                                    <button
                                                        onClick={() => navigate(`/admin/edit-product/${product.id}`)}
                                                        className="p-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-blue-500/5 group/btn"
                                                    >
                                                        <Edit3 className="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="p-3 bg-racing-red/10 text-racing-red hover:bg-racing-red hover:text-white border border-racing-red/20 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-racing-red/5"
                                                    >
                                                        <Trash2 className="h-4.5 w-4.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Optimized Cards */}
                        <div className="md:hidden divide-y divide-gray-100 bg-white">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="p-6 hover:bg-gray-50 transition-all">
                                    <div className="flex gap-6">
                                        <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="h-full w-full object-contain p-2"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholder.png';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="text-[10px] font-black text-[#e31e24] uppercase tracking-widest mb-1.5">
                                                {product.brand || 'NO BRAND'}
                                            </div>
                                            <h3 className="text-base font-black text-black truncate leading-tight mb-1 font-Cairo">{product.name}</h3>
                                            <p className="text-sm text-gray-500 font-bold truncate opacity-60">{product.make} | {product.model}</p>

                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Selling Price</span>
                                                    <span className="text-lg font-black text-black font-Cairo">{product.price} <span className="text-[11px] text-gray-400 opacity-40">EGP</span></span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/edit-product/${product.id}`)}
                                                        className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                        <Edit3 className="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="p-3 bg-red-50 text-[#e31e24] rounded-xl border border-red-100 hover:bg-[#e31e24] hover:text-white transition-all"
                                                    >
                                                        <Trash2 className="h-4.5 w-4.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageProducts;
