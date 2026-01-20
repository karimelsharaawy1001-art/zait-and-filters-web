import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import BrandMarquee from '../components/BrandMarquee';
import CategoryThumbnails from '../components/CategoryThumbnails';
import ProductCard from '../components/ProductCard';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Sparkles, Flame, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    const { t } = useTranslation();
    const [bestSellers, setBestSellers] = useState([]);
    const [hotOffers, setHotOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            setLoading(true);
            try {
                // Fetch All Active Products once to avoid multiple narrow queries
                const q = query(
                    collection(db, 'products'),
                    where('isActive', '==', true)
                );
                const querySnapshot = await getDocs(q);
                const allActive = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // 1. Best Sellers: Sort by soldCount and take top 8
                const sortedBest = [...allActive]
                    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
                    .slice(0, 8);
                setBestSellers(sortedBest);

                // 2. Hot Offers: Filter for salePrice > 0 and take top 8
                const offers = allActive
                    .filter(p => p.salePrice && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price))
                    .slice(0, 8);
                setHotOffers(offers);

            } catch (error) {
                console.error("Error fetching home data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    const ProductSection = ({ title, icon: Icon, products, subtitle, color = "orange" }) => (
        <section className="py-8 sm:py-12 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 sm:mb-8 gap-4 border-b border-gray-100 pb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                                {title}
                            </h2>
                        </div>
                        {subtitle && <p className="text-gray-500 text-sm sm:text-base font-medium max-w-2xl">{subtitle}</p>}
                    </div>
                    <Link to="/shop" className="text-orange-600 hover:text-orange-700 font-black flex items-center gap-1.5 group bg-orange-50 px-4 py-2 rounded-full transition-all hover:bg-orange-100">
                        <span className="text-xs sm:text-sm uppercase tracking-widest">{t('viewAll', 'عرض الكل')}</span>
                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">{t('noProductsFound', 'قريباً...')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-8">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );

    return (
        <div className="flex-1 bg-white">
            <Hero />

            <div className="pt-56 md:pt-12 pb-4 sm:pb-6">
                <BrandMarquee />
            </div>

            {/* Exclusive Offers Section */}
            <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100/50">
                <ProductSection
                    title={t('hotOffers', 'عروض حصرية')}
                    subtitle={t('hotOffersSub', 'وفّر أكثر مع عروضنا الحصرية وخصوماتنا لفترة محدودة')}
                    icon={Flame}
                    products={hotOffers}
                    color="red"
                />
            </div>

            {/* Best Sellers Section */}
            <div className="bg-white">
                <ProductSection
                    title={t('bestSellers', 'الأكثر مبيعاً')}
                    subtitle={t('bestSellersSub', 'المنتجات الأعلى طلباً والمفضلة لدى عملائنا')}
                    icon={Sparkles}
                    products={bestSellers}
                    color="orange"
                />
            </div>

            <CategoryThumbnails />
        </div>
    );
};

export default Home;
