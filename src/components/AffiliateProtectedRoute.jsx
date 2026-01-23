import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AffiliateProtectedRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isAffiliate, setIsAffiliate] = useState(false);

    useEffect(() => {
        let timeoutId;

        // Safety timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
            if (loading) {
                console.warn("Auth check timed out, forcing render.");
                setLoading(false);
            }
        }, 10000); // 10 seconds

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                if (currentUser) {
                    setUser(currentUser);
                    // Check Firestore for isAffiliate flag
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists() && userDoc.data().isAffiliate === true) {
                        setIsAffiliate(true);
                    } else {
                        setIsAffiliate(false);
                    }
                } else {
                    setUser(null);
                    setIsAffiliate(false);
                }
            } catch (error) {
                console.error("Affiliate Route Error:", error);
                setIsAffiliate(false);
            } finally {
                setLoading(false);
                clearTimeout(timeoutId);
            }
        });

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAffiliate) {
        return <Navigate to="/marketers" replace />;
    }

    return children;
};

export default AffiliateProtectedRoute;
