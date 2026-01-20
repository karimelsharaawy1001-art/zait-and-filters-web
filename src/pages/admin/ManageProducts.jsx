import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Edit3, Trash2, Plus, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
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
        <>
            <AdminHeader title="Product Management" />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">All Products</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/products/new')}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Product
                    </button>
                </div>

                {/* Bulk Import/Export */}
                <BulkOperations />

                {/* Filters Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Filters</h3>
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
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                            Reset All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Search & Brand */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Search Products</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Name or Brand..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Manufacturer Brand</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Shell, Bosch"
                                    value={brandFilter}
                                    onChange={(e) => setBrandFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Country of Origin</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Japan, Germany"
                                    value={countryFilter}
                                    onChange={(e) => setCountryFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Category & Status */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Main Category</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Active">Active Only</option>
                                    <option value="Inactive">Inactive Only</option>
                                </select>
                            </div>
                        </div>

                        {/* Vehicle Make & Model */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Car Make</label>
                                <select
                                    value={makeFilter}
                                    onChange={(e) => setMakeFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                >
                                    <option value="All">All Makes</option>
                                    {carMakes.map(make => (
                                        <option key={make} value={make}>{make}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Car Model</label>
                                <select
                                    value={modelFilter}
                                    onChange={(e) => setModelFilter(e.target.value)}
                                    disabled={makeFilter === 'All'}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <option value="All">All Models</option>
                                    {availableModels.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Year & Sort */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Specific Year</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 2022"
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                >
                                    <option value="name-asc">Name: A-Z</option>
                                    <option value="name-desc">Name: Z-A</option>
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <p className="text-gray-500 text-lg">No products found matching your filters.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand / Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Car Model</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Years</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="h-10 w-10 rounded object-cover"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[10px] font-bold text-orange-600 uppercase mb-0.5 tracking-tighter">
                                                    {product.brand || 'No Brand'}
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {product.make} - {product.model}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getYearDisplay(product)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {product.costPrice ? `${product.costPrice} EGP` : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {product.salePrice ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-orange-600 font-bold">{product.salePrice} EGP</span>
                                                        <span className="text-gray-400 text-xs line-through">was {product.price}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-900 font-bold">{product.price} EGP</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                                                {product.country || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs text-gray-500">
                                                    {product.subCategory || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleToggleActive(product.id, product.isActive)}
                                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${product.isActive !== false ? 'bg-orange-600' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${product.isActive !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center gap-3">
                                                <button
                                                    onClick={() => navigate(`/admin/edit-product/${product.id}`)}
                                                    className="text-blue-600 hover:text-blue-900 transition-colors"
                                                >
                                                    <Edit3 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="text-red-600 hover:text-red-900 transition-colors"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-gray-200">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex gap-4">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-20 w-20 rounded object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                                            <p className="text-xs text-gray-500 mt-1">{product.make} - {product.model}</p>
                                            <p className="text-xs text-gray-500">{getYearDisplay(product)}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {product.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Sell: </span>
                                                    <span className="font-semibold text-gray-900">{product.price} EGP</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className={`h-4 w-4 ${getProfitColor(product.price, product.costPrice)}`} />
                                                    <span className={`text-sm font-semibold ${getProfitColor(product.price, product.costPrice)}`}>
                                                        {getProfitMargin(product.price, product.costPrice)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(product.id, product.name)}
                                            className="text-red-600 hover:text-red-900 transition-colors self-start"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ManageProducts;
