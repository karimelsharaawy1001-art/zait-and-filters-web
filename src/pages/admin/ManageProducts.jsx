import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Edit3, Trash2, Plus, Search, Filter, AlertTriangle, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';
import BulkOperations from '../../components/admin/BulkOperations';

const ManageProducts = () => {
    const navigate = useNavigate();
    const { staticProducts, categories: shieldCategories, cars: shieldCars, isStaticLoaded } = useStaticData();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [brandFilter, setBrandFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('$createdAt-desc');

    // Appwrite Config
    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchProducts = async () => {
        if (!DATABASE_ID || !PRODUCTS_COLLECTION) return;
        setLoading(true);
        try {
            const queries = [
                Query.limit(pageSize),
                Query.offset((currentPage - 1) * pageSize)
            ];

            if (categoryFilter !== 'All') queries.push(Query.equal('category', categoryFilter));
            if (brandFilter !== 'All') queries.push(Query.equal('brand', brandFilter));
            if (statusFilter === 'Active') queries.push(Query.equal('isActive', true));
            if (statusFilter === 'Inactive') queries.push(Query.equal('isActive', false));
            if (searchQuery) queries.push(Query.contains('name', searchQuery));

            const [field, dir] = sortBy.split('-');
            queries.push(dir === 'asc' ? Query.orderAsc(field) : Query.orderDesc(field));

            const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
            setProducts(response.documents.map(d => ({ id: d.$id, ...d })));
            setTotalCount(response.total);
        } catch (error) {
            console.error(error);
            toast.error("Failed to sync inventory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [categoryFilter, brandFilter, statusFilter, sortBy, searchQuery, currentPage]);

    const handleToggleActive = async (productId, currentStatus) => {
        try {
            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, productId, { isActive: !currentStatus });
            toast.success("Status synced");
            fetchProducts();
        } catch (error) {
            toast.error("Sync failure");
        }
    };

    const handleDelete = async (productId, name) => {
        if (window.confirm(`Purge "${name}" from matrix?`)) {
            try {
                await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION, productId);
                toast.success("Resource deleted");
                fetchProducts();
            } catch (error) {
                toast.error("Operation failed");
            }
        }
    };

    const handleExportFetch = async () => {
        if (!DATABASE_ID || !PRODUCTS_COLLECTION) return [];
        try {
            const queries = [Query.limit(5000)];
            if (categoryFilter !== 'All') queries.push(Query.equal('category', categoryFilter));
            if (brandFilter !== 'All') queries.push(Query.equal('brand', brandFilter));
            if (statusFilter === 'Active') queries.push(Query.equal('isActive', true));
            if (statusFilter === 'Inactive') queries.push(Query.equal('isActive', false));

            const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
            return response.documents;
        } catch (error) {
            console.error("Export fetch failure:", error);
            return [];
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Inventory Matrix" />
            <div className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Inventory Control</h2>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Telemetry: {totalCount} active resources</p>
                    </div>
                    <button onClick={() => navigate('/admin/products/new')} className="admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10">
                        <Plus size={14} /> New Entry
                    </button>
                </div>

                <BulkOperations onSuccess={fetchProducts} onExportFetch={handleExportFetch} />

                <div className="admin-card-compact p-4 flex flex-wrap gap-4 items-end mb-6">
                    <div className="flex-1 min-w-[280px]">
                        <label className="admin-text-subtle ml-1 mb-1.5 block">Universal Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search node ID, name, or brand..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all"
                            />
                        </div>
                    </div>
                    <div className="w-40">
                        <label className="admin-text-subtle ml-1 mb-1.5 block">Sector</label>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-slate-900 transition-all">
                            <option value="All">All Sectors</option>
                            {shieldCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="w-40">
                        <label className="admin-text-subtle ml-1 mb-1.5 block">Status</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-slate-900 transition-all">
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Offline</option>
                        </select>
                    </div>
                </div>

                <div className="admin-card-compact overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full admin-table-dense">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="text-left w-20">Visual</th>
                                    <th className="text-left">Identity</th>
                                    <th className="text-left">Financials</th>
                                    <th className="text-left">Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" size={32} /></td></tr>
                                ) : products.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td>
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                                <img src={p.images || p.image || '/placeholder.png'} className="w-full h-full object-cover" />
                                            </div>
                                        </td>
                                        <td>
                                            <p className="font-bold text-slate-900 text-[13px] leading-tight">{p.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{p.brand} · {p.category}</p>
                                        </td>
                                        <td>
                                            <p className="font-bold text-slate-900 text-[13px] font-Cairo">{p.price} EGP</p>
                                            {p.stock < 5 && (
                                                <p className="text-[9px] text-amber-600 font-bold uppercase mt-0.5 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Stock: {p.stock}
                                                </p>
                                            )}
                                        </td>
                                        <td>
                                            <button onClick={() => handleToggleActive(p.id, p.isActive)} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${p.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                {p.isActive ? 'Active' : 'Offline'}
                                            </button>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50/50 p-4 flex justify-between items-center border-t border-slate-100">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronLeft size={16} />
                        </button>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Node {currentPage} of {Math.ceil(totalCount / pageSize)}</p>
                        <button disabled={currentPage >= Math.ceil(totalCount / pageSize)} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageProducts;
