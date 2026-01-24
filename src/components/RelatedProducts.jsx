import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import ProductCard from './ProductCard';
import { useTranslation } from 'react-i18next';

const RelatedProducts = ({ currentProduct }) => {
    const { t } = useTranslation();
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

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
                setRelatedProducts(products);
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
            <div className="py-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (relatedProducts.length === 0) return null;

    return (
        <section className="py-12 border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">
                    {t('relatedProducts', 'You Might Also Like')}
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
