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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
            setLoading(false);
        });

        return () => unsubscribe();
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
        return <Navigate to="/affiliate-register" replace />;
    }

    return children;
};

export default AffiliateProtectedRoute;
