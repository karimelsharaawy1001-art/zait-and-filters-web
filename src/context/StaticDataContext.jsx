import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';

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
        rawStaticProducts: [],
        categories: [],
        cars: [],
        brands: [],
        shipping_rates: [],
        isLoaded: false
    });

    useEffect(() => {
        const loadAllStaticData = async () => {
            try {
                // 1. Load Static JSON Baselines (Fast Initial Render)
                const load = async (file) => {
                    const version = new Date().getTime();
                    const r = await fetch(`/data/${file}?v=${version}`);
                    return r.ok ? await r.json() : [];
                };

                const [staticProd, categories, cars, brands, shipping_rates] = await Promise.all([
                    load('products-db.json'),
                    load('categories-db.json'),
                    load('cars-db.json'),
                    load('brands-db.json'),
                    load('shipping-rates-db.json')
                ]);

                setStaticData({
                    products: staticProd,
                    rawStaticProducts: staticProd,
                    categories,
                    cars,
                    brands,
                    shipping_rates,
                    isLoaded: true
                });

                // 2. BACKGROUND SYNC: Firestore (Non-blocking)
                setTimeout(async () => {
                    try {
                        console.log("🔄 Firestore Sync: Initializing Full Catalog...");
                        const productsRef = collection(db, 'products');

                        // Simple full fetch for now - Firestore handles scaling better
                        const snapshot = await getDocs(productsRef);
                        const freshItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                        console.log(`📡 Firestore Sync: ${freshItems.length} items loaded.`);

                        if (freshItems.length > 0) {
                            // Merge with static data
                            const productMap = new Map();
                            staticProd.forEach(p => productMap.set(String(p.id), p));
                            freshItems.forEach(p => productMap.set(String(p.id), p));
                            const merged = Array.from(productMap.values());

                            setStaticData(prev => ({
                                ...prev,
                                products: merged,
                                isLoaded: true
                            }));
                        }

                        window.__CATALOG_DEBUG__ = { total: freshItems.length, source: 'firestore' };
                    } catch (err) {
                        console.warn("⚠️ Firestore sync failed:", err);
                    }
                }, 100);

            } catch (error) {
                console.warn('⚠️ Static architecture degraded:', error);
            }
        };

        loadAllStaticData();
    }, []);

    const value = {
        ...staticData,
        staticProducts: staticData.products,
        rawStaticProducts: staticData.rawStaticProducts,
        isStaticLoaded: staticData.isLoaded
    };

    return (
        <StaticDataContext.Provider value={value}>
            {children}
        </StaticDataContext.Provider>
    );
};
