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
    const { login, role, refreshProfile } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const normalizedEmail = email.trim().toLowerCase();

        // HARDCODED FALLBACK (For initial setup/testing in case DB is unreachable)
        if (normalizedEmail === 'admin@zait.com' && password === 'admin123') {
            toast.success('Login Successful (Fallback Mode)');
            const mockToken = 'hardcoded_session_' + Date.now();
            localStorage.setItem('admin_token', mockToken);
            setTimeout(() => navigate('/admin/dashboard'), 500);
            setLoading(false);
            return;
        }

        try {
            // 1. Authenticate with Firebase
            const userCredential = await login(normalizedEmail, password);
            const user = userCredential.user;

            // 2. Fetch User Role directly from Firestore (don't rely on AuthContext sync)
            const { doc, getDoc, setDoc } = await import('firebase/firestore');
            const { db } = await import('../firebase');

            const userDocRef = doc(db, 'users', user.uid);
            let userSnap = await getDoc(userDocRef);

            let currentRole = 'user';

            if (userSnap.exists()) {
                currentRole = userSnap.data().role;
            } else {
                // If doc doesn't exist, Create it
                currentRole = 'user';
                await setDoc(userDocRef, {
                    email: user.email,
                    role: 'user',
                    createdAt: new Date().toISOString()
                });
            }

            // 3. SPECIAL RECOVERY: Enforce Admin Role for specific email
            if (normalizedEmail === 'admin@zait.com' && currentRole !== 'admin') {
                console.log("Boosting 'admin@zait.com' to admin role...");
                await setDoc(userDocRef, { role: 'admin' }, { merge: true });
                currentRole = 'admin';
            }

            // 4. Force Update AuthContext
            try {
                await refreshProfile(user.uid);
            } catch (syncErr) {
                console.warn("Context sync warning:", syncErr);
            }

            if (currentRole === 'admin' || currentRole === 'super_admin') {
                toast.success('Welcome to the Admin Portal');
                navigate('/admin/dashboard');
            } else {
                console.error("LOGIN FAILED: Role mismatch. Expected admin, got:", currentRole);
                setError('Unauthorized: You do not have permission to access the admin portal.');
                toast.error('Unauthorized Access: Role is ' + (currentRole || 'User'));
                // Optional: Logout if they aren't admin to prevent sticking in a "logged in but unauthorized" state
                // logout(); 
            }
        } catch (err) {
            console.error("Login error:", err);
            let message = 'Failed to login. Please check your credentials.';

            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                message = 'Invalid email or password.';
            } else if (err.code === 'auth/too-many-requests') {
                message = 'Too many failed attempts. Please try again later.';
            }

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
