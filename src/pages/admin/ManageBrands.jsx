import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Loader2, Image as ImageIcon, X, Zap, Activity, Award, ShieldCheck } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const ManageBrands = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ name: '', imageUrl: '' });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const BRANDS_COLLECTION = import.meta.env.VITE_APPWRITE_BRANDS_COLLECTION_ID || 'brand_logos';

    const fetchBrands = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, BRANDS_COLLECTION, [Query.orderAsc('name'), Query.limit(100)]);
            setBrands(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) { toast.error("Brand registry failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBrands(); }, [DATABASE_ID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await databases.createDocument(DATABASE_ID, BRANDS_COLLECTION, ID.unique(), formData);
            fetchBrands(); setIsAdding(false); setFormData({ name: '', imageUrl: '' });
            toast.success("Brand identity registered");
        } catch (error) { toast.error("Registration failure"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge brand identity?")) return;
        setLoading(true);
        try {
            await databases.deleteDocument(DATABASE_ID, BRANDS_COLLECTION, id);
            fetchBrands();
            toast.success("Brand purged");
        } catch (error) { toast.error("Purge failure"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Brand Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Partner Registry</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {brands.length} Strategic Manufacturer Assets</p>
                    </div>
                    {!isAdding && (
                        <button onClick={() => setIsAdding(true)} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase italic text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-all"><Plus size={18} /> Register Brand</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Award size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Brands</p><h3 className="text-2xl font-black italic">{brands.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><Zap size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Active</p><h3 className="text-2xl font-black italic">100%</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Verified</p><h3 className="text-2xl font-black italic">{brands.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Load Index</p><h3 className="text-2xl font-black italic">Optimized</h3></div></div>
                </div>

                {isAdding && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl mb-12 border-4 border-black max-w-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black uppercase italic tracking-widest">Register New Identity</h3><button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X /></button></div>
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 ml-2 italic">Commercial Brand Name</label><input type="text" name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" placeholder="e.g. TOYOTA GENUINE PARTS" required /></div>
                            <div><div className="flex justify-between items-center mb-3 ml-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Visual Asset Overlay</label><span className="text-[9px] text-red-600 font-black uppercase italic">PNG/WEBP Optimized</span></div><ImageUpload onUploadComplete={url => setFormData({ ...formData, imageUrl: url })} currentImage={formData.imageUrl} folderPath="brands" /></div>
                            <div className="flex gap-4 pt-4"><button type="submit" disabled={loading} className="flex-1 bg-black text-white py-5 rounded-[2rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] transition-all flex items-center justify-center gap-3">{loading ? <Loader2 className="animate-spin" /> : <Plus size={18} />} Commit Identity</button><button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-[2rem] font-black uppercase italic text-xs border-2 border-transparent hover:border-gray-200 transition-all">Cancel</button></div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                    {loading && brands.length === 0 ? <div className="col-span-full py-24 text-center"><Loader2 className="animate-spin mx-auto text-black mb-4" size={40} /><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing Protocol...</p></div> : brands.map(brand => (
                        <div key={brand.id} className="group relative bg-white p-10 rounded-[2.5rem] border shadow-sm hover:bg-gray-50 transition-all hover:scale-105 flex flex-col items-center">
                            <div className="h-24 w-32 flex items-center justify-center mb-6 group-hover:rotate-3 transition-all"><img src={brand.imageUrl} alt={brand.name} className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all" /></div>
                            <p className="text-center text-[10px] font-black text-gray-400 group-hover:text-black uppercase tracking-widest truncate w-full italic transition-colors mt-auto">{brand.name}</p>
                            <button onClick={() => handleDelete(brand.id)} className="absolute -top-3 -right-3 bg-white text-red-600 p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-2xl hover:bg-red-600 hover:text-white border"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ManageBrands;
