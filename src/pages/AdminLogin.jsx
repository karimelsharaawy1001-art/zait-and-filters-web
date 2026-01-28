import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Authenticate with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            // 2. Fetch User Role from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;

                if (role === 'admin' || role === 'super_admin') {
                    // Success!
                    toast.success(`Welcome back, ${userData.fullName || 'Admin'}`);
                    navigate('/admin/dashboard');
                } else {
                    // Logged in but not an admin
                    await signOut(auth);
                    setError('Unauthorized: You do not have permission to access the admin portal.');
                    toast.error('Unauthorized Access');
                }
            } else {
                // User document not found
                await signOut(auth);
                setError('User data not found. Please contact the super admin.');
                toast.error('Profile Not Found');
            }
        } catch (err) {
            console.error("Login error:", err);
            let message = 'Failed to login. Please check your credentials.';

            if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
            if (err.code === 'auth/user-not-found') message = 'No account found with this email.';
            if (err.code === 'auth/too-many-requests') message = 'Too many failed attempts. Try again later.';

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
