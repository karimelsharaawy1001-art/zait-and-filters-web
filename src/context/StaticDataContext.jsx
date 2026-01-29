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
    const [staticData, setStaticData] = useState({
        products: [],
        categories: [],
        cars: [],
        brands: [],
        isLoaded: false
    });
    const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

    useEffect(() => {
        const loadAllStaticData = async () => {
            try {
                const load = async (file) => {
                    const r = await fetch(`/data/${file}`);
                    return r.ok ? await r.json() : [];
                };

                const [products, categories, cars, brands] = await Promise.all([
                    load('products-db.json'),
                    load('categories-db.json'),
                    load('cars-db.json'),
                    load('brands-db.json')
                ]);

                setStaticData({
                    products,
                    categories,
                    cars,
                    brands,
                    isLoaded: true
                });
                console.log(`🧊 Multi-Source Static DB Loaded (${products.length} Products, ${cars.length} Cars)`);
            } catch (error) {
                console.warn('⚠️ Static architecture degraded:', error);
            }
        };

        loadAllStaticData();
    }, []);

    /**
     * Quota Shield: Global handler to silently divert traffic to static data on Firebase 429s.
     */
    const withFallback = async (firestoreFn, collectionName = 'products') => {
        // If already in quota-exceeded mode, don't even try Firebase
        if (isQuotaExceeded) return staticData[collectionName] || [];

        try {
            return await firestoreFn();
        } catch (error) {
            const isQuotaError = error.code === 'resource-exhausted' || error.message?.includes('429');
            if (isQuotaError) {
                setIsQuotaExceeded(true);
                // Silent Failover: Site remains functional without error popups
                // but we clear any stuck loading states in the consumer if needed.
                return staticData[collectionName] || [];
            }
            throw error; // Let other errors bubble up
        }
    };

    const value = {
        ...staticData,
        staticProducts: staticData.products, // Legacy aliasing
        isStaticLoaded: staticData.isLoaded,
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
