import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, getDoc, doc, where } from 'firebase/firestore';

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
                // 1. Fetch Dynamic Registry URL from Firestore (1 Read)
                let dynamicRegistryUrl = null;
                try {
                    const catalogRef = doc(db, 'settings', 'catalog');
                    const catalogSnap = await getDoc(catalogRef);
                    if (catalogSnap.exists()) {
                        dynamicRegistryUrl = catalogSnap.data().registryUrl;
                        console.log("📂 Dynamic Registry Found:", dynamicRegistryUrl);
                    }
                } catch (e) {
                    console.warn("⚠️ Could not fetch dynamic registry URL:", e);
                }

                // 2. Load Static JSON Baselines (Fast Initial Render)
                const load = async (file, externalUrl = null) => {
                    const version = new Date().getTime();
                    const url = externalUrl || `/data/${file}?v=${version}`;
                    const r = await fetch(url);
                    return r.ok ? await r.json() : [];
                };

                const [staticProd, categories, cars, brands, shipping_rates] = await Promise.all([
                    load('products-db.json', dynamicRegistryUrl),
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

                // 2. BACKGROUND SYNC: Firestore Delta Fetch (Quota Friendly)
                setTimeout(async () => {
                    try {
                        // Find latest timestamp in static data to use as baseline
                        let baselineDate = new Date(0);
                        staticProd.forEach(p => {
                            if (p.updatedAt) {
                                const d = new Date(p.updatedAt);
                                if (d > baselineDate) baselineDate = d;
                            }
                        });

                        console.log(`🔄 Firestore Sync: Fetching updates after ${baselineDate.toISOString()}...`);

                        const productsRef = collection(db, 'products');
                        // Use query to only get items updated since our static baseline
                        const q = query(
                            productsRef,
                            where('updatedAt', '>', baselineDate)
                        );

                        const snapshot = await getDocs(q);
                        const freshItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                        console.log(`📡 Firestore Sync: ${freshItems.length} new/updated items loaded.`);

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
