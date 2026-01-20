import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        siteName: 'ZAIT & FILTERS',
        siteLogo: '',
        footerDescription: 'The trusted source for high-performance oils, filters, and maintenance essentials.',
        contactPhone: '',
        contactEmail: '',
        contactAddress: '',
        facebookUrl: '',
        instagramUrl: '',
        whatsappNumber: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
            if (doc.exists()) {
                setSettings(doc.data());
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
