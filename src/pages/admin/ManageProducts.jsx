import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, writeBatch, limit, startAfter, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Edit3, Trash2, Plus, Search, Filter, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight, Eye, MoreVertical, CheckCircle, XCircle, TrendingUp, X } from 'lucide-react';
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
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [allCategories, setAllCategories] = useState([]);
    const [availableSubcategories, setAvailableSubcategories] = useState([]);
    const [uniquePartBrands, setUniquePartBrands] = useState([]);
    const [cars, setCars] = useState([]);
    const [carMakes, setCarMakes] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [lastVisible, setLastVisible] = useState(null);
    const [pageStack, setPageStack] = useState([]); // To track previous pages' start docs


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

    const fetchProducts = async (isNext = false, isPrev = false) => {
        setLoading(true);
        try {
            let qConstraints = []; // Fetching all by default to avoid complex index requirements for admin

            // Only add filters if they are not 'All'
            if (categoryFilter !== 'All') qConstraints.push(where('category', '==', categoryFilter));
            if (subcategoryFilter !== 'All') qConstraints.push(where('subcategory', '==', subcategoryFilter));
            if (makeFilter !== 'All') qConstraints.push(where('make', '==', makeFilter));
            if (modelFilter !== 'All') qConstraints.push(where('model', '==', modelFilter));
            if (brandFilter !== 'All') qConstraints.push(where('partBrand', '==', brandFilter));
            if (statusFilter === 'Active') qConstraints.push(where('isActive', '==', true));
            if (statusFilter === 'Inactive') qConstraints.push(where('isActive', '==', false));

            // Simple sorting logic - only add order if it doesn't conflict with filters
            // To be safe and avoid missing index errors, we'll fetch and sort in memory for Admin if needed,
            // but for now, we'll try a single orderBy on the field if no other complex filters are active.
            let sortField = 'name';
            let sortDir = 'asc';
            if (sortBy.includes('-')) {
                [sortField, sortDir] = sortBy.split('-');
            }
            if (qConstraints.length === 0) {
                qConstraints.push(orderBy(sortField, sortDir));
            }

            // Search (Firestore prefix search - requires manual indexing or broad fetch)
            // Note: For complex multi-field search, client-side is often easier unless dataset is HUGE.
            // But since user asked for pagination for performance, we apply name prefix if available.
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                qConstraints.push(where('name', '>=', searchLower));
                qConstraints.push(where('name', '<=', searchLower + '\uf8ff'));
            }

            // Get Total Count (Only on initial load or filter change)
            if (!isNext && !isPrev) {
                const countQuery = query(collection(db, 'products'), ...qConstraints);
                const countSnapshot = await getCountFromServer(countQuery);
                setTotalCount(countSnapshot.data().count);
                setPageStack([]);
                setLastVisible(null);
                setCurrentPage(1);
            }

            // Apply Pagination
            let pagedConstraints = [...qConstraints, limit(pageSize)];
            if (isNext && lastVisible) {
                pagedConstraints.push(startAfter(lastVisible));
            } else if (isPrev && pageStack.length > 1) {
                const newStack = [...pageStack];
                newStack.pop(); // Remove current page start
                const prevPageStart = newStack[newStack.length - 1];
                if (prevPageStart) pagedConstraints.push(startAfter(prevPageStart));
                setPageStack(newStack);
            }

            const q = query(collection(db, 'products'), ...pagedConstraints);
            const querySnapshot = await getDocs(q);

            const productsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setProducts(productsList);

            if (querySnapshot.docs.length > 0) {
                const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
                setLastVisible(lastDoc);
                if (isNext) {
                    setPageStack(prev => [...prev, lastVisible]);
                } else if (!isPrev) {
                    setPageStack([null]); // Initialize with null for Page 1
                }
            }

        } catch (error) {
            console.error("Firestore Fetch Error:", error);
            toast.error(`Shop Sync Error: ${error.message}`);
            setProducts([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    const fetchBrands = async () => {
        try {
            // Fetch a limited set of active products to extract brands
            // avoid '!=' to stay safe without indexes
            const q = query(collection(db, 'products'), where('isActive', '==', true), limit(200));
            const snapshot = await getDocs(q);
            const brands = [...new Set(snapshot.docs.map(doc => {
                const data = doc.data();
                return data.partBrand || data.brand;
            }))].filter(Boolean).sort();
            setUniquePartBrands(brands);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast.error(`Dashboard Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch on filter changes
    useEffect(() => {
        fetchProducts();
    }, [categoryFilter, subcategoryFilter, makeFilter, modelFilter, brandFilter, statusFilter, sortBy, searchQuery]);

    useEffect(() => {
        fetchBrands();
    }, []);

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

    const toggleSelectProduct = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                batch.delete(doc(db, 'products', id));
            });
            await batch.commit();

            setProducts(products.filter(p => !selectedIds.has(p.id)));
            setSelectedIds(new Set());
            setShowDeleteModal(false);
            toast.success(`${selectedIds.size} products deleted successfully!`);
        } catch (error) {
            console.error("Error bulk deleting products:", error);
            toast.error('Error deleting products');
        } finally {
            setIsDeleting(false);
        }
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
                            Total catalog: {totalCount} high-performance items
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="flex items-center gap-3 bg-[#28B463] hover:bg-[#219653] hover:scale-105 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#28B463]/20"
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
                            <Filter className="h-4 w-4 text-[#28B463]" />
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
                            className="text-[11px] font-black text-[#28B463] hover:text-[#b8181d] uppercase tracking-widest transition-colors flex items-center gap-2 group"
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
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 group-focus-within/filters:text-[#28B463] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Name, Brand, or Part #..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black placeholder-gray-300 focus:ring-2 focus:ring-[#28B463] focus:border-transparent outline-none transition-all font-bold shadow-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Part Brand</label>
                                <select
                                    value={brandFilter}
                                    onChange={(e) => setBrandFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#28B463] transition-all cursor-pointer outline-none font-bold"
                                >
                                    <option value="All">All Piece Brands</option>
                                    {Array.isArray(uniquePartBrands) && uniquePartBrands.map(brand => (
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
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#28B463] transition-all cursor-pointer outline-none font-bold"
                                >
                                    <option value="All">All Systems</option>
                                    {Array.isArray(allCategories) && allCategories.map(cat => (
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
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#28B463] transition-all cursor-pointer outline-none font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <option value="All">All Sub-Categories</option>
                                    {Array.isArray(availableSubcategories) && availableSubcategories.map(sub => (
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
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#28B463] transition-all cursor-pointer outline-none font-bold"
                                    >
                                        <option value="All">All Makes</option>
                                        {Array.isArray(carMakes) && carMakes.map(make => (
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
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black placeholder-gray-300 focus:ring-2 focus:ring-[#28B463] outline-none transition-all font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Model</label>
                                <select
                                    value={modelFilter}
                                    onChange={(e) => setModelFilter(e.target.value)}
                                    disabled={makeFilter === 'All'}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#28B463] transition-all cursor-pointer outline-none font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <option value="All">All Models</option>
                                    {Array.isArray(availableModels) && availableModels.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status & Sorting (Optional additions if space permits, but user asked for specific ones) */}
                    </div>
                </div>

                {/* Main Data Manifest */}
                {products.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm p-20 text-center border border-gray-100">
                        <AlertTriangle className="h-16 w-16 text-[#28B463] mx-auto mb-6 opacity-40 animate-pulse" />
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
                                        <th className="px-4 py-5 text-left border-b border-gray-100 w-12">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={products.length > 0 && selectedIds.size === products.length}
                                                    onChange={() => {
                                                        if (selectedIds.size === products.length) {
                                                            setSelectedIds(new Set());
                                                        } else {
                                                            setSelectedIds(new Set(products.map(p => p.id)));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#28B463] focus:ring-[#28B463] cursor-pointer"
                                                />
                                            </div>
                                        </th>
                                        <th className="px-4 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Visual</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Nomenclature / Group</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">System</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Vehicle Config</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100 italic">Cost</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100 font-black">Sell</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100 text-center">Active</th>
                                        <th className="px-4 py-5 text-right text-[11px] font-black text-black uppercase tracking-widest border-b border-gray-100">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {Array.isArray(products) && products.map((product) => (
                                        <tr key={product.id} className={`hover:bg-white/[0.02] transition-colors group/row ${selectedIds.has(product.id) ? 'bg-green-50/30' : ''}`}>
                                            <td className="px-4 py-6 whitespace-nowrap">
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(product.id)}
                                                        onChange={() => toggleSelectProduct(product.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-[#28B463] focus:ring-[#28B463] cursor-pointer"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 whitespace-nowrap">
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
                                            <td className="px-4 py-6">
                                                <div className="text-[10px] font-black text-[#28B463] uppercase mb-1 tracking-widest opacity-80">
                                                    {product.brand || 'No Brand'}
                                                </div>
                                                <div className="text-sm font-black text-black line-clamp-1 max-w-[180px] group-hover/row:translate-x-1 transition-transform">
                                                    {product.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 whitespace-nowrap">
                                                <span className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-6 text-sm font-bold text-gray-500 min-w-[150px]">
                                                {product.make} <span className="text-gray-300 font-normal mx-1">|</span> {product.model}
                                            </td>
                                            <td className="px-4 py-6 whitespace-nowrap text-sm font-bold text-gray-400 italic">
                                                {product.costPrice ? `${product.costPrice} EGP` : '—'}
                                            </td>
                                            <td className="px-4 py-6 whitespace-nowrap text-sm font-black">
                                                {product.salePrice ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[#28B463]">{product.salePrice} EGP</span>
                                                        <span className="text-gray-300 text-[10px] line-through decoration-[#e31e24]/40">{product.price} EGP</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-black">{product.price} EGP</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-6 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleToggleActive(product.id, product.isActive)}
                                                    className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${product.isActive !== false ? 'bg-green-500' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${product.isActive !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-6 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/edit-product/${product.id}`)}
                                                        className="p-2.5 bg-[#28B463]/10 text-[#28B463] hover:bg-[#28B463] hover:text-white border border-[#28B463]/20 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-[#28B463]/5"
                                                        title="Edit Product"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 rounded-xl transition-all hover:-translate-y-1 shadow-lg shadow-red-600/5"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
                            {Array.isArray(products) && products.map((product) => (
                                <div
                                    key={product.id}
                                    className={`p-6 hover:bg-gray-50 transition-all relative ${selectedIds.has(product.id) ? 'bg-green-50/30' : ''}`}
                                >
                                    {/* Mobile Checkbox */}
                                    <div className="absolute top-6 left-6 z-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(product.id)}
                                            onChange={() => toggleSelectProduct(product.id)}
                                            className="w-5 h-5 rounded border-gray-300 text-[#28B463] focus:ring-[#28B463] cursor-pointer shadow-sm"
                                        />
                                    </div>

                                    <div className="flex gap-6 pl-10">
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
                                            <div className="text-[10px] font-black text-[#28B463] uppercase tracking-widest mb-1.5">
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
                                                        className="p-3 bg-[#28B463]/10 text-[#28B463] rounded-xl border border-[#28B463]/20 hover:bg-[#28B463] hover:text-white transition-all"
                                                    >
                                                        <Edit3 className="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all"
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

                {/* Pagination Bar */}
                {totalCount > 0 && (
                    <div className="mt-10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">
                            Showing <span className="text-black">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-black">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-black">{totalCount}</span> items
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setCurrentPage(prev => prev - 1);
                                    fetchProducts(false, true);
                                }}
                                disabled={currentPage === 1 || loading}
                                className="p-4 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:text-[#28B463] hover:border-[#28B463] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm group"
                            >
                                <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                            </button>

                            <div className="flex items-center gap-2">
                                <span className="px-6 py-3 bg-[#28B463] text-white rounded-2xl font-black text-sm font-Cairo shadow-lg shadow-[#28B463]/20">
                                    {currentPage}
                                </span>
                                <span className="text-gray-300 font-bold mx-2 italic">OF</span>
                                <span className="px-6 py-3 bg-white border border-gray-200 text-black rounded-2xl font-black text-sm font-Cairo">
                                    {Math.ceil(totalCount / pageSize)}
                                </span>
                            </div>

                            <button
                                onClick={() => {
                                    setCurrentPage(prev => prev + 1);
                                    fetchProducts(true, false);
                                }}
                                disabled={currentPage * pageSize >= totalCount || loading}
                                className="p-4 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:text-[#28B463] hover:border-[#28B463] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm group"
                            >
                                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-black text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Items Selected</span>
                            <span className="text-xl font-black font-Cairo">{selectedIds.size} <span className="text-xs text-[#28B463]">PRODUCTS</span></span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20 flex items-center gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            مسح المحدد
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteModal(false)} />
                    <div className="relative bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden group">
                        {/* Decorative background element */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-50 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700" />

                        <div className="relative">
                            <div className="flex items-center justify-between mb-8">
                                <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                                    <AlertTriangle className="h-8 w-8" />
                                </div>
                                <button
                                    onClick={() => !isDeleting && setShowDeleteModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black text-black mb-4 uppercase tracking-tight font-Cairo leading-tight">
                                هل أنت متأكد من مسح {selectedIds.size} من المنتجات؟
                            </h3>
                            <p className="text-gray-500 font-bold text-sm mb-10 leading-relaxed uppercase tracking-widest italic">
                                لا يمكن التراجع عن هذه الخطوة. سيتم حذف جميع البيانات المتعلقة بذه المنتجات المختارة نهائياً.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => !isDeleting && setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="flex-1 py-5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="h-5 w-5" />
                                    )}
                                    نعم، امسح المنتجات
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageProducts;
