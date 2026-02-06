import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Edit3, Save, X, MoveUp, MoveDown, Loader2, Image as ImageIcon, Zap, Activity, ShieldCheck, Monitor, Layout, Eye } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const ManageHero = () => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSlide, setEditingSlide] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ imageUrl: '', title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '', isActive: true, order: 0 });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const HERO_COLLECTION = import.meta.env.VITE_APPWRITE_HERO_COLLECTION_ID || 'hero_slides';

    const fetchSlides = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, HERO_COLLECTION, [Query.orderAsc('order'), Query.limit(10)]);
            setSlides(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) { toast.error("Visual registry failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSlides(); }, [DATABASE_ID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingSlide) {
                await databases.updateDocument(DATABASE_ID, HERO_COLLECTION, editingSlide.id, formData);
                toast.success("Visual identity updated");
            } else {
                await databases.createDocument(DATABASE_ID, HERO_COLLECTION, ID.unique(), formData);
                toast.success("New banner deployed");
            }
            fetchSlides(); resetForm();
        } catch (error) { toast.error("Sync failure"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge visual asset?")) return;
        setLoading(true);
        try {
            await databases.deleteDocument(DATABASE_ID, HERO_COLLECTION, id);
            fetchSlides(); toast.success("Asset purged");
        } catch (error) { toast.error("Purge failure"); }
        finally { setLoading(false); }
    };

    const editSlide = (slide) => {
        setEditingSlide(slide);
        setFormData({ imageUrl: slide.imageUrl, title_ar: slide.title_ar, title_en: slide.title_en, subtitle_ar: slide.subtitle_ar, subtitle_en: slide.subtitle_en, isActive: slide.isActive, order: slide.order });
        setIsAdding(true);
    };

    const resetForm = () => {
        setEditingSlide(null); setIsAdding(false);
        setFormData({ imageUrl: '', title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '', isActive: true, order: slides.length });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Visual Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Hero Matrix</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {slides.length} High-Impact Visual Signals</p>
                    </div>
                    {!isAdding && (
                        <button onClick={() => { setIsAdding(true); setFormData(p => ({ ...p, order: slides.length })); }} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase italic text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-all"><Plus size={18} /> Deploy Banner</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Layout size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Signals</p><h3 className="text-2xl font-black italic">{slides.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><Monitor size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Impact</p><h3 className="text-2xl font-black italic">Premium</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Delivery</p><h3 className="text-2xl font-black italic">Active</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Fluidity</p><h3 className="text-2xl font-black italic">Optimized</h3></div></div>
                </div>

                {isAdding && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl mb-12 border-4 border-black animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black uppercase italic tracking-widest">{editingSlide ? 'Modify Signal' : 'Deploy New Signal'}</h3><button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X /></button></div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="md:col-span-2 space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Visual Asset Overlay</label>
                                <ImageUpload onUploadComplete={url => setFormData({ ...formData, imageUrl: url })} currentImage={formData.imageUrl} folderPath="hero" />
                            </div>
                            <div className="space-y-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Title (EN)</label><input type="text" value={formData.title_en} onChange={e => setFormData({ ...formData, title_en: e.target.value })} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" required /></div>
                            <div className="space-y-4 text-right"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 italic">العنوان (عربي)</label><input type="text" value={formData.title_ar} onChange={e => setFormData({ ...formData, title_ar: e.target.value })} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all text-right" dir="rtl" required /></div>
                            <div className="space-y-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Subtitle (EN)</label><textarea value={formData.subtitle_en} onChange={e => setFormData({ ...formData, subtitle_en: e.target.value })} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-sm italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" rows="2" /></div>
                            <div className="space-y-4 text-right"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 italic">الوصف (عربي)</label><textarea value={formData.subtitle_ar} onChange={e => setFormData({ ...formData, subtitle_ar: e.target.value })} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-sm italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all text-right" dir="rtl" rows="2" /></div>
                            <div className="flex gap-10 items-center">
                                <div className="space-y-4 flex-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Sequence Order</label><input type="number" value={formData.order} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none" /></div>
                                <div className="flex items-center gap-4 pt-8"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} id="isActive" className="w-6 h-6 rounded-lg text-red-600" /><label htmlFor="isActive" className="text-[11px] font-black uppercase italic text-gray-600">Broadcast Ready</label></div>
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-4"><button type="submit" disabled={loading} className="px-12 py-5 bg-black text-white rounded-[2rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] transition-all flex items-center gap-3">{loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} {editingSlide ? 'Update Signal' : 'Deploy Signal'}</button></div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-10 py-6">Visual Frame</th>
                                <th className="px-10 py-6">Identity Manifest</th>
                                <th className="px-10 py-6 text-center">Protocol</th>
                                <th className="px-10 py-6 text-right">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && slides.length === 0 ? <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr> : slides.map(slide => (
                                <tr key={slide.id} className="hover:bg-gray-50/50 transition-all group">
                                    <td className="px-10 py-6"><div className="w-40 h-24 rounded-3xl overflow-hidden border-2 border-gray-100 shadow-inner group-hover:scale-105 transition-all"><img src={slide.imageUrl} className="w-full h-full object-cover" /></div></td>
                                    <td className="px-10 py-6">
                                        <div className="space-y-1">
                                            <h4 className="font-black text-sm uppercase italic">{slide.title_en}</h4>
                                            <p className="text-[10px] font-black text-gray-400 uppercase italic" dir="rtl">{slide.title_ar}</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[9px] font-black text-gray-400 uppercase italic">Sequence: {slide.order}</span>
                                            {slide.isActive ? <span className="bg-green-50 text-green-600 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic border border-green-100">Broadcasting</span> : <span className="bg-gray-50 text-gray-400 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic border border-gray-100">Silent</span>}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                            <button onClick={() => editSlide(slide)} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Edit3 size={18} /></button>
                                            <button onClick={() => handleDelete(slide.id)} className="p-3 bg-white text-red-600 border rounded-xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default ManageHero;
