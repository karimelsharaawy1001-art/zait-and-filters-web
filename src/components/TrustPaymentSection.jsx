import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Lock, Loader2, UploadCloud, CheckCircle2, Copy, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

const TrustPaymentSection = ({ method, onReceiptUpload, isUploading }) => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);

    useEffect(() => {
        const fetchActiveMethods = async () => {
            try {
                // Fetch specific known method documents instead of entire collection to save quota
                // We know the keys we care about
                const knownKeys = ['cod', 'easykash', 'instapay', 'wallet'];
                const fetchPromises = knownKeys.map(key => getDoc(doc(db, 'payment_methods', key)));
                const snapshots = await Promise.all(fetchPromises);

                const active = [];
                snapshots.forEach(snap => {
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.isActive) {
                            active.push({ id: snap.id, ...data });
                        }
                    }
                });

                // Sort by order if available, otherwise default order
                active.sort((a, b) => (a.order || 0) - (b.order || 0));

                setMethods(active);
            } catch (error) {
                console.error("Error fetching payment methods:", error);
                setMethods([]);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveMethods();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error(isAr ? 'حجم الصورة كبير جداً (أقصى حد 5 ميجا)' : 'File size too large (Max 5MB)');
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error(isAr ? 'يجب تحميل صورة فقط' : 'Please upload an image file');
            return;
        }

        try {
            setUploadProgress(true);
            if (isUploading) isUploading(true);

            // Upload to Firebase Storage
            const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setUploadedFile(file.name);
            if (onReceiptUpload) onReceiptUpload(downloadURL);
            toast.success(isAr ? 'تم رفع الإيصال بنجاح' : 'Receipt uploaded successfully');

        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(isAr ? 'فشل رفع الإيصال' : 'Upload failed');
        } finally {
            setUploadProgress(false);
            if (isUploading) isUploading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success(isAr ? 'تم النسخ' : 'Copied to clipboard');
    };

    if (loading) return null; // Keep it clean during load

    // MODE 1: UPLOAD / DETAILS (If method prop is provided)
    if (method) {
        const currentMethodConfig = methods.find(m => m.id === method);
        if (!currentMethodConfig) return null;

        return (
            <div className="mt-6 p-6 bg-gray-50 border border-gray-100 rounded-2xl animate-fade-in">
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                            {/* Use logo if available, else generic icon based on ID */}
                            {currentMethodConfig.logoUrl ? (
                                <img src={currentMethodConfig.logoUrl} alt={currentMethodConfig.name} className="w-10 h-10 object-contain" />
                            ) : (
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                                    {method.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm">
                                {isAr ? 'تعليمات الدفع' : 'Payment Instructions'}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                {isAr
                                    ? `يرجى تحويل المبلغ الإجمالي إلى حساب ${currentMethodConfig.nameAr || currentMethodConfig.name} التالي:`
                                    : `Please transfer the total amount to the following ${currentMethodConfig.name} account:`}
                            </p>
                        </div>
                    </div>

                    {currentMethodConfig.number && (
                        <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300 flex items-center justify-between group cursor-pointer hover:border-orange-500 transition-colors" onClick={() => copyToClipboard(currentMethodConfig.number)}>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{isAr ? 'رقم التحويل' : 'Transfer Number'}</span>
                                <span className="text-lg font-mono font-black text-gray-900 tracking-wider">{currentMethodConfig.number}</span>
                            </div>
                            <button type="button" className="text-gray-400 group-hover:text-orange-500 transition-colors">
                                <Copy size={18} />
                            </button>
                        </div>
                    )}

                    {/* If payment link exists, show Pay Now button */}
                    {currentMethodConfig.paymentLink && (
                        <div className="mt-4">
                            <a
                                href={currentMethodConfig.paymentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-5 px-8 rounded-2xl font-black uppercase text-center shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-[1.02] active:scale-95"
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <Activity size={24} className="animate-pulse" />
                                    <span className="text-lg">{isAr ? 'ادفع الآن' : 'PAY NOW'}</span>
                                </div>
                            </a>
                            <p className="text-xs text-center text-gray-500 mt-3 italic">
                                {isAr ? 'سيتم فتح صفحة الدفع في نافذة جديدة' : 'Payment page will open in a new window'}
                            </p>
                        </div>
                    )}

                    {/* Always show upload section for manual payment methods */}
                    <div className="mt-4">
                        {currentMethodConfig.paymentLink && (
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs font-bold text-gray-400 uppercase">{isAr ? 'أو' : 'OR'}</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>
                        )}
                        <label className="block w-full cursor-pointer group">
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={uploadProgress}
                            />
                            <div className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center gap-3 transition-all ${uploadedFile ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'}`}>
                                {uploadProgress ? (
                                    <Loader2 className="animate-spin text-orange-500" size={32} />
                                ) : uploadedFile ? (
                                    <CheckCircle2 className="text-green-600" size={32} />
                                ) : (
                                    <UploadCloud className="text-gray-400 group-hover:text-orange-500 transition-colors" size={32} />
                                )}

                                <div className="text-center">
                                    <p className={`text-sm font-bold ${uploadedFile ? 'text-green-700' : 'text-gray-600'}`}>
                                        {uploadedFile ? (isAr ? 'تم استلام الإيصال' : 'Receipt Attached') : (isAr ? 'اضغط لرفع صورة التحويل' : 'Click to upload receipt')}
                                    </p>
                                    {!uploadedFile && <p className="text-[10px] text-gray-400 mt-1">{isAr ? 'أو اسحب وأفلت هنا' : 'or drag and drop here'}</p>}
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        );
    }

    // MODE 2: TRUST BADGES (Default / Footer)
    if (methods.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Lock size={14} className="text-gray-400" />
                <span className="text-[13px] font-black text-gray-800 uppercase tracking-tight">{t('availableMethods')}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
                {methods.map((m) => (
                    <div
                        key={m.id}
                        className="bg-white p-1 rounded-lg border border-gray-50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-110 flex items-center justify-center"
                        style={{ height: '30px', minWidth: '50px' }}
                    >
                        {m.logoUrl ? (
                            <img
                                src={m.logoUrl}
                                alt={m.name}
                                className="h-full w-auto object-contain"
                                title={m.name}
                                loading="lazy"
                            />
                        ) : (
                            <span className="text-[9px] font-bold text-gray-500 px-2">{m.name}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-orange-600 font-black text-[11px] uppercase tracking-widest bg-orange-50/50 py-2 rounded-xl border border-orange-100/50">
                <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
                {t('deliveryTime')}
            </div>
        </div>
    );
};

export default TrustPaymentSection;
