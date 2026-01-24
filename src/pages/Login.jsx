import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, LogIn, ArrowRight, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, formData.email, formData.password);
            navigate('/');
        } catch (err) {
            console.error("Login Error:", err);
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                    <div className="bg-white p-10 text-center border-b border-gray-100">
                        <LogIn className="h-12 w-12 text-orange-600 mx-auto mb-4 rtl:-scale-x-100" />
                        <h2 className="text-3xl font-black text-black uppercase tracking-wider mb-2">{t('auth.welcomeBack')}</h2>
                        <p className="text-gray-600">{t('auth.signInDesc')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-10 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-shake">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">{t('auth.email')}</label>
                            <div className="relative">
                                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#28B463] focus:outline-none transition-all font-bold text-black placeholder-gray-500"
                                    placeholder="ahmed@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">{t('auth.password')}</label>
                            <div className="relative">
                                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full ps-12 pe-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#28B463] focus:outline-none transition-all font-bold text-black placeholder-gray-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-gray-900 transition-all shadow-xl hover:shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                        >
                            {loading ? t('auth.loggingIn') : t('auth.submitLogin')}
                            {!loading && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
                        </button>

                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-600 font-medium">
                                {t('auth.noAccount')} <Link to="/signup" className="text-orange-600 font-black hover:underline">{t('auth.signup')}</Link>
                            </p>
                            <div className="pt-4 border-t border-gray-100">
                                <Link to="/affiliate-register" className="text-xs font-bold text-gray-500 hover:text-orange-600 uppercase tracking-widest">
                                    {t('auth.becomePartner')}
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
