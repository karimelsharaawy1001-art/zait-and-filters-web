import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { ID, Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';
import { Trash2, Tag, Edit3, Loader2, Download, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const ManageCategories = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [formData, setFormData] = useState({ name: '', image: '', subCategories: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CATEGORIES_COLLECTION = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories';
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const fetchCategories = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [Query.limit(100)]);
            setCategories(response.documents.map(doc => {
                const subStr = doc.subcategories || doc.subCategories || '';
                let subs = [];
                if (typeof subStr === 'string') {
                    subs = subStr.split(',').filter(Boolean);
                } else if (Array.isArray(subStr)) {
                    subs = subStr.map(s => typeof s === 'string' ? s : s.name);
                }
                return { id: doc.$id, ...doc, subCategories: subs };
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [DATABASE_ID]);

    const exportCategories = async () => {
        setExporting(true);
        try {
            const [catsRes, prodsRes] = await Promise.all([
                databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [Query.limit(100)])
            ]);

            const exportData = catsRes.documents.map(cat => ({
                'ID': cat.$id,
                'Category': cat.name,
                'Sub-Sectors': (cat.subCategories || []).map(s => typeof s === 'string' ? s : s.name).join(', '),
                'Status': cat.isActive !== false ? 'Active' : 'Offline',
                'Load': prodsRes.documents.filter(p => p.category === cat.name).length
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Registry");
            XLSX.writeFile(wb, `taxonomy_export_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Matrix exported');
        } catch (error) {
            toast.error('Export failure');
        } finally {
            setExporting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || (!formData.image && !formData.imageUrl)) return toast.error('Missing required metadata');
        try {
            const subs = formData.subCategories.split(',').map(s => s.trim()).filter(Boolean);
            await databases.createDocument(DATABASE_ID, CATEGORIES_COLLECTION, ID.unique(), {
                name: formData.name,
                image: formData.image || formData.imageUrl,
                subcategories: subs.join(','),
                isActive: true
            });
            setFormData({ name: '', image: '', subCategories: '' });
            fetchCategories();
            toast.success('Category committed');
        } catch (error) {
            toast.error('Sync failure');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge category from matrix?")) return;
        try {
            await databases.deleteDocument(DATABASE_ID, CATEGORIES_COLLECTION, id);
            setCategories(categories.filter(c => c.id !== id));
            toast.success("Resource deleted");
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const filtered = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Taxonomy Matrix" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="admin-card-compact p-5 h-fit space-y-5">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">New Category</h2>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Define new product sector</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="admin-text-subtle ml-1">Sector Name</label>
                                <input placeholder="e.g. Filters" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="admin-text-subtle ml-1">Universal Asset (Image)</label>
                                <ImageUpload currentImage={formData.image || formData.imageUrl} onUploadComplete={url => setFormData({ ...formData, image: url })} folderPath="categories" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="admin-text-subtle ml-1">Sub-Sectors (CSV)</label>
                                <textarea placeholder="Sub1, Sub2, Sub3..." value={formData.subCategories} onChange={e => setFormData({ ...formData, subCategories: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium min-h-[100px] outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                            <button type="submit" className="w-full admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 justify-center py-3 text-xs uppercase shadow-lg shadow-slate-900/10">Commit to Registry</button>
                        </form>
                    </section>

                    <section className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Registry View</h2>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Telemetry: {filtered.length} nodes active</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter Matrix..." className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-slate-900" />
                                </div>
                                <button onClick={exportCategories} disabled={exporting} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm" title="Export Ledger">
                                    <Download size={14} />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-16 text-center text-slate-400">
                                <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                                <p className="text-xs font-medium uppercase tracking-widest">Accessing Logs...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filtered.map(cat => (
                                    <div key={cat.id} className="admin-card-compact p-4 group relative overflow-hidden transition-all">
                                        <div className="flex gap-4 items-start relative z-10">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0">
                                                <img src={cat.image || cat.imageUrl} className="w-full h-full object-cover" alt={cat.name} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {(cat.subCategories || []).slice(0, 4).map((s, i) => (
                                                        <span key={i} className="text-[8px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 uppercase">
                                                            {typeof s === 'string' ? s : s.name}
                                                        </span>
                                                    ))}
                                                    {cat.subCategories?.length > 4 && (
                                                        <span className="text-[8px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase">
                                                            +{cat.subCategories.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                                            <button onClick={() => navigate(`/admin/edit-category/${cat.id}`)} className="p-1.5 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-100 shadow-sm transition-all" title="Edit">
                                                <Edit3 size={12} />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-1.5 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-slate-100 shadow-sm transition-all" title="Delete">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default ManageCategories;
