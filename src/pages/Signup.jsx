import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, serverTimestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { User, Mail, Lock, UserPlus, ArrowRight, AlertCircle } from 'lucide-react';
import PhoneInputGroup from '../components/PhoneInputGroup';
import { useTranslation } from 'react-i18next';

const Signup = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            if (formData.phoneNumber.length < 10) {
                setError('Please enter a valid phone number (at least 10 digits).');
                setLoading(false);
                return;
            }

            const formattedPhone = `+2${formData.phoneNumber}`;

            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: formData.fullName });

            // Create user doc in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: formattedPhone,
                isAffiliate: false,
                createdAt: serverTimestamp()
            });

            // Phase 3: Link historical guest orders
            await linkGuestOrders(user.uid, formData.email, formattedPhone);

            navigate('/');
        } catch (err) {
            console.error("Signup Error:", err);
            setError(err.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };
    const linkGuestOrders = async (userId, email, phone) => {
        try {
            const ordersRef = collection(db, 'orders');
            const batch = writeBatch(db);
            let foundCount = 0;

            // Query by phone
            const qPhone = query(
                ordersRef,
                where('customerPhone', '==', phone),
                where('userId', '==', 'guest')
            );
            const phoneSnap = await getDocs(qPhone);
            phoneSnap.forEach((doc) => {
                batch.update(doc.ref, { userId: userId });
                foundCount++;
            });

            // Query by email (if exists)
            if (email) {
                const qEmail = query(
                    ordersRef,
                    where('customerEmail', '==', email),
                    where('userId', '==', 'guest')
                );
                const emailSnap = await getDocs(qEmail);
                emailSnap.forEach((doc) => {
                    // Check if not already included in phone query
                    if (!phoneSnap.docs.some(d => d.id === doc.id)) {
                        batch.update(doc.ref, { userId: userId });
                        foundCount++;
                    }
                });
            }

            if (foundCount > 0) {
                await batch.commit();
                console.log(`Linked ${foundCount} guest orders to new user account.`);
            }
        } catch (error) {
            console.error("Error linking guest orders:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                    <div className="bg-white p-10 text-center border-b border-gray-100">
                        <UserPlus className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                        <h2 className="text-3xl font-black text-black uppercase tracking-wider mb-2">{t('auth.joinUs')}</h2>
                        <p className="text-gray-600">{t('auth.createAccountDesc')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-10 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-shake">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">{t('auth.fullName')}</label>
                            <div className="relative">
                                <User className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                    placeholder="Ahmed Ali"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">{t('auth.email')}</label>
                            <div className="relative">
                                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                    placeholder="ahmed@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <PhoneInputGroup
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            name="phoneNumber"
                            required
                            placeholder="010XXXXXXXX"
                        />

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">{t('auth.password')}</label>
                            <div className="relative">
                                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">{t('auth.confirmPassword')}</label>
                            <div className="relative">
                                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder-[#666666]"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl hover:bg-orange-700 transition-all shadow-xl hover:shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                        >
                            {loading ? t('auth.creatingAccount') : t('auth.submitSignup')}
                            {!loading && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
                        </button>

                        <p className="text-center text-sm text-gray-600 font-medium">
                            {t('auth.haveAccount')} <Link to="/login" className="text-orange-600 font-black hover:underline">{t('auth.loginToAccount')}</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Signup;
