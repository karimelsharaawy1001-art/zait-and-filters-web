import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';
import {
    CLOUDINARY_UPLOAD_URL,
    CLOUDINARY_UPLOAD_PRESET
} from '../../config/cloudinary';
import { toast } from 'react-hot-toast';
import {
    Plus,
    Trash2,
    Image as ImageIcon,
    Loader2,
    ToggleLeft,
    ToggleRight,
    AlertCircle
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const PaymentManager = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        try {
            const q = query(collection(db, 'payment_methods'), orderBy('order', 'asc'));
            const querySnapshot = await getDocs(q);
            setMethods(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching methods:", error);
            toast.error("Failed to load payment methods");
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check size (500KB limit)
            if (file.size > 500 * 1024) {
                toast.error("الملف كبير جداً! يجب أن يكون أقل من 500 كيلوبايت");
                e.target.value = null;
                return;
            }
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name) {
            toast.error("رجاءً أدخل اسم الشريك");
            return;
        }

        if (!image) {
            toast.error("رجاءً اختر صورة الشعار");
            return;
        }

        console.log(">>> [1/4] Starting Cloudinary upload process...");
        setSubmitting(true);

        try {
            // Prepare Cloudinary FormData
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            console.log(">>> [2/4] Posting to Cloudinary...", CLOUDINARY_UPLOAD_URL);

            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Cloudinary Response Error:", errorData);
                throw new Error(errorData.error?.message || "Cloudinary upload failed");
            }

            const cloudinaryData = await response.json();
            const logoUrl = cloudinaryData.secure_url;
            console.log(">>> [3/4] Secure URL generated:", logoUrl);

            console.log(">>> [4/4] Saving to Firestore...");
            await addDoc(collection(db, 'payment_methods'), {
                name,
                logoUrl,
                isActive: true,
                order: methods.length,
                createdAt: new Date().toISOString(),
                cloudinaryId: cloudinaryData.public_id // Storing ID for potential future deletion
            });

            console.log(">>> ALL STEPS COMPLETED SUCCESSFULLY");
            toast.success(`تمت إضافة ${name} بنجاح!`);

            // Reset form
            setName('');
            setImage(null);
            setPreview(null);
            fetchMethods();
        } catch (error) {
            console.error("CRITICAL UPLOAD ERROR:", error);
            toast.error(`فشل الرفع: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (method) => {
        try {
            await updateDoc(doc(db, 'payment_methods', method.id), {
                isActive: !method.isActive
            });
            fetchMethods();
        } catch (error) {
            toast.error("Update failed");
        }
    };

    const handleDelete = async (method) => {
        if (!window.confirm(`هل تريد مسح ${method.name}؟`)) return;
        try {
            await deleteDoc(doc(db, 'payment_methods', method.id));
            toast.success("تم المسح بنجاح");
            fetchMethods();
        } catch (error) {
            toast.error("فشل المسح");
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 font-sans" dir="rtl">
            <AdminHeader title="مدير شركاء الدفع والتقسيط (Cloudinary)" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sticky top-24">
                        <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                            <Plus className="h-6 w-6 text-orange-600" />
                            إضافة شريك جديد
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">اسم الشريك (Partner Name)</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                    placeholder="مثلاً: فوري، فاليو..."
                                    required
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">شعار الشريك (Logo)</label>
                                <div className="relative group">
                                    {preview ? (
                                        <div className="relative h-44 w-full rounded-3xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-100 flex items-center justify-center p-6">
                                            <img src={preview} alt="Preview" className="h-full w-full object-contain" />
                                            <button
                                                type="button"
                                                onClick={() => { setImage(null); setPreview(null); }}
                                                className="absolute top-4 left-4 bg-white/90 backdrop-blur shadow-xl text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="h-44 w-full rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 cursor-pointer hover:border-orange-200 hover:bg-orange-50/30 transition-all bg-gray-50/50 group">
                                            <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                <ImageIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest">اختر ملف الشعار</span>
                                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                        </label>
                                    )}
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                    <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
                                            المقاس المفضل: 200x100 بكسل<br />
                                            الخلفية: شفافة (PNG)<br />
                                            الحد الأقصى للملف: 500 كيلوبايت
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 active:scale-95"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span>جاري الرفع...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-6 w-6" />
                                        <span>حفظ الشريك الجديد</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-24 bg-white rounded-3xl border border-gray-100">
                            <Loader2 className="h-12 w-12 animate-spin text-orange-600 mb-4" />
                            <p className="text-sm font-bold text-gray-400">تحميل القائمة...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="font-black text-gray-900">الشركاء الحاليين ({methods.length})</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">إدارة العرض والترتيب</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">الشعار</th>
                                            <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">اسم الشريك</th>
                                            <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">الحالة</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {methods.map((method) => (
                                            <tr key={method.id} className="hover:bg-gray-50/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="h-12 w-24 bg-white rounded-xl border border-gray-100 overflow-hidden p-2 flex items-center justify-center group-hover:shadow-sm transition-shadow">
                                                        <img src={method.logoUrl} alt="" className="h-full w-auto object-contain" />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="font-bold text-gray-900">{method.name}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <button
                                                        onClick={() => toggleStatus(method)}
                                                        className="flex items-center justify-center w-full transition-transform active:scale-90"
                                                    >
                                                        {method.isActive ? (
                                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full ring-1 ring-green-100">
                                                                <ToggleRight className="h-5 w-5" />
                                                                <span className="text-[10px] font-black uppercase">نشط</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full ring-1 ring-gray-100">
                                                                <ToggleLeft className="h-5 w-5" />
                                                                <span className="text-[10px] font-black uppercase">معطل</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-8 py-6 text-left">
                                                    <button
                                                        onClick={() => handleDelete(method)}
                                                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentManager;
