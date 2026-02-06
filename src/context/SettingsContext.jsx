import React, { createContext, useContext, useState, useEffect } from 'react';
import { databases } from '../appwrite';

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

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const SETTINGS_COLLECTION = import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID;

    useEffect(() => {
        const fetchSettings = async () => {
            if (!DATABASE_ID || !SETTINGS_COLLECTION) {
                console.warn("Appwrite Settings: Database or Collection ID missing in ENV");
                setLoading(false);
                return;
            }

            try {
                const doc = await databases.getDocument(
                    DATABASE_ID,
                    SETTINGS_COLLECTION,
                    'general' // Document ID 'general'
                );
                setSettings(doc);
            } catch (error) {
                console.error('Error fetching settings from Appwrite:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [DATABASE_ID, SETTINGS_COLLECTION]);


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
