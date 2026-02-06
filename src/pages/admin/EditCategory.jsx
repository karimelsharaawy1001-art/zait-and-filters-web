import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Plus, X, Edit2, Layout, Layers } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const EditCategory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', imageUrl: '', subCategories: [] });
    const [newSub, setNewSub] = useState({ name: '', imageUrl: '' });
    const [editingSub, setEditingSub] = useState(null);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CATEGORIES_COLLECTION = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories';

    useEffect(() => {
        const fetchCategory = async () => {
            if (!DATABASE_ID) return;
            try {
                const doc = await databases.getDocument(DATABASE_ID, CATEGORIES_COLLECTION, id);
                const subs = (doc.subCategories || []).map(s => typeof s === 'string' ? { name: s, imageUrl: '' } : s);
                setFormData({ ...doc, subCategories: subs });
            } catch (error) {
                toast.error('Node not found');
                navigate('/admin/categories');
            } finally {
                setLoading(false);
            }
        };
        fetchCategory();
    }, [id, DATABASE_ID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData };
            delete payload.$id; delete payload.$collectionId; delete payload.$databaseId; delete payload.$createdAt; delete payload.$updatedAt; delete payload.$permissions;
            await databases.updateDocument(DATABASE_ID, CATEGORIES_COLLECTION, id, payload);
            toast.success('Taxonomy updated');
            navigate('/admin/categories');
        } catch (error) {
            toast.error('Sync failure');
        } finally {
            setSaving(false);
        }
    };

    const addSub = () => {
        if (!newSub.name.trim()) return;
        setFormData({ ...formData, subCategories: [...formData.subCategories, { ...newSub }] });
        setNewSub({ name: '', imageUrl: '' });
    };

    const removeSub = (idx) => setFormData({ ...formData, subCategories: formData.subCategories.filter((_, i) => i !== idx) });

    if (loading) return <div className="p-20 text-center uppercase font-black text-[10px] text-gray-400 font-Cairo"><Loader2 className="animate-spin mx-auto mb-4" /> Routing Node...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Registry Revision" />
            <main className="max-w-4xl mx-auto py-8 px-4">
                <button onClick={() => navigate('/admin/categories')} className="flex items-center text-gray-400 font-black uppercase text-[10px] mb-8 gap-2"><ArrowLeft size={14} /> Return to Matrix</button>
                <form onSubmit={handleSubmit} className="space-y-10">
                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b pb-6"><Layout className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Primary Metadata</h2></div>
                        <div className="space-y-6">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Sector Title</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xl italic" required /></div>
                            <ImageUpload currentImage={formData.imageUrl} onUploadComplete={url => setFormData({ ...formData, imageUrl: url })} />
                        </div>
                    </section>

                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b pb-6"><Layers className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Hierarchy Definition</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {formData.subCategories.map((sub, i) => (
                                <div key={i} className="bg-gray-50 p-6 rounded-[2rem] border group relative flex items-center gap-4 transition-all hover:bg-white hover:border-black/10">
                                    <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center font-black text-xs text-gray-400 overflow-hidden">{sub.imageUrl ? <img src={sub.imageUrl} className="w-full h-full object-cover" /> : i + 1}</div>
                                    <div className="flex-1 font-black uppercase text-xs italic tracking-tight">{sub.name}</div>
                                    <button type="button" onClick={() => removeSub(i)} className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><X size={18} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-100 p-8 rounded-[2rem] space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-gray-400">Add Hierarchy Node</h4>
                            <div className="flex gap-4">
                                <input placeholder="Node Label" value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} className="flex-1 p-4 rounded-xl border font-bold" />
                                <button type="button" onClick={addSub} className="bg-black text-white px-8 rounded-xl font-black uppercase text-[10px] italic">Inject</button>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end pt-10 border-t"><button type="submit" disabled={saving} className="bg-red-600 text-white px-16 py-6 rounded-3xl font-black uppercase italic shadow-2xl hover:scale-105 transition-all">{saving ? 'Syncing...' : 'Update Matrix'}</button></div>
                </form>
            </main>
        </div>
    );
};

export default EditCategory;
