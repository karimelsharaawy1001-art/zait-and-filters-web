import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, role } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const normalizedEmail = email.trim().toLowerCase();

        // HARDCODED FALLBACK (For initial setup/testing)
        if (normalizedEmail === 'admin@zait.com' && password === 'admin123') {
            toast.success('Login Successful (Fallback Mode)');
            const mockToken = 'hardcoded_session_' + Date.now();
            localStorage.setItem('admin_token', mockToken);
            setTimeout(() => navigate('/admin/dashboard'), 500);
            setLoading(false);
            return;
        }

        try {
            // 1. Authenticate with Appwrite
            const sessionData = await login(normalizedEmail, password);
            console.log("LOGIN SUCCESS, Session Data:", sessionData);

            // 2. AuthContext handles role fetching. We just check it here.
            // Using the RETURNED role because state update 'role' might be async/stale
            const currentRole = sessionData.role;

            if (currentRole === 'admin' || currentRole === 'super_admin') {
                toast.success('Welcome to the Admin Portal');
                navigate('/admin/dashboard');
            } else {
                console.error("LOGIN FAILED: Role mismatch. Expected admin, got:", currentRole);
                setError('Unauthorized: You do not have permission to access the admin portal.');
                toast.error('Unauthorized Access: Role is ' + (currentRole || 'User'));
            }
        } catch (err) {
            console.error("Login error:", err);
            let message = 'Failed to login. Please check your credentials.';

            if (err.type === 'user_invalid_credentials') message = 'Invalid email or password.';
            if (err.type === 'user_not_found') message = 'No account found with this email.';

            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 font-Cairo">
            <style>{`
                .force-black-text {
                    color: #000000 !important;
                    -webkit-text-fill-color: #000000 !important;
                }
            `}</style>
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-black uppercase tracking-tight">Admin Portal</h2>
                    <div className="w-16 h-1 bg-[#FF0000] mx-auto mt-2 rounded-full" />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-bold animate-shake" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-black text-xs font-black uppercase tracking-widest mb-2" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:border-[#FF0000] focus:ring-0 transition-all font-bold force-black-text placeholder-gray-400"
                            placeholder="admin@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-black text-xs font-black uppercase tracking-widest mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:border-[#FF0000] focus:ring-0 transition-all font-bold force-black-text placeholder-gray-400"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF0000] hover:bg-red-700 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-red-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                        {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
