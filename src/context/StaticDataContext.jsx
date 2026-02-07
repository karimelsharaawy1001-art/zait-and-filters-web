import React, { createContext, useContext, useState, useEffect } from 'react';
import { databases } from '../appwrite';
import { Query } from 'appwrite';

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
        rawStaticProducts: [], // Added for repair reference
        categories: [],
        cars: [],
        brands: [],
        shipping_rates: [],
        isLoaded: false
    });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID;

    useEffect(() => {
        const loadAllStaticData = async () => {
            try {
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

                // SYNC: Fetch "Deep Fresh" data from Appwrite to overlay on static (Handles 20,000+ items)
                let mergedProducts = [...staticProd];
                if (DATABASE_ID && PRODUCTS_COLLECTION) {
                    try {
                        let freshItems = [];
                        let lastId = null;
                        let hasMore = true;
                        let pageCount = 0;

                        while (hasMore) {
                            pageCount++;
                            const queries = [Query.limit(100)];
                            if (lastId) queries.push(Query.after(lastId));

                            const response = await databases.listDocuments(
                                DATABASE_ID,
                                PRODUCTS_COLLECTION,
                                queries
                            );

                            const batch = response.documents.map(d => ({
                                id: d.$id,
                                ...d
                            }));
                            freshItems = [...freshItems, ...batch];

                            if (response.documents.length < 100 || freshItems.length >= 20000) {
                                hasMore = false;
                            } else {
                                lastId = response.documents[response.documents.length - 1].$id;
                            }

                            // Log progress every 500 items to avoid console spam
                            if (freshItems.length % 500 === 0) {
                                console.log(`📡 Fetching Catalog: ${freshItems.length} items synced...`);
                            }
                        }

                        const productMap = new Map();
                        // 1. Load static baseline
                        staticProd.forEach(p => productMap.set(p.id, p));
                        // 2. Overlay deep fresh data (overwrites static matches, adds new ones)
                        freshItems.forEach(p => productMap.set(p.id, p));

                        mergedProducts = Array.from(productMap.values());
                        console.log(`✅ Deep Sync Complete: ${staticProd.length} Static + ${freshItems.length} Appwrite = ${mergedProducts.length} Total`);

                        // Global Debug Hook
                        window.__CATALOG_DEBUG__ = {
                            staticCount: staticProd.length,
                            appwriteCount: freshItems.length,
                            totalMerged: mergedProducts.length,
                            firstItem: mergedProducts[0],
                            lastSync: new Date().toISOString()
                        };
                    } catch (err) {
                        console.warn("⚠️ Appwrite deep sync failed:", err);
                    }
                }

                setStaticData({
                    products: mergedProducts,
                    rawStaticProducts: staticProd,
                    categories,
                    cars,
                    brands,
                    shipping_rates,
                    isLoaded: true
                });
            } catch (error) {
                console.warn('⚠️ Static architecture degraded:', error);
            }
        };

        loadAllStaticData();
    }, [DATABASE_ID, PRODUCTS_COLLECTION]);

    const value = {
        ...staticData,
        staticProducts: staticData.products,
        rawStaticProducts: staticData.rawStaticProducts, // Expose raw for repair
        isStaticLoaded: staticData.isLoaded,
        // Fallback placeholder for compatibility
        withFallback: (fn, coll) => fn ? fn() : (staticData[coll] || [])
    };

    return (
        <StaticDataContext.Provider value={value}>
            {children}
        </StaticDataContext.Provider>
    );
};
