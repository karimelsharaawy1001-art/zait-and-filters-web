import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const StaticDataContext = createContext();

export const useStaticData = () => {
    const context = useContext(StaticDataContext);
    if (!context) {
        throw new Error('useStaticData must be used within a StaticDataProvider');
    }
    return context;
};

export const StaticDataProvider = ({ children }) => {
    const [staticProducts, setStaticProducts] = useState([]);
    const [isStaticLoaded, setIsStaticLoaded] = useState(false);
    const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

    useEffect(() => {
        const loadStaticData = async () => {
            try {
                const response = await fetch('/data/products-db.json');
                if (response.ok) {
                    const data = await response.json();
                    setStaticProducts(data);
                    setIsStaticLoaded(true);
                    console.log(`🧊 Static Database Loaded: ${data.length} products ready for zero-cost scaling.`);
                }
            } catch (error) {
                console.warn('⚠️ Static database fallback not available:', error);
            }
        };

        loadStaticData();
    }, []);

    /**
     * Helper to wrap Firestore calls and automatically trigger fallback
     * @param {Function} firestoreFn - The function to execute
     * @param {Array} staticFallbackData - Optional manual fallback data
     */
    const withFallback = async (firestoreFn, staticFallbackData = null) => {
        try {
            return await firestoreFn();
        } catch (error) {
            if (error.code === 'resource-exhausted') {
                setIsQuotaExceeded(true);
                toast.error('Site capacity reached. Switching to high-speed static fallback.', { icon: '🚀' });
                return staticFallbackData || staticProducts;
            }
            throw error;
        }
    };

    const value = {
        staticProducts,
        isStaticLoaded,
        isQuotaExceeded,
        withFallback,
        setIsQuotaExceeded
    };

    return (
        <StaticDataContext.Provider value={value}>
            {children}
        </StaticDataContext.Provider>
    );
};
