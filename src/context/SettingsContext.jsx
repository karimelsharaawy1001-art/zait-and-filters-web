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
        // QUOTA SHIELD: Replaced onSnapshot with one-time fetch
        const fetchSettings = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'settings', 'general'));
                if (docSnap.exists()) {
                    setSettings(docSnap.data());
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
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
