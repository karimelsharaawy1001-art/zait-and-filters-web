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
    const { staticProducts, rawStaticProducts, categories: shieldCategories, cars: shieldCars, isStaticLoaded } = useStaticData();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [brandFilter, setBrandFilter] = useState('All');
    const [makeFilter, setMakeFilter] = useState('All');
    const [modelFilter, setModelFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('$createdAt-desc');

    // Appwrite Config
    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const [filteredProducts, setFilteredProducts] = useState([]);
    const [displayProducts, setDisplayProducts] = useState([]);

    // Client-Side Filter Engine
    useEffect(() => {
        if (!isStaticLoaded) return;

        let results = [...staticProducts];

        // 1. Sector (Category) Filter
        if (categoryFilter !== 'All') {
            results = results.filter(p => p.category === categoryFilter);
        }

        // 2. Status Filter
        if (statusFilter === 'Active') {
            results = results.filter(p => p.isActive !== false);
        } else if (statusFilter === 'Inactive') {
            results = results.filter(p => p.isActive === false);
        }

        // 3. Vehicle Filters (Robust/Legacy Support)
        if (makeFilter !== 'All') {
            results = results.filter(p =>
                (p.make && p.make.toUpperCase() === makeFilter.toUpperCase()) ||
                (p.carMake && p.carMake.toUpperCase() === makeFilter.toUpperCase())
            );
        }

        if (modelFilter !== 'All') {
            results = results.filter(p =>
                (p.model && p.model.toUpperCase() === modelFilter.toUpperCase()) ||
                (p.carModel && p.carModel.toUpperCase() === modelFilter.toUpperCase())
            );
        }

        if (yearFilter !== 'All' && yearFilter.length >= 4) {
            results = results.filter(p => {
                const searchYear = parseInt(yearFilter);
                if (isNaN(searchYear)) return true;

                // Check yearStart/yearEnd
                if (p.yearStart && p.yearEnd) {
                    return searchYear >= p.yearStart && searchYear <= p.yearEnd;
                }
                // Check yearRange string
                if (p.yearRange && p.yearRange.includes(yearFilter)) return true;
                return false;
            });
        }

        // 4. Universal Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(p =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.id && p.id.toLowerCase().includes(q)) ||
                (p.partNumber && p.partNumber.toLowerCase().includes(q)) ||
                (p.brand && p.brand.toLowerCase().includes(q))
            );
        }

        // 5. Sorting
        const [field, dir] = sortBy.split('-');
        results.sort((a, b) => {
            let valA = a[field] || '';
            let valB = b[field] || '';

            if (field === '$createdAt') {
                valA = new Date(a.$createdAt).getTime();
                valB = new Date(b.$createdAt).getTime();
            }

            if (dir === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

        setFilteredProducts(results);
        setTotalCount(results.length);
        setCurrentPage(1); // Reset to page 1 on filter change
        setLoading(false);
    }, [isStaticLoaded, staticProducts, categoryFilter, statusFilter, makeFilter, modelFilter, yearFilter, searchQuery, sortBy]);

    // Client-Side Pagination
    useEffect(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        setDisplayProducts(filteredProducts.slice(start, end));
    }, [filteredProducts, currentPage, pageSize]);

    const handleToggleActive = async (productId, currentStatus) => {
        try {
            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, productId, { isActive: !currentStatus });
            toast.success("Status updated. Syncing view...");
            // Success call to force context refresh if needed, 
            // but context usually refreshes on mount or interval.
            // For now, local UI update for speed:
            setDisplayProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive: !currentStatus } : p));
        } catch (error) {
            toast.error("Sync failure");
        }
    };

    const handleDelete = async (productId, name) => {
        if (window.confirm(`Purge "${name}" from matrix?`)) {
            try {
                await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION, productId);
                toast.success("Resource deleted");
                setDisplayProducts(prev => prev.filter(p => p.id !== productId));
            } catch (error) {
                toast.error("Operation failed");
            }
        }
    };

    const handleExportFetch = async () => {
        return filteredProducts;
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

                <BulkOperations onSuccess={() => window.location.reload()} onExportFetch={handleExportFetch} staticProducts={rawStaticProducts} />

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

                {/* Advanced Vehicle Filters */}
                <div className="admin-card-compact p-4 flex flex-wrap gap-4 items-end mb-6 bg-slate-900 text-white border-none shadow-xl">
                    <div className="flex-1 min-w-[150px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Vehicle Make</label>
                        <select
                            value={makeFilter}
                            onChange={e => { setMakeFilter(e.target.value); setModelFilter('All'); }}
                            className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-white"
                        >
                            <option value="All" className="text-slate-900">All Makes</option>
                            {[...new Set(shieldCars.map(c => c.make))].sort().map(m => (
                                <option key={m} value={m} className="text-slate-900">{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Model</label>
                        <select
                            value={modelFilter}
                            onChange={e => setModelFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-white"
                        >
                            <option value="All" className="text-slate-900">All Models</option>
                            {shieldCars
                                .filter(c => makeFilter === 'All' || c.make === makeFilter)
                                .map(c => <option key={c.id} value={c.model} className="text-slate-900">{c.model}</option>)
                            }
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Year</label>
                        <input
                            value={yearFilter === 'All' ? '' : yearFilter}
                            onChange={e => setYearFilter(e.target.value || 'All')}
                            placeholder="e.g. 2015"
                            className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20"
                        />
                    </div>
                    <button
                        onClick={() => { setMakeFilter('All'); setModelFilter('All'); setYearFilter('All'); setCategoryFilter('All'); setStatusFilter('All'); setSearchQuery(''); }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                    >
                        Reset Matrix
                    </button>
                </div>

                <div className="admin-card-compact overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full admin-table-dense">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="text-left w-20">Visual</th>
                                    <th className="text-left">Product</th>
                                    <th className="text-left">Brand</th>
                                    <th className="text-left">Vehicle</th>
                                    <th className="text-left">Year</th>
                                    <th className="text-left">Financials</th>
                                    <th className="text-left">Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" size={32} /></td></tr>
                                ) : displayProducts.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td>
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                                <img src={p.images || p.image || '/placeholder.png'} className="w-full h-full object-cover" />
                                            </div>
                                        </td>
                                        <td>
                                            <p className="font-bold text-slate-900 text-[13px] leading-tight">{p.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{p.partNumber || 'No SN'}</p>
                                        </td>
                                        <td>
                                            <div className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider border border-slate-200">
                                                {p.brand || p.partBrand || 'Generic'}
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{p.make || p.carMake || p.car_make || '-'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.model || p.carModel || p.car_model || '-'}</p>
                                        </td>
                                        <td>
                                            <p className="text-[10px] font-black text-slate-600 tabular-nums">
                                                {p.yearRange || p.carYear || (p.yearStart ? (p.yearEnd && p.yearEnd !== p.yearStart ? `${p.yearStart}-${p.yearEnd}` : p.yearStart) : (p.yearEnd || '-'))}
                                            </p>
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
                                            <button
                                                onClick={() => handleToggleActive(p.id, p.isActive)}
                                                className={`group/status relative flex items-center justify-between gap-3 min-w-[100px] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${p.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}
                                            >
                                                <span>{p.isActive ? 'Active' : 'Offline'}</span>
                                                <div className={`w-2 h-2 rounded-full shadow-sm transition-all duration-300 ${p.isActive ? 'bg-emerald-500 group-hover/status:bg-white animate-pulse' : 'bg-slate-300 group-hover/status:bg-white'}`} />
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
