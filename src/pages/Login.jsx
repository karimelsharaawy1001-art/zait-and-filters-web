import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, LogIn, ArrowRight, AlertCircle } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
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
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-10 text-center">
                        <LogIn className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Welcome Back</h2>
                        <p className="text-gray-400">Sign in to your customer account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-10 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-shake">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold placeholder-gray-300"
                                    placeholder="ahmed@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold placeholder-gray-300"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl hover:shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                            {!loading && <ArrowRight className="h-5 w-5" />}
                        </button>

                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-500 font-medium">
                                Don't have an account? <Link to="/signup" className="text-orange-600 font-black hover:underline">Sign Up</Link>
                            </p>
                            <div className="pt-4 border-t border-gray-100">
                                <Link to="/affiliate-register" className="text-xs font-bold text-gray-400 hover:text-orange-600 uppercase tracking-widest">
                                    Become a Partner? Join here
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
