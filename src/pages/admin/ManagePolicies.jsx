import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Save, Loader2, FileText, Share2, ClipboardList } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const ManagePolicies = () => {
    const [activeTab, setActiveTab] = useState('returns-policy');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [content, setContent] = useState({
        'returns-policy': { title_ar: '', title_en: '', content_ar: '', content_en: '' },
        'shipping-info': { title_ar: '', title_en: '', content_ar: '', content_en: '' }
    });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const returnsSnap = await getDoc(doc(db, 'content_pages', 'returns-policy'));
            const shippingSnap = await getDoc(doc(db, 'content_pages', 'shipping-info'));

            setContent({
                'returns-policy': returnsSnap.exists() ? returnsSnap.data() : { title_ar: 'سياسة الاستبدال والاسترجاع', title_en: 'Returns & Refund Policy', content_ar: '', content_en: '' },
                'shipping-info': shippingSnap.exists() ? shippingSnap.data() : { title_ar: 'معلومات الشحن والتوصيل', title_en: 'Shipping Information', content_ar: '', content_en: '' }
            });
        } catch (error) {
            console.error("Error fetching policies:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setContent(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [name]: value
            }
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'content_pages', activeTab), content[activeTab]);
            toast.success("Policy updated successfully!");
        } catch (error) {
            console.error("Error saving policy:", error);
            toast.error("Error saving policy");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-admin-red" />
            </div>
        );
    }

    const currentData = content[activeTab];

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <AdminHeader title="Policy Pages Management" />

            {/* Tabs */}
            <div className="flex bg-[#111111] p-1.5 rounded-2xl mb-8 w-fit border border-admin-border shadow-2xl">
                <button
                    onClick={() => setActiveTab('returns-policy')}
                    className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2.5 text-sm ${activeTab === 'returns-policy' ? 'bg-admin-red text-white shadow-lg shadow-admin-red/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <ClipboardList className="h-4 w-4" /> Returns Policy
                </button>
                <button
                    onClick={() => setActiveTab('shipping-info')}
                    className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2.5 text-sm ${activeTab === 'shipping-info' ? 'bg-admin-red text-white shadow-lg shadow-admin-red/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Share2 className="h-4 w-4" /> Shipping Info
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-carbon-grey p-10 rounded-[2.5rem] shadow-2xl border border-admin-border space-y-10 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>

                    {/* Header Icon/Indicator */}
                    <div className="flex items-center gap-4 text-admin-red relative z-10">
                        <div className="bg-admin-red/10 p-3 rounded-2xl">
                            <FileText className="h-7 w-7" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic font-Cairo">
                            Editing: {activeTab === 'returns-policy' ? 'Returns Policy' : 'Shipping Information'}
                        </h2>
                    </div>

                    {/* Titles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        <div className="group">
                            <label className="block text-xs font-black text-admin-text-secondary mb-3 ml-1 uppercase tracking-widest leading-none">Page Title (English)</label>
                            <input
                                type="text"
                                name="title_en"
                                value={currentData.title_en}
                                onChange={handleChange}
                                className="w-full bg-matte-black border border-admin-border text-white rounded-2xl p-4 focus:ring-2 focus:ring-admin-red/50 focus:border-admin-red outline-none transition-all placeholder:text-gray-600 font-bold"
                                placeholder="e.g. Terms and Conditions"
                                required
                            />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-black text-admin-text-secondary mb-3 mr-1 text-right uppercase tracking-widest leading-none font-Cairo">عنوان الصفحة (بالعربية)</label>
                            <input
                                type="text"
                                name="title_ar"
                                value={currentData.title_ar}
                                onChange={handleChange}
                                className="w-full bg-matte-black border border-admin-border text-white rounded-2xl p-4 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all text-right dir-rtl font-Cairo font-bold"
                                dir="rtl"
                                placeholder="مثال: سياسة الاستبدال"
                                required
                            />
                        </div>
                    </div>

                    {/* Content Areas */}
                    <div className="grid grid-cols-1 gap-10 relative z-10">
                        <div className="group">
                            <label className="block text-xs font-black text-admin-text-secondary mb-3 ml-1 uppercase tracking-widest leading-none">Content (English)</label>
                            <textarea
                                name="content_en"
                                value={currentData.content_en}
                                onChange={handleChange}
                                rows="12"
                                className="w-full bg-matte-black border border-admin-border text-white rounded-2xl p-6 focus:ring-2 focus:ring-admin-red/50 focus:border-admin-red outline-none transition-all font-mono text-sm leading-relaxed placeholder:text-gray-600"
                                placeholder="Enter policy content in English here..."
                                required
                            ></textarea>
                            <p className="mt-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Line breaks will be preserved in the frontend.</p>
                        </div>
                        <div className="group">
                            <label className="block text-xs font-black text-admin-text-secondary mb-3 mr-1 text-right uppercase tracking-widest leading-none font-Cairo">المحتوى (بالعربية)</label>
                            <textarea
                                name="content_ar"
                                value={currentData.content_ar}
                                onChange={handleChange}
                                rows="12"
                                className="w-full bg-matte-black border border-admin-border text-white rounded-2xl p-6 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all text-right dir-rtl leading-relaxed font-Cairo placeholder:text-gray-600"
                                dir="rtl"
                                placeholder="أدخل محتوى السياسة باللغة العربية هنا..."
                                required
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pb-10">
                    <button
                        type="submit"
                        disabled={saving}
                        className="admin-primary-btn w-fit px-12"
                    >
                        {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManagePolicies;
