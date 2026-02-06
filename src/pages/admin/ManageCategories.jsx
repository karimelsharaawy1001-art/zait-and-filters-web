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
    const [formData, setFormData] = useState({ name: '', imageUrl: '', subCategories: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CATEGORIES_COLLECTION = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories';
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const fetchCategories = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [Query.limit(100)]);
            setCategories(response.documents.map(doc => ({ id: doc.$id, ...doc })));
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
        if (!formData.name || !formData.imageUrl) return toast.error('Missing required metadata');
        try {
            const subs = formData.subCategories.split(',').map(s => s.trim()).filter(Boolean);
            await databases.createDocument(DATABASE_ID, CATEGORIES_COLLECTION, ID.unique(), {
                name: formData.name,
                imageUrl: formData.imageUrl,
                subCategories: subs,
                isActive: true
            });
            setFormData({ name: '', imageUrl: '', subCategories: '' });
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
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Taxonomy Matrix" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm h-fit space-y-8">
                        <div><h2 className="text-xl font-black uppercase italic">New Entry</h2><p className="text-xs text-gray-400 font-bold">Protocol for adding sectors</p></div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <input placeholder="Sector Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" required />
                            <ImageUpload currentImage={formData.imageUrl} onUploadComplete={url => setFormData({ ...formData, imageUrl: url })} folderPath="categories" />
                            <textarea placeholder="Sub-Sectors (CSV Format)" value={formData.subCategories} onChange={e => setFormData({ ...formData, subCategories: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold min-h-[120px]" />
                            <button type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic shadow-xl">Commit to Registry</button>
                        </form>
                    </section>

                    <section className="lg:col-span-2 space-y-8">
                        <div className="flex justify-between items-center">
                            <div><h2 className="text-xl font-black uppercase italic">Registry View</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Found {filtered.length} active nodes</p></div>
                            <div className="flex gap-4">
                                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter Matrix..." className="pl-10 pr-4 py-2 bg-white border rounded-xl text-xs font-bold" /></div>
                                <button onClick={exportCategories} disabled={exporting} className="bg-green-600 text-white p-2 rounded-xl shadow-lg"><Download size={18} /></button>
                            </div>
                        </div>

                        {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {filtered.map(cat => (
                                    <div key={cat.id} className="bg-white p-6 rounded-[2rem] border shadow-sm group relative overflow-hidden transition-all hover:border-black/20">
                                        <div className="flex gap-4 items-start relative z-10">
                                            <img src={cat.imageUrl} className="w-20 h-20 rounded-2xl object-cover border" alt={cat.name} />
                                            <div className="flex-1">
                                                <h3 className="font-black text-xl italic">{cat.name}</h3>
                                                <div className="flex flex-wrap gap-1 mt-3">
                                                    {(cat.subCategories || []).slice(0, 4).map((s, i) => <span key={i} className="text-[8px] font-black bg-gray-50 px-2 py-1 rounded-lg uppercase border">{typeof s === 'string' ? s : s.name}</span>)}
                                                    {cat.subCategories?.length > 4 && <span className="text-[8px] font-black bg-black text-white px-2 py-1 rounded-lg uppercase">+{cat.subCategories.length - 4}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button onClick={() => navigate(`/admin/edit-category/${cat.id}`)} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Edit3 size={18} /></button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-3 bg-white text-red-600 border rounded-xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
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
