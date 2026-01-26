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
            {[...Array(4)].map((_, i) => (
                <div key={i} className="basis-[48.5%] md:basis-[24.2%] lg:basis-[24.2%] bg-gray-100 rounded-premium h-[350px] flex-shrink-0"></div>
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
                </div>

                <div className="relative group/carousel">
                    {/* Side-Positioned Arrows */}
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/95 shadow-xl border border-gray-100 hover:bg-gray-50 transition-all active:scale-90 opacity-0 group-hover/carousel:opacity-100 hidden md:block"
                    >
                        <ChevronLeft className="h-6 w-6 text-gray-900" />
                    </button>

                    <button
                        onClick={() => scroll('right')}
                        className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/95 shadow-xl border border-gray-100 hover:bg-gray-50 transition-all active:scale-90 opacity-0 group-hover/carousel:opacity-100 hidden md:block"
                    >
                        <ChevronRight className="h-6 w-6 text-gray-900" />
                    </button>

                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                    >
                        {relatedProducts.map(product => (
                            <div key={product.id} className="basis-[48.5%] md:basis-[31%] lg:basis-[24.2%] snap-start flex-shrink-0">
                                <ProductCard product={product} isCompact={true} />
                            </div>
                        ))}
                    </div>
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
