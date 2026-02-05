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
                    const version = new Date().getTime(); // Simple cache busting
                    const r = await fetch(`/data/${file}?v=${version}`);
                    return r.ok ? await r.json() : [];
                };

                const [staticProd, categories, cars, brands] = await Promise.all([
                    load('products-db.json'),
                    load('categories-db.json'),
                    load('cars-db.json'),
                    load('brands-db.json')
                ]);

                // HYBRID SYNC: Fetch "Fresh" data from Firestore to overlay on static
                // This grabs the 300 most recently created/updated items to catch new imports immediately.
                let mergedProducts = [...staticProd];
                try {
                    const { collection, getDocs, query, orderBy, limit, where } = await import('firebase/firestore');
                    const { db } = await import('../firebase');

                    // 1. Get Newest Imports
                    // We check both createdAt (for new) and updatedAt (for edits)
                    // But for simplicity/quota, let's just grab the last 300 items by creation/update.
                    const q = query(
                        collection(db, 'products'),
                        orderBy('updatedAt', 'desc'),
                        limit(300)
                    );

                    const snapshot = await getDocs(q);
                    const freshItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Merge: Create a Map for O(1) lookup
                    // Priority: Fresh Firestore > Static JSON
                    const productMap = new Map();
                    staticProd.forEach(p => productMap.set(p.id, p));
                    freshItems.forEach(p => productMap.set(p.id, p)); // Overwrite with fresh

                    mergedProducts = Array.from(productMap.values());
                    console.log(`🔄 Hybrid Merge: ${staticProd.length} Static + ${freshItems.length} Fresh = ${mergedProducts.length} Total`);
                } catch (err) {
                    console.warn("⚠️ Hybrid sync skipped (Quota/Network):", err);
                }

                setStaticData({
                    products: mergedProducts,
                    categories,
                    cars,
                    brands,
                    isLoaded: true
                });
                console.log(`🧊 Multi-Source Static DB Loaded (${mergedProducts.length} Products, ${cars.length} Cars)`);
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
