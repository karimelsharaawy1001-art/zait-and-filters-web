import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Edit3, Trash2, Plus, Search, Filter, AlertTriangle, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';

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
            if (brandFilter !== 'All') queries.push(Query.equal('partBrand', brandFilter));
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Inventory Matrix" />
            <div className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Inventory Control</h2>
                        <p className="text-sm font-bold text-gray-500">Managing {totalCount} active items</p>
                    </div>
                    <button onClick={() => navigate('/admin/products/new')} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"><Plus size={18} /> New Entry</button>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border shadow-sm mb-10 flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[300px] space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Universal Search</label>
                        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search node name, ID, or brand..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-black" /></div>
                    </div>
                    <div className="w-48 space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Category</label>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xs uppercase"><option value="All">All Sectors</option>{shieldCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                    </div>
                    <div className="w-48 space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Status</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xs uppercase"><option value="All">All Status</option><option value="Active">Active</option><option value="Inactive">Offline</option></select>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-8 py-6">Visual</th><th className="px-8 py-6">Identity</th><th className="px-8 py-6">Financials</th><th className="px-8 py-6">Status</th><th className="px-8 py-6 text-right">Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr>
                                ) : products.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-6"><img src={p.image || '/placeholder.png'} className="w-16 h-16 rounded-xl object-cover border" /></td>
                                        <td className="px-8 py-6"><p className="font-black text-lg italic">{p.name}</p><p className="text-[10px] font-bold text-gray-400 uppercase">{p.partBrand} | {p.category}</p></td>
                                        <td className="px-8 py-6 font-black text-lg">{p.price} EGP{p.stockQuantity < 5 && <p className="text-[9px] text-red-600 uppercase mt-1 flex items-center gap-1"><AlertTriangle size={10} /> Critical Stock: {p.stockQuantity}</p>}</td>
                                        <td className="px-8 py-6">
                                            <button onClick={() => handleToggleActive(p.id, p.isActive)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${p.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                {p.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />} {p.isActive ? 'Active' : 'Offline'}
                                            </button>
                                        </td>
                                        <td className="px-8 py-6 text-right flex justify-end gap-3 pt-12">
                                            <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="p-2 text-gray-400 hover:text-blue-600 transition-all"><Edit3 size={18} /></button>
                                            <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-gray-400 hover:text-red-600 transition-all"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-gray-50/50 p-6 flex justify-between items-center border-t">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 rounded-xl bg-white border shadow-sm disabled:opacity-30"><ChevronLeft size={20} /></button>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Page {currentPage} of {Math.ceil(totalCount / pageSize)}</p>
                        <button disabled={currentPage >= Math.ceil(totalCount / pageSize)} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 rounded-xl bg-white border shadow-sm disabled:opacity-30"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageProducts;
