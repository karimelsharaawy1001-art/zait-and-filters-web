import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'admin' or 'user'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Fetch User Role from Firestore
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userDocRef);

                    if (userSnap.exists()) {
                        setRole(userSnap.data().role || 'user');
                    } else {
                        // Create basic user profile if missing
                        await setDoc(userDocRef, {
                            email: currentUser.email,
                            role: 'user',
                            createdAt: new Date().toISOString()
                        });
                        setRole('user');
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole('user');
                }
            } else {
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email, password, name) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email,
            name,
            role: 'user',
            createdAt: new Date().toISOString()
        });
        return userCredential;
    };

    const logout = () => {
        return signOut(auth);
    };

    const refreshProfile = async (uid) => {
        const targetUid = uid || user?.uid;
        if (!targetUid) return;

        setLoading(true);
        try {
            const userDocRef = doc(db, 'users', targetUid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                setRole(userSnap.data().role || 'user');
                // Also update user state if we were called with a uid but user was null (race condition fix)
                if (!user && uid) {
                    // actually onAuthStateChanged handles setUser, so we just care about role here.
                }
            }
        } catch (error) {
            console.error("Error keeping profile in sync:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, login, signup, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
