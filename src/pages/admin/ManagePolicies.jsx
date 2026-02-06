import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Save, Loader2, FileText, Share2, ClipboardList, ShieldCheck, Zap, Activity, Info } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const ManagePolicies = () => {
    const [activeTab, setActiveTab] = useState('returns-policy');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState({
        'returns-policy': { title_ar: 'سياسة الاستبدال والاسترجاع', title_en: 'Returns & Refund Policy', content_ar: '', content_en: '' },
        'shipping-info': { title_ar: 'معلومات الشحن والتوصيل', title_en: 'Shipping Information', content_ar: '', content_en: '' }
    });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const POLICIES_COLLECTION = import.meta.env.VITE_APPWRITE_POLICIES_COLLECTION_ID || 'content_pages';

    const fetchPolicies = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const [returnsRes, shippingRes] = await Promise.all([
                databases.getDocument(DATABASE_ID, POLICIES_COLLECTION, 'returns-policy').catch(() => null),
                databases.getDocument(DATABASE_ID, POLICIES_COLLECTION, 'shipping-info').catch(() => null)
            ]);
            setContent({
                'returns-policy': returnsRes || { title_ar: 'سياسة الاستبدال والاسترجاع', title_en: 'Returns & Refund Policy', content_ar: '', content_en: '' },
                'shipping-info': shippingRes || { title_ar: 'معلومات الشحن والتوصيل', title_en: 'Shipping Information', content_ar: '', content_en: '' }
            });
        } catch (error) { toast.error("Regulatory registry failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPolicies(); }, [DATABASE_ID]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setContent(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [name]: value } }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...content[activeTab] };
            delete data.$id; delete data.$collectionId; delete data.$databaseId; delete data.$createdAt; delete data.$updatedAt; delete data.$permissions;
            try { await databases.updateDocument(DATABASE_ID, POLICIES_COLLECTION, activeTab, data); }
            catch (err) { await databases.createDocument(DATABASE_ID, POLICIES_COLLECTION, activeTab, data); }
            toast.success("Regulatory update committed");
        } catch (error) { toast.error("Deployment failure"); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div>;

    const currentData = content[activeTab];

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Regulatory Intelligence" />
            <main className="max-w-5xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Legal Matrix</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Maintaining Platform Integrity & Compliance Protocols</p>
                    </div>
                </div>

                <div className="flex bg-white p-2 rounded-[2rem] mb-12 w-fit border shadow-sm">
                    <button onClick={() => setActiveTab('returns-policy')} className={`px-8 py-4 rounded-2xl font-black uppercase italic text-xs transition-all flex items-center gap-3 ${activeTab === 'returns-policy' ? 'bg-black text-white shadow-2xl' : 'text-gray-400 hover:bg-gray-50'}`}><ClipboardList size={16} /> Returns Policy</button>
                    <button onClick={() => setActiveTab('shipping-info')} className={`px-8 py-4 rounded-2xl font-black uppercase italic text-xs transition-all flex items-center gap-3 ${activeTab === 'shipping-info' ? 'bg-black text-white shadow-2xl' : 'text-gray-400 hover:bg-gray-50'}`}><Share2 size={16} /> Shipping Logistics</button>
                </div>

                <form onSubmit={handleSave} className="space-y-10">
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-gray-100 relative overflow-hidden space-y-12">
                        <div className="flex items-center gap-4 text-black"><div className="bg-gray-100 p-4 rounded-2xl"><FileText size={24} /></div><h3 className="text-xl font-black uppercase italic tracking-widest">Protocol Revision: {activeTab.replace('-', ' ')}</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4 font-sans"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Official Document Title (EN)</label><input type="text" name="title_en" value={currentData.title_en} onChange={handleChange} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all font-Cairo" required /></div>
                            <div className="space-y-4 text-right"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 italic">المسمى الرسمي للمستند (عربي)</label><input type="text" name="title_ar" value={currentData.title_ar} onChange={handleChange} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all text-right font-Cairo" dir="rtl" required /></div>
                        </div>
                        <div className="space-y-10">
                            <div className="space-y-4 font-sans"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Constitutional Text (English)</label><textarea name="content_en" value={currentData.content_en} onChange={handleChange} rows="12" className="w-full px-8 py-8 bg-gray-50 border-2 rounded-[2.5rem] font-bold text-sm leading-relaxed outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all font-Cairo" placeholder="Enter legal text..." required /></div>
                            <div className="space-y-4 text-right"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 italic">النص الدستوري (بالعربية)</label><textarea name="content_ar" value={currentData.content_ar} onChange={handleChange} rows="12" className="w-full px-8 py-8 bg-gray-50 border-2 rounded-[2.5rem] font-bold text-sm leading-relaxed outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all text-right font-Cairo" dir="rtl" placeholder="أدخل النص القانوني..." required /></div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-6 items-center"><p className="text-[10px] font-black text-gray-400 uppercase italic flex items-center gap-2"><Info size={14} /> Revision timestamp will be automated upon commit</p><button type="submit" disabled={saving} className="bg-black text-white px-12 py-5 rounded-[2rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] transition-all flex items-center gap-3">{saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Commit Revisions</button></div>
                </form>
            </main>
        </div>
    );
};

export default ManagePolicies;
