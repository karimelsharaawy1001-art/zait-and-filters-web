import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { safeLocalStorage } from '../utils/safeStorage';

const ProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasToken, setHasToken] = useState(!!safeLocalStorage.getItem('admin_token'));

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userRole = userDoc.data().role;
                        setRole(userRole);

                        // If Firebase says they are admin, ensure token is set for persistence persistence
                        if (userRole === 'admin' || userRole === 'super_admin') {
                            safeLocalStorage.setItem('admin_token', 'firebase_' + currentUser.uid);
                            setHasToken(true);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
                setUser(currentUser);
            } else {
                setUser(null);
                setRole(null);
                // If no Firebase user, check if we still have a valid session token
                setHasToken(!!safeLocalStorage.getItem('admin_token'));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 font-Cairo">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF0000]"></div>
                    <p className="text-gray-500 font-bold animate-pulse text-sm">Securing Session...</p>
                </div>
            </div>
        );
    }

    // Strict check: Must have token OR be an active Firebase Admin
    const isAuthenticated = hasToken || (user && (role === 'admin' || role === 'super_admin'));

    if (!isAuthenticated) {
        console.warn("Unauthorized access attempt to ProtectedRoute. Redirecting to login.");
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
