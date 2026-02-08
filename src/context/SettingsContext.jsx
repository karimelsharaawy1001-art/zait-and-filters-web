import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        siteName: 'ZAIT & FILTERS',
        siteLogo: '',
        footerDescription: 'Original automotive spare parts and oils with warranty. We deliver to all Egyptian governorates with various installment options.',
        contactPhone: '',
        contactEmail: '',
        contactAddress: '',
        facebookUrl: '',
        instagramUrl: '',
        whatsappNumber: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'general');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSettings(prev => ({ ...prev, ...docSnap.data() }));
                } else {
                    console.warn("Settings document not found, using defaults");
                }
            } catch (error) {
                console.error('Error fetching settings from Firestore:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
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
