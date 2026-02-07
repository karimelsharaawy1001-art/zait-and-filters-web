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

                setStaticData({
                    products: staticProd, // Use static baseline as initial state
                    rawStaticProducts: staticProd,
                    categories,
                    cars,
                    brands,
                    shipping_rates,
                    isLoaded: true
                });

                // 2. BACKGROUND SYNC: Deep Fresh data from Appwrite (Non-blocking)
                if (DATABASE_ID && PRODUCTS_COLLECTION) {
                    setTimeout(async () => {
                        try {
                            console.log("🔄 Background Sync: Initializing Full Catalog Recovery...");
                            let freshItems = [];
                            let lastId = null;
                            let hasMore = true;

                            while (hasMore) {
                                const queries = [Query.limit(100)];
                                if (lastId) queries.push(Query.after(lastId));

                                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                                freshItems = [...freshItems, ...response.documents.map(d => ({ id: d.$id, ...d }))];

                                if (response.documents.length < 100 || freshItems.length >= 20000) {
                                    hasMore = false;
                                } else {
                                    lastId = response.documents[response.documents.length - 1].$id;
                                    if (freshItems.length % 500 === 0) console.log(`📡 Sync: ${freshItems.length} items...`);
                                }
                            }

                            const productMap = new Map();
                            staticProd.forEach(p => productMap.set(p.id, p));
                            freshItems.forEach(p => productMap.set(p.id, p));

                            const finalProducts = Array.from(productMap.values());

                            setStaticData(prev => ({
                                ...prev,
                                products: finalProducts,
                                isLoaded: true
                            }));

                            console.log(`✅ Background Sync Complete: ${finalProducts.length} items ready.`);
                            window.__CATALOG_DEBUG__ = { total: finalProducts.length, date: new Date().toISOString() };
                        } catch (err) {
                            console.warn("⚠️ Background sync failed:", err);
                        }
                    }, 100);
                }
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
