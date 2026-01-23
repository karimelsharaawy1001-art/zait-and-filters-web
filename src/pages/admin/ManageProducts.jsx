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
    const [makeFilter, setMakeFilter] = useState('All');
    const [modelFilter, setModelFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [countryFilter, setCountryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('name-asc');

    const [cars, setCars] = useState([]);
    const [carMakes, setCarMakes] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);

    const categories = ['All', 'Maintenance', 'Braking', 'Engine', 'Electrical', 'Accessories'];

    useEffect(() => {
        fetchProducts();
        fetchCars();
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

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'products'));
            const productsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(productsList);
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
            // Text Search (Name or ID or Brand)
            const matchesSearch =
                (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.brand && (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase()));

            // Category
            const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;

            // Make / Model
            const matchesMake = makeFilter === 'All' || product.make === makeFilter;
            const matchesModel = modelFilter === 'All' || product.model === modelFilter;

            // Year Logic
            let matchesYear = true;
            if (yearFilter) {
                const year = Number(yearFilter);
                const hasRange = product.yearStart != null && product.yearEnd != null;
                if (!hasRange) {
                    matchesYear = true; // Fits all years
                } else {
                    matchesYear = year >= product.yearStart && year <= product.yearEnd;
                }
            }

            // Brand specifically
            const matchesBrand = !brandFilter || (product.brand && product.brand.toLowerCase().includes(brandFilter.toLowerCase()));

            // Country specifically
            const matchesCountry = !countryFilter || (product.country && product.country.toLowerCase().includes(countryFilter.toLowerCase()));

            // Status Logic
            let matchesStatus = true;
            if (statusFilter === 'Active') matchesStatus = product.isActive !== false;
            else if (statusFilter === 'Inactive') matchesStatus = product.isActive === false;

            return matchesSearch && matchesCategory && matchesMake && matchesModel && matchesYear && matchesBrand && matchesCountry && matchesStatus;
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
        <div className="min-h-screen bg-matte-black pb-20 font-sans text-snow-white">
            <AdminHeader title="Product Management" />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-snow-white uppercase tracking-tight italic">Inventory Control</h2>
                        <p className="text-sm text-silver-grey mt-1 font-bold">
                            Total catalog: {filteredProducts.length} high-performance items
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="flex items-center gap-3 bg-racing-red hover:bg-racing-red-dark hover:scale-105 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-racing-red/20"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Entry
                    </button>
                </div>

                {/* Bulk Import/Export */}
                <BulkOperations />

                {/* Filters Section - Premium Carbon Surface */}
                <div className="bg-carbon-grey rounded-[24px] shadow-premium-3d border border-border-dark p-8 mb-10 group/filters">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Filter className="h-4 w-4 text-racing-red" />
                            <h3 className="text-[11px] font-black text-silver-grey uppercase tracking-widest">Master Filters</h3>
                        </div>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setCategoryFilter('All');
                                setMakeFilter('All');
                                setModelFilter('All');
                                setYearFilter('');
                                setBrandFilter('');
                                setCountryFilter('');
                                setStatusFilter('All');
                            }}
                            className="text-[11px] font-black text-racing-red hover:text-racing-red-dark uppercase tracking-widest transition-colors flex items-center gap-2 group"
                        >
                            <span className="group-hover:rotate-180 transition-transform duration-500">↺</span>
                            Reset All Data
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Search & Brand */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Core Search</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-dim-grey group-focus-within/filters:text-racing-red transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Identification or Brand..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white placeholder-dim-grey focus:ring-2 focus:ring-racing-red focus:border-transparent outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Manufacturer</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Shell, Bosch"
                                    value={brandFilter}
                                    onChange={(e) => setBrandFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white placeholder-dim-grey focus:ring-2 focus:ring-racing-red outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Category & Status */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Sub-System</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white focus:ring-2 focus:ring-racing-red transition-all cursor-pointer outline-none shadow-lg"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat} className="bg-carbon-grey">{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Live Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white focus:ring-2 focus:ring-racing-red transition-all cursor-pointer outline-none shadow-lg"
                                >
                                    <option value="All" className="bg-carbon-grey">Full Manifest</option>
                                    <option value="Active" className="bg-carbon-grey">Online Assets</option>
                                    <option value="Inactive" className="bg-carbon-grey">Boneyard / Local</option>
                                </select>
                            </div>
                        </div>

                        {/* Vehicle Configuration */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Fleet/Make</label>
                                <select
                                    value={makeFilter}
                                    onChange={(e) => setMakeFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white focus:ring-2 focus:ring-racing-red transition-all cursor-pointer outline-none shadow-lg"
                                >
                                    <option value="All" className="bg-carbon-grey">All Fleet Units</option>
                                    {carMakes.map(make => (
                                        <option key={make} value={make} className="bg-carbon-grey">{make}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Specific Model</label>
                                <select
                                    value={modelFilter}
                                    onChange={(e) => setModelFilter(e.target.value)}
                                    disabled={makeFilter === 'All'}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white focus:ring-2 focus:ring-racing-red transition-all cursor-pointer outline-none shadow-lg disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    <option value="All" className="bg-carbon-grey">All Model Lines</option>
                                    {availableModels.map(model => (
                                        <option key={model} value={model} className="bg-carbon-grey">{model}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Advanced Logic */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Model Year</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 2024"
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white placeholder-dim-grey focus:ring-2 focus:ring-racing-red outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-dim-grey uppercase tracking-widest mb-3">Sequencing</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-5 py-4 bg-matte-black border border-border-dark rounded-xl text-sm text-snow-white focus:ring-2 focus:ring-racing-red transition-all cursor-pointer outline-none shadow-lg"
                                >
                                    <option value="name-asc" className="bg-carbon-grey">Alphanumeric: Asc</option>
                                    <option value="name-desc" className="bg-carbon-grey">Alphanumeric: Desc</option>
                                    <option value="price-asc" className="bg-carbon-grey">Price: Efficiency Optimized</option>
                                    <option value="price-desc" className="bg-carbon-grey">Price: High-End First</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Data Manifest */}
                {filteredProducts.length === 0 ? (
                    <div className="bg-carbon-grey rounded-3xl shadow-premium-3d p-20 text-center border border-border-dark">
                        <AlertTriangle className="h-16 w-16 text-racing-red mx-auto mb-6 opacity-40 animate-pulse" />
                        <h4 className="text-xl font-bold text-snow-white mb-2 uppercase tracking-wide">Data Matrix Empty</h4>
                        <p className="text-silver-grey font-medium max-w-md mx-auto">None of our high-performance components match your current filter parameters. Adjust your inputs for localized results.</p>
                    </div>
                ) : (
                    <div className="bg-carbon-grey rounded-[32px] shadow-premium-3d border border-border-dark overflow-hidden transition-all group/table">
                        {/* Desktop Data Grid */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-matte-black/60">
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Visual</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Nomenclature / Group</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">System</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Vehicle Config</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30 italic">Cost</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30 font-black">Sell</th>
                                        <th className="px-8 py-5 text-left text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30 text-center">Active</th>
                                        <th className="px-8 py-5 text-right text-[11px] font-black text-snow-white uppercase tracking-widest border-b-2 border-racing-red/30">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark/50">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-matte-black/40 border border-border-dark group-hover/row:border-racing-red/20 transition-all">
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
                                                <div className="text-[10px] font-black text-racing-red uppercase mb-1 tracking-widest opacity-80">
                                                    {product.brand || 'No Brand'}
                                                </div>
                                                <div className="text-sm font-black text-snow-white line-clamp-1 max-w-[220px] group-hover/row:translate-x-1 transition-transform">
                                                    {product.name}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-silver-grey">
                                                {product.make} <span className="text-dim-grey font-normal mx-1">|</span> {product.model}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-sm font-bold text-dim-grey italic">
                                                {product.costPrice ? `${product.costPrice} EGP` : '—'}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-sm font-black">
                                                {product.salePrice ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-racing-red">{product.salePrice} EGP</span>
                                                        <span className="text-dim-grey text-[10px] line-through decoration-racing-red/40">{product.price} EGP</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-snow-white">{product.price} EGP</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleToggleActive(product.id, product.isActive)}
                                                    className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${product.isActive !== false ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-matte-black border-border-dark'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition duration-300 ease-in-out ${product.isActive !== false ? 'translate-x-6' : 'translate-x-0'}`} />
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
                        <div className="md:hidden divide-y divide-border-dark/30 bg-matte-black/20">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="p-6 hover:bg-white/[0.04] transition-all">
                                    <div className="flex gap-6">
                                        <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-matte-black border border-border-dark flex-shrink-0">
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
                                            <div className="text-[10px] font-black text-racing-red uppercase tracking-widest mb-1.5">
                                                {product.brand || 'NO BRAND'}
                                            </div>
                                            <h3 className="text-base font-black text-snow-white truncate leading-tight mb-1">{product.name}</h3>
                                            <p className="text-sm text-silver-grey font-bold truncate opacity-60">{product.make} | {product.model}</p>

                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-dark/50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-dim-grey font-black uppercase tracking-widest leading-none mb-1">Selling Price</span>
                                                    <span className="text-lg font-black text-snow-white">{product.price} <span className="text-[11px] text-silver-grey opacity-40">EGP</span></span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/edit-product/${product.id}`)}
                                                        className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20"
                                                    >
                                                        <Edit3 className="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="p-3 bg-racing-red/10 text-racing-red rounded-xl border border-racing-red/20"
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
