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

                // SYNC: Fetch "Fresh" data from Appwrite to overlay on static
                let mergedProducts = [...staticProd];
                if (DATABASE_ID && PRODUCTS_COLLECTION) {
                    try {
                        const response = await databases.listDocuments(
                            DATABASE_ID,
                            PRODUCTS_COLLECTION,
                            [
                                Query.orderDesc('$updatedAt'),
                                Query.limit(5000) // Increased for full catalog sync
                            ]
                        );

                        const freshItems = response.documents.map(d => ({
                            id: d.$id,
                            ...d
                        }));

                        const productMap = new Map();
                        staticProd.forEach(p => productMap.set(p.id, p));
                        freshItems.forEach(p => productMap.set(p.id, p));

                        mergedProducts = Array.from(productMap.values());
                        console.log(`🔄 Appwrite Sync: ${staticProd.length} Static + ${freshItems.length} Fresh = ${mergedProducts.length} Total`);
                    } catch (err) {
                        console.warn("⚠️ Appwrite sync failed:", err);
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
