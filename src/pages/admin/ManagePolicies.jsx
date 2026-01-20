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
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    const currentData = content[activeTab];

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <AdminHeader title="Policy Pages Management" />

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('returns-policy')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'returns-policy' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ClipboardList className="h-4 w-4" /> Returns Policy
                </button>
                <button
                    onClick={() => setActiveTab('shipping-info')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'shipping-info' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Share2 className="h-4 w-4" /> Shipping Info
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
                    {/* Header Icon/Indicator */}
                    <div className="flex items-center gap-3 text-orange-600">
                        <FileText className="h-6 w-6" />
                        <h2 className="text-xl font-bold text-gray-900">
                            Editing: {activeTab === 'returns-policy' ? 'Returns Policy' : 'Shipping Information'}
                        </h2>
                    </div>

                    {/* Titles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Page Title (English)</label>
                            <input
                                type="text"
                                name="title_en"
                                value={currentData.title_en}
                                onChange={handleChange}
                                className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="e.g. Terms and Conditions"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">عنوان الصفحة (بالعربية)</label>
                            <input
                                type="text"
                                name="title_ar"
                                value={currentData.title_ar}
                                onChange={handleChange}
                                className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-right"
                                dir="rtl"
                                placeholder="مثال: سياسة الاستبدال"
                                required
                            />
                        </div>
                    </div>

                    {/* Content Areas */}
                    <div className="grid grid-cols-1 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Content (English)</label>
                            <textarea
                                name="content_en"
                                value={currentData.content_en}
                                onChange={handleChange}
                                rows="12"
                                className="w-full border rounded-xl p-4 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                placeholder="Enter policy content in English here..."
                                required
                            ></textarea>
                            <p className="mt-2 text-xs text-gray-400">Line breaks will be preserved in the frontend.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">المحتوى (بالعربية)</label>
                            <textarea
                                name="content_ar"
                                value={currentData.content_ar}
                                onChange={handleChange}
                                rows="12"
                                className="w-full border rounded-xl p-4 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-right dir-rtl leading-relaxed"
                                dir="rtl"
                                placeholder="أدخل محتوى السياسة باللغة العربية هنا..."
                                required
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:bg-orange-300"
                    >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManagePolicies;
