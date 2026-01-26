import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import ProductCard from './ProductCard';
import { useTranslation } from 'react-i18next';

const RelatedProducts = ({ currentProduct }) => {
    const { t, i18n } = useTranslation();
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const SkeletonLoader = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-premium h-[400px] w-full"></div>
            ))}
        </div>
    );

    useEffect(() => {
        const fetchRelatedProducts = async () => {
            if (!currentProduct) return;
            setLoading(true);

            try {
                // Build query parameters
                const params = new URLSearchParams({
                    productId: currentProduct.id,
                    make: currentProduct.make || '',
                    model: currentProduct.model || '',
                    year: currentProduct.yearStart || '',
                    category: currentProduct.category || '',
                    brand: currentProduct.brand || ''
                });

                const response = await fetch(`/api/products?action=getRelated&${params.toString()}`);
                if (!response.ok) throw new Error('Failed to fetch related products');

                const products = await response.json();
                console.log(`[RelatedProducts] Fetched ${products.length} items`);
                setRelatedProducts(Array.isArray(products) ? products : []);
            } catch (error) {
                console.error("Error fetching related products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRelatedProducts();
    }, [currentProduct]);

    if (loading) {
        return (
            <section className="py-12 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-8 w-48 bg-gray-100 rounded mb-8 animate-pulse"></div>
                    <SkeletonLoader />
                </div>
            </section>
        );
    }

    if (relatedProducts.length === 0) return null;

    return (
        <section className="py-12 border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className={`text-2xl font-black text-gray-900 mb-8 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {t('relatedProducts')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {relatedProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RelatedProducts;
