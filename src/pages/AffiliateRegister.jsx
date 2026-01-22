import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from 'firebase/auth';
import { setDoc, doc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Users, Mail, Lock, User, Wallet, Phone, ArrowRight, AlertCircle, Sparkles, LogOut } from 'lucide-react';

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

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setFormData(prev => ({
                    ...prev,
                    fullName: currentUser.displayName || '',
                    email: currentUser.email || ''
                }));
            }
            setCheckingAuth(false);
        });
        return () => unsubscribe();
    }, []);

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
            if (!activeUser) {
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                activeUser = userCredential.user;
                await updateProfile(activeUser, { displayName: formData.fullName });
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
                status: 'active',
                createdAt: serverTimestamp()
            });

            navigate('/affiliate-dashboard');
        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.message || 'Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
            <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                    <div className="bg-white p-10 text-center relative border-b border-gray-100">
                        {user && (
                            <div className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-lg animate-pulse">
                                <Sparkles className="h-3 w-3" />
                                Account Upgrade
                            </div>
                        )}
                        <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                        <h2 className="text-3xl font-black text-black uppercase tracking-wider mb-2">
                            {user ? 'Upgrade to Partner' : 'Partner Registration'}
                        </h2>
                        <p className="text-gray-600">
                            {user ? `Logged in as ${user.email}` : 'Join our tiered affiliate program and start earning'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-10 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-shake">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {user && (
                            <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100 mb-6">
                                <h3 className="text-sm font-black text-orange-900 uppercase tracking-tight mb-2 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Active Session Detected
                                </h3>
                                <p className="text-xs text-orange-800 font-medium leading-relaxed mb-4">
                                    You are currently logged in as <strong>{user.email}</strong>. Would you like to activate your affiliate status for this account?
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleLogoutAndRestart}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-900 bg-orange-200/50 hover:bg-orange-200 px-4 py-2 rounded-lg transition-all"
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                        Logout & New Account
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666] disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder="Ahmed Ali"
                                        required
                                        disabled={!!user}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666] disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder="ahmed@example.com"
                                        required
                                        disabled={!!user}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">Mobile Number (رقم الموبايل)</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                    placeholder="01xxxxxxxxx"
                                    required
                                />
                            </div>
                        </div>

                        {!user && (
                            <div>
                                <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                        placeholder="••••••••"
                                        required={!user}
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-100 mt-4">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Payout Details (رقم استحقاق الأرباح)</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2">InstaPay Number (رقم انستاباي)</label>
                                    <div className="relative">
                                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                        <input
                                            type="text"
                                            name="instaPayNumber"
                                            value={formData.instaPayNumber}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                            placeholder="username@instapay"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2">Mobile Wallet Number (رقم المحفظة)</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                        <input
                                            type="text"
                                            name="walletNumber"
                                            value={formData.walletNumber}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                            placeholder="01xxxxxxxxx"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium italic">At least one payout method is required.</p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl hover:bg-orange-700 transition-all shadow-xl hover:shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                        >
                            {loading ? (user ? 'Upgrading Account...' : 'Creating Partner Account...') : (user ? 'Upgrade to Affiliate' : 'Register as Affiliate')}
                            {!loading && <ArrowRight className="h-5 w-5" />}
                        </button>

                        {!user && (
                            <p className="text-center text-sm text-gray-600 font-medium">
                                Already have an account? <Link to="/login" className="text-orange-600 font-black hover:underline">Login here</Link>
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AffiliateRegister;
