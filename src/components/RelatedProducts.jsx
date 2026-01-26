import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ProductCard from './ProductCard';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

const RelatedProducts = ({ currentProduct }) => {
    const { t, i18n } = useTranslation();
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef(null);

    const SkeletonLoader = () => (
        <div className="flex gap-4 overflow-hidden pb-4">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="min-w-[46%] md:min-w-[30%] lg:min-w-[15.5%] bg-gray-100 rounded-premium h-[350px]"></div>
            ))}
        </div>
    );

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const fetchRelatedViaFirestore = async () => {
            if (!currentProduct) return;
            setLoading(true);
            console.log(`[RelatedProducts] Starting direct Firestore fetch for product: ${currentProduct.id}`);

            try {
                // Fetch All Active Products for in-memory multi-tier filtering
                // This is the most reliable way to handle fallbacks 
                const q = query(
                    collection(db, 'products'),
                    where('isActive', '==', true)
                );
                const querySnapshot = await getDocs(q);
                const allActive = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const seenIds = new Set([currentProduct.id]);
                let results = [];

                // Helper to add unique products
                const addItems = (items, isSmart = false) => {
                    items.forEach(item => {
                        if (!seenIds.has(item.id) && results.length < 8) {
                            results.push(isSmart ? { ...item, isSmartMatch: true } : item);
                            seenIds.add(item.id);
                        }
                    });
                };

                // Tier 1: Exact Car Match (Make & Model)
                const tier1 = allActive.filter(p =>
                    (p.make === currentProduct.make && p.model === currentProduct.model) ||
                    (p.car_make === currentProduct.make && p.car_model === currentProduct.model)
                );
                addItems(tier1, true);

                // Tier 2: Specific Car Search (if product attributes match)
                if (results.length < 8 && (currentProduct.car_make || currentProduct.car_model)) {
                    const tier2 = allActive.filter(p =>
                        (p.make === currentProduct.car_make && p.model === currentProduct.car_model) ||
                        (p.car_make === currentProduct.car_make && p.car_model === currentProduct.car_model)
                    );
                    addItems(tier2, true);
                }

                // Tier 3: Same Category Match
                if (results.length < 8 && currentProduct.category) {
                    const tier3 = allActive.filter(p => p.category === currentProduct.category);
                    addItems(tier3);
                }

                // Tier 4: Global Best Sellers (Fallback)
                if (results.length < 8) {
                    const sortedBest = [...allActive]
                        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
                    addItems(sortedBest.slice(0, 10));
                }

                console.log(`[RelatedProducts] Successfully populated ${results.length} items`);
                setRelatedProducts(results);
            } catch (error) {
                console.error("[RelatedProducts] Error during Firestore fetch:", error);
                setRelatedProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRelatedViaFirestore();
    }, [currentProduct?.id]);

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
                <div className="flex items-center justify-between mb-8">
                    <h2 className={`text-2xl font-black text-gray-900 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                        {t('relatedProducts')}
                    </h2>

                    {/* Navigation Arrows - Desktop Only */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-2 rounded-full bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-900" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-full bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight className="h-5 w-5 text-gray-900" />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                >
                    {relatedProducts.map(product => (
                        <div key={product.id} className="min-w-[48.5%] md:min-w-[24%] lg:min-w-[15.8%] snap-start flex-shrink-0">
                            <ProductCard product={product} isCompact={true} />
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </section>
    );
};

export default RelatedProducts;
