import React, { useState, useEffect } from 'react';
import { databases, storage } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Image as ImageIcon, Loader2, ToggleLeft, ToggleRight, AlertCircle, Zap, Activity, ShieldCheck, Award, X } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const PaymentManager = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ name: '', logoUrl: '', isActive: true, order: 0 });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PAYMENT_PARTNERS_COLLECTION = import.meta.env.VITE_APPWRITE_PAYMENT_PARTNERS_COLLECTION_ID || 'payment_methods';

    const fetchMethods = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, PAYMENT_PARTNERS_COLLECTION, [Query.orderAsc('order'), Query.limit(100)]);
            setMethods(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) { toast.error("Partners registry unreachable"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMethods(); }, [DATABASE_ID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.logoUrl) return toast.error("Missing required identity data");
        setSubmitting(true);
        try {
            await databases.createDocument(DATABASE_ID, PAYMENT_PARTNERS_COLLECTION, ID.unique(), { ...formData, order: methods.length });
            toast.success("Partner identity secured");
            fetchMethods(); setIsAdding(false); setFormData({ name: '', logoUrl: '', isActive: true, order: 0 });
        } catch (error) { toast.error("Deployment failure"); }
        finally { setSubmitting(false); }
    };

    const toggleStatus = async (method) => {
        try {
            await databases.updateDocument(DATABASE_ID, PAYMENT_PARTNERS_COLLECTION, method.id, { isActive: !method.isActive });
            setMethods(prev => prev.map(m => m.id === method.id ? { ...m, isActive: !method.isActive } : m));
            toast.success("Protocol status synchronized");
        } catch (error) { toast.error("Sync failure"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge partner identity?")) return;
        setLoading(true);
        try {
            await databases.deleteDocument(DATABASE_ID, PAYMENT_PARTNERS_COLLECTION, id);
            setMethods(prev => prev.filter(m => m.id !== id));
            toast.success("Partner purged from registry");
        } catch (error) { toast.error("Purge failure"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Financial Partnerships" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Partner Registry</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing Strategic Financial Nodes (ValU, Fawry, etc.)</p>
                    </div>
                    {!isAdding && (
                        <button onClick={() => { setIsAdding(true); setFormData(p => ({ ...p, order: methods.length })); }} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase italic text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-all"><Plus size={18} /> Secure New Partner</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Award size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Partners</p><h3 className="text-2xl font-black italic">{methods.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><Zap size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Active</p><h3 className="text-2xl font-black italic">{methods.filter(m => m.isActive).length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Network</p><h3 className="text-2xl font-black italic">Trusted</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Uptime</p><h3 className="text-2xl font-black italic">99.9%</h3></div></div>
                </div>

                {isAdding && (
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl mb-12 border-4 border-black max-w-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black uppercase italic tracking-widest">Register Strategic Partner</h3><button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X /></button></div>
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="space-y-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Corporate Identity (Name)</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:border-red-600 transition-all" placeholder="e.g. VALU INSTALLMENTS" required /></div>
                            <div className="space-y-4"><div className="flex justify-between items-center px-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Visual Asset Overlay</label><span className="text-[9px] text-red-600 font-black uppercase italic">Transparent PNG Preferred</span></div><ImageUpload onUploadComplete={url => setFormData({ ...formData, logoUrl: url })} currentImage={formData.logoUrl} folderPath="partners" /></div>
                            <div className="flex items-center gap-3 p-5 bg-gray-50 rounded-2xl border-2 border-dashed"><AlertCircle size={20} className="text-black opacity-40" /><p className="text-[10px] font-black text-gray-400 uppercase italic">Partner identities are displayed during checkout to facilitate trust and operational fluidity.</p></div>
                            <button type="submit" disabled={submitting} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] transition-all flex items-center justify-center gap-4">{submitting ? <Loader2 className="animate-spin" /> : <Plus size={20} />} Commit Identity</button>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-[3.5rem] border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400"><tr><th className="px-10 py-6">Visual Badge</th><th className="px-10 py-6">Corporate Entity</th><th className="px-10 py-6 text-center">Encryption Tier</th><th className="px-10 py-6 text-right">Ops</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && methods.length === 0 ? <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr> : methods.map(method => (
                                <tr key={method.id} className="hover:bg-gray-50/50 transition-all group">
                                    <td className="px-10 py-8"><div className="w-32 h-20 bg-white rounded-3xl p-4 border-2 shadow-inner group-hover:scale-105 transition-all flex items-center justify-center"><img src={method.logoUrl} className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all" /></div></td>
                                    <td className="px-10 py-8"><h4 className="font-black text-base uppercase italic">{method.name}</h4><p className="text-[9px] font-black text-gray-400 uppercase italic mt-2 tracking-widest flex items-center gap-1"><ShieldCheck size={12} /> Verified Integration</p></td>
                                    <td className="px-10 py-8 text-center"><button onClick={() => toggleStatus(method)} className={`px-6 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${method.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{method.isActive ? 'Network Active' : 'Offline'}</button></td>
                                    <td className="px-10 py-8 text-right"><button onClick={() => handleDelete(method.id)} className="p-4 bg-white text-red-600 border rounded-2xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default PaymentManager;
