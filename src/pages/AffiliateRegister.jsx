import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { databases } from '../appwrite';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from 'firebase/auth';
import { setDoc, doc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Users, Mail, Lock, User, Wallet, Phone, ArrowRight, AlertCircle, Sparkles, LogOut, TrendingUp, Clock, ShieldCheck, CheckCircle2, LayoutDashboard, Rocket, LogIn } from 'lucide-react';

const AffiliateRegister = () => {
    const navigate = useNavigate();
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        instaPayNumber: '',
        walletNumber: ''
    });
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [activeTab, setActiveTab] = useState('register'); // 'register' or 'login'
    const formRef = useRef(null);

    const scrollToForm = (tab) => {
        setActiveTab(tab);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validatePayout = () => {
        if (!formData.instaPayNumber.trim() && !formData.walletNumber.trim()) {
            setError('Please provide at least one payout method (InstaPay or Mobile Wallet).');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validatePayout()) return;

        setLoading(true);
        try {
            let activeUser = user;

            // 1. Create Firebase Auth User (If not logged in)
            // 1. Create Firebase Auth User (If not logged in)
            if (!activeUser) {
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                    activeUser = userCredential.user;
                    await updateProfile(activeUser, { displayName: formData.fullName });
                } catch (createError) {
                    if (createError.code === 'auth/email-already-in-use') {
                        // User exists, try to log them in
                        try {
                            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                            activeUser = userCredential.user;
                            // Update name just in case
                            if (formData.fullName) {
                                await updateProfile(activeUser, { displayName: formData.fullName });
                            }
                        } catch (loginError) {
                            if (loginError.code === 'auth/wrong-password') {
                                throw new Error('هذا البريد الإلكتروني مسجل بالفعل ولكن كلمة المرور غير صحيحة.');
                            } else {
                                throw loginError;
                            }
                        }
                    } else {
                        throw createError;
                    }
                }
            }

            // 2. Auto-generate Robust & Unique Referral Code
            // Remove non-English characters to ensure URL safety
            const englishName = formData.fullName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            let baseCode = englishName.length >= 3 ? englishName.substring(0, 8) : activeUser.uid.substring(0, 6).toUpperCase();

            let referralCode = '';
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 10) {
                // Format: ZAF_NAME5 or ZAF_NAME1235
                const suffix = attempts === 0 ? '5' : `${Math.floor(100 + Math.random() * 900)}5`;
                referralCode = `ZAF_${baseCode}${suffix}`;

                // Check both affiliates and promo_codes collections for collision
                const qAff = query(collection(db, 'affiliates'), where('referralCode', '==', referralCode));
                const qPromo = query(collection(db, 'promo_codes'), where('code', '==', referralCode));

                const [affSnap, promoSnap] = await Promise.all([getDocs(qAff), getDocs(qPromo)]);

                if (affSnap.empty && promoSnap.empty) {
                    isUnique = true;
                } else {
                    attempts++;
                }
            }

            if (!isUnique) {
                // Fallback to purely random if name is super common
                referralCode = `ZAF_${activeUser.uid.substring(0, 5).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}5`;
            }

            // 3. Update User Document in Firestore
            await setDoc(doc(db, 'users', activeUser.uid), {
                fullName: formData.fullName,
                email: formData.email,
                isAffiliate: true,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 4. Create Promo Code
            await addDoc(collection(db, 'promo_codes'), {
                code: referralCode,
                discount: 5,
                type: 'percentage',
                active: true,
                description: `Affiliate Promo for ${referralCode}`,
                createdAt: serverTimestamp()
            });

            // 5. Create Affiliate Document
            await setDoc(doc(db, 'affiliates', activeUser.uid), {
                userId: activeUser.uid,
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                referralCode: referralCode,
                linkedPromoCode: referralCode,
                commissionRate: 0.05,
                commissionPercentage: 5,
                currentTier: 1,
                referralCount: 0,
                totalEarnings: 0,
                pendingBalance: 0,
                instaPayNumber: formData.instaPayNumber,
                walletNumber: formData.walletNumber,
                status: 'pending', // Pending admin approval
                createdAt: serverTimestamp()
            });

            // 6. Dual-Write to Appwrite (For Admin Panel Visibility)
            try {
                const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const AFFILIATES_COLLECTION = import.meta.env.VITE_APPWRITE_AFFILIATES_COLLECTION_ID || 'affiliates';
                const PROMO_CODES_COLLECTION = import.meta.env.VITE_APPWRITE_PROMO_CODES_COLLECTION_ID || 'promo_codes';

                if (DATABASE_ID) {
                    // Ensure ID is valid for Appwrite (replace non-alphanumeric with underscore, max 36 chars)
                    // But since we use Firebase UID which is shorter, it should be fine.  
                    // Let's use the same ID logic: valid Appwrite ID chars are a-z, A-Z, 0-9, _, . and -
                    // Firebase UIDs are alphanumeric.

                    await databases.createDocument(DATABASE_ID, AFFILIATES_COLLECTION, activeUser.uid, {
                        fullName: formData.fullName,
                        email: formData.email,
                        phone: formData.phone,
                        referralCode: referralCode,
                        linkedPromoCode: referralCode,
                        commissionRate: 0.05,
                        commissionPercentage: 5,
                        currentTier: 1,
                        referralCount: 0,
                        totalEarnings: 0.0,
                        pendingBalance: 0.0,
                        instaPayNumber: formData.instaPayNumber,
                        walletNumber: formData.walletNumber,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    }).catch(e => console.error("Appwrite Affiliate Sync Error:", e));

                    const { ID } = await import('appwrite');
                    await databases.createDocument(DATABASE_ID, PROMO_CODES_COLLECTION, ID.unique(), {
                        code: referralCode,
                        type: 'discount',
                        value: 5,
                        isPercentage: true,
                        isActive: true,
                        affiliateId: activeUser.uid,
                        usageLimit: 10000,
                        usedCount: 0,
                        createdAt: new Date().toISOString()
                    }).catch(e => console.error("Appwrite Promo Sync Error:", e));
                }
            } catch (appwriteError) {
                console.error("Appwrite Sync Failed (Non-blocking):", appwriteError);
            }

            navigate('/affiliate-dashboard');
        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.message || 'Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
            // The AffiliateProtectedRoute will handle checks
            navigate('/affiliate-dashboard');
        } catch (err) {
            console.error("Login Error:", err);
            setError('بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setFormData(prev => ({
                    ...prev,
                    fullName: currentUser.displayName || '',
                    email: currentUser.email || ''
                }));

                // Check if already an affiliate
                try {
                    const { getDoc, doc } = await import('firebase/firestore');
                    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userSnap.exists() && userSnap.data().isAffiliate) {
                        navigate('/affiliate-dashboard');
                    }
                } catch (err) {
                    console.error("Affiliate Status Check Error:", err);
                }
            }
            setCheckingAuth(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleLogoutAndRestart = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setFormData({
                fullName: '',
                email: '',
                password: '',
                phone: '',
                instaPayNumber: '',
                walletNumber: ''
            });
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
            <div className="max-w-4xl mx-auto">
                {/* 1. Hero Section (Full Width) */}
                <section className="relative w-full py-16 md:py-24 px-4 border-b border-gray-50 flex flex-col items-center justify-center text-center overflow-hidden">
                    {/* Background Decoration */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden">
                        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-red-600 blur-3xl" />
                        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-red-600 blur-3xl" />
                    </div>

                    <div className="max-w-5xl mx-auto relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-[#FF0000] text-xs font-black uppercase tracking-widest mb-8 animate-fade-in-up">
                            <Rocket className="h-4 w-4" />
                            نظام شركاء زيت اند فلترز
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-black mb-8 leading-[1.15] tracking-tight animate-fade-in-up">
                            انضم لأقوى نظام تسويق بالعمولة <br />
                            <span className="text-[#FF0000]">لقطع غيار السيارات في مصر!</span>
                        </h1>

                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-600 font-bold leading-relaxed mb-12 animate-fade-in-up delay-100">
                            ابدأ مشروعك دلوقتي وحقق أرباح حقيقية من خلال تسويق قطع غيار سيارات أصلية 100% وبالضمان من <span className="text-black font-black">ZAITANDFILTERS.COM</span>. احنا بنوفرلك المنتج، الشحن، والتحصيل - وانت عليك التسويق بس!
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 animate-fade-in-up delay-200">
                            <button
                                onClick={() => scrollToForm('register')}
                                className="w-full sm:w-auto px-10 py-5 bg-[#FF0000] text-white font-black text-lg rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 flex items-center justify-center gap-3 uppercase tracking-wider group"
                            >
                                سجل كمسوق جديد
                                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
                            </button>
                            <button
                                onClick={() => scrollToForm('login')}
                                className="w-full sm:w-auto px-10 py-5 bg-white text-black border-2 border-black font-black text-lg rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                            >
                                <LogIn className="h-6 w-6" />
                                تسجيل دخول المسوقين
                            </button>
                        </div>
                    </div>
                </section>

                {/* 2. Benefits Grid */}
                <section className="py-20 px-4 bg-gray-50/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight mb-4 font-Cairo">ليه تبدأ مع زيت اند فلترز؟</h2>
                            <div className="w-24 h-1.5 bg-[#FF0000] mx-auto rounded-full" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                            {/* Benefit 1 */}
                            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-2 group">
                                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 transition-transform">
                                    <TrendingUp className="h-10 w-10 text-[#FF0000]" />
                                </div>
                                <h3 className="text-xl font-black text-black mb-4 font-Cairo">عمولات مجزية</h3>
                                <p className="text-gray-600 font-bold leading-relaxed font-Cairo">
                                    حقق أرباح تصل إلى <span className="text-[#FF0000]">10%</span> على كل مبيعة تتم من خلالك، مع نظام مكافآت للمسوقين المتميزين.
                                </p>
                            </div>

                            {/* Benefit 2 */}
                            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-2 group">
                                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-8 -rotate-3 group-hover:rotate-0 transition-transform">
                                    <LayoutDashboard className="h-10 w-10 text-[#FF0000]" />
                                </div>
                                <h3 className="text-xl font-black text-black mb-4 font-Cairo">لوحة تحكم ذكية</h3>
                                <p className="text-gray-600 font-bold leading-relaxed font-Cairo">
                                    لوحة تحكم متكاملة لمتابعة مبيعاتك، أرباحك، وتقارير الزيارات لحظة بلحظة وبكل شفافية.
                                </p>
                            </div>

                            {/* Benefit 3 */}
                            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-2 group">
                                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                                    <ShieldCheck className="h-10 w-10 text-[#FF0000]" />
                                </div>
                                <h3 className="text-xl font-black text-black mb-4 font-Cairo">سحب أرباح سهل</h3>
                                <p className="text-gray-600 font-bold leading-relaxed font-Cairo">
                                    اسحب أرباحك في أي وقت عبر <span className="text-black font-black">InstaPay</span> أو المحافظ الإلكترونية بكل سهولة وبدون تعقيد.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Forms Section (Anchored) */}
                <section ref={formRef} className="py-24 px-4 max-w-4xl mx-auto scroll-mt-24">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                        {/* Tab Navigation */}
                        <div className="flex border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('register')}
                                className={`flex-1 py-6 text-sm font-black uppercase tracking-widest transition-all font-Cairo ${activeTab === 'register' ? 'bg-white text-[#FF0000] border-b-4 border-[#FF0000]' : 'bg-gray-50 text-gray-400 border-b-4 border-transparent'}`}
                            >
                                {user ? 'ترقية الحساب' : 'إنشاء حساب مسوق'}
                            </button>
                            <button
                                onClick={() => setActiveTab('login')}
                                className={`flex-1 py-6 text-sm font-black uppercase tracking-widest transition-all font-Cairo ${activeTab === 'login' ? 'bg-white text-[#FF0000] border-b-4 border-[#FF0000]' : 'bg-gray-50 text-gray-400 border-b-4 border-transparent'}`}
                            >
                                تسجيل الدخول
                            </button>
                        </div>

                        <div className="p-8 md:p-12">
                            {error && (
                                <div className="mb-8 bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-shake font-Cairo">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {activeTab === 'register' ? (
                                <form onSubmit={handleSubmit} className="space-y-8 font-Cairo">
                                    {user && (
                                        <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100 mb-8">
                                            <h3 className="text-sm font-black text-red-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                                                <Sparkles className="h-4 w-4" />
                                                جلسة نشطة مكتشفة
                                            </h3>
                                            <p className="text-xs text-red-800 font-medium leading-relaxed mb-4">
                                                أنت مسجل الدخول حالياً بـ <strong>{user.email}</strong>. هل تريد تفعيل ميزة التسويق لهذا الحساب؟
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleLogoutAndRestart}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-900 bg-red-200/50 hover:bg-red-200 px-4 py-2 rounded-lg transition-all"
                                            >
                                                <LogOut className="h-3.5 w-3.5" />
                                                تسجيل الخروج والبدء بحساب جديد
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-black uppercase tracking-widest">الاسم بالكامل</label>
                                            <div className="relative">
                                                <User className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                    placeholder="أحمد علي"
                                                    required
                                                    disabled={!!user}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-black uppercase tracking-widest">البريد الإلكتروني</label>
                                            <div className="relative">
                                                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                    placeholder="ahmed@example.com"
                                                    required
                                                    disabled={!!user}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-black uppercase tracking-widest">رقم الموبايل</label>
                                        <div className="relative">
                                            <Phone className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                placeholder="01xxxxxxxxx"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {!user && (
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-black uppercase tracking-widest">كلمة المرور</label>
                                            <div className="relative">
                                                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                <input
                                                    type="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                    placeholder="••••••••"
                                                    required={!user}
                                                    minLength={6}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-8 border-t border-gray-100">
                                        <h3 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Wallet className="h-5 w-5 text-[#FF0000]" />
                                            بيانات سحب العمولات
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">رقم انستاپاي (InstaPay)</label>
                                                <input
                                                    type="text"
                                                    name="instaPayNumber"
                                                    value={formData.instaPayNumber}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                    placeholder="username@instapay"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-black uppercase tracking-widest">رقم المحفظة الإلكترونية</label>
                                                <input
                                                    type="text"
                                                    name="walletNumber"
                                                    value={formData.walletNumber}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                    placeholder="01xxxxxxxxx"
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-4 text-xs text-gray-400 font-bold italic">* سحب الأرباح يتم أسبوعياً عند الوصول للحد الأدنى.</p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#FF0000] text-white font-black py-5 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                    >
                                        {loading ? 'جاري التنفيذ...' : (user ? 'تفعيل ميزة التسويق' : 'سجل كمسوق الآن')}
                                        {!loading && <CheckCircle2 className="h-5 w-5" />}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleLoginSubmit} className="space-y-8 font-Cairo">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-black uppercase tracking-widest">البريد الإلكتروني</label>
                                        <div className="relative">
                                            <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="email"
                                                value={loginData.email}
                                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                                className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                placeholder="ahmed@example.com"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-black uppercase tracking-widest">كلمة المرور</label>
                                        <div className="relative">
                                            <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="password"
                                                value={loginData.password}
                                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                                className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#FF0000] focus:outline-none transition-all font-bold text-black"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-gray-900 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                    >
                                        {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                                        {!loading && <LogIn className="h-5 w-5" />}
                                    </button>

                                    <div className="text-center font-Cairo">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('register')}
                                            className="text-sm font-bold text-[#FF0000] hover:underline"
                                        >
                                            ليس لديك حساب مسوق؟ سجل الآن
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AffiliateRegister;
