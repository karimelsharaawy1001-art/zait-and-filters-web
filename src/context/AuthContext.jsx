import React, { createContext, useContext, useEffect, useState } from 'react';
import { account, databases } from '../appwrite';
import { ID, Query } from 'appwrite';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const USERS_COLLECTION = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID;
    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

    useEffect(() => {
        const checkSession = async () => {
            try {
                const sessionUser = await account.get();
                setUser(sessionUser);

                // Fetch extra user data/role from database
                if (DATABASE_ID && USERS_COLLECTION) {
                    try {
                        const userDoc = await databases.listDocuments(
                            DATABASE_ID,
                            USERS_COLLECTION,
                            [Query.equal('userId', sessionUser.$id)]
                        );
                        if (userDoc.total > 0) {
                            setRole(userDoc.documents[0].role);
                        }
                    } catch (dbErr) {
                        console.error("Error fetching user data from Appwrite DB:", dbErr);
                    }
                }
            } catch (error) {
                setUser(null);
                setRole(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, [DATABASE_ID, USERS_COLLECTION]);

    const login = async (email, password) => {
        await account.createEmailPasswordSession(email, password);
        const sessionUser = await account.get();
        setUser(sessionUser);

        // Fetch role after login
        if (DATABASE_ID && USERS_COLLECTION) {
            const userDoc = await databases.listDocuments(
                DATABASE_ID,
                USERS_COLLECTION,
                [Query.equal('userId', sessionUser.$id)]
            );
            if (userDoc.total > 0) {
                setRole(userDoc.documents[0].role);
            }
        }
        return sessionUser;
    };

    const signup = async (email, password, name) => {
        const newUser = await account.create(ID.unique(), email, password, name);
        await login(email, password); // Log in after signup
        return newUser;
    };

    const logout = async () => {
        await account.deleteSession('current');
        setUser(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, login, signup, logout }}>
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
