import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import BrandMarquee from '../components/BrandMarquee';
import CategoryThumbnails from '../components/CategoryThumbnails';
import ValuePropositionBanner from '../components/ValuePropositionBanner';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
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

    const ProductSection = ({ title, icon: Icon, products, subtitle, color = "red" }) => (
        <section className="py-6 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 border-b border-gray-100 pb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-3xl sm:text-4xl font-black text-[#000000] tracking-tighter leading-none uppercase italic font-Cairo">
                                {title}
                            </h2>
                        </div>
                        {subtitle && <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1 font-Cairo">{subtitle}</p>}
                    </div>
                    <Link to="/shop" className="text-[#000000] border border-[#000000] hover:text-[#e31e24] hover:border-[#e31e24] font-black flex items-center gap-1.5 group bg-white px-4 py-2 rounded shadow-sm transition-all hover:bg-gray-50 italic">
                        <span className="text-[10px] uppercase tracking-widest font-Cairo">{t('viewAll')}</span>
                        <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform not-italic" />
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] font-Cairo">{t('noProductsFound')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );

    return (
        <div className="home-page flex-1 bg-white">
            <SEO
                title="Zait & Filters | HIGHREV - قطع الغيار بضغطة زرار"
                description="HIGHREV: اشتري قطع غيار عربيتك الأصلية بالضمان من زيت اند فلترز. بنوصل لكل محافظات مصر وعندنا كل طرق التقسيط."
                keywords="قطع غيار سيارات أصلية بمصر, زيوت وفلاتر بالضمان, تقسيط قطع غيار سيارات"
                url={window.location.origin + window.location.pathname}
            />
            <Hero />

            {/* Brands Section */}
            <div className="py-6 bg-white border-b border-gray-50">
                <BrandMarquee />
            </div>

            {/* Exclusive Offers Section */}
            <div className="bg-white py-4">
                <ProductSection
                    title={t('hotOffers')}
                    subtitle={t('hotOffersSub')}
                    icon={Flame}
                    products={hotOffers}
                    color="red"
                />
            </div>

            <hr className="border-gray-50 max-w-7xl mx-auto opacity-50" />

            {/* Best Sellers Section */}
            <div className="bg-white py-4">
                <ProductSection
                    title={t('bestSellers')}
                    subtitle={t('bestSellersSub')}
                    icon={Sparkles}
                    products={bestSellers}
                    color="red"
                />
            </div>

            <div className="mt-8 pt-4 border-t border-gray-50">
                <ValuePropositionBanner />
            </div>

            <div className="py-12 bg-gray-50/30">
                <CategoryThumbnails />
            </div>

        </div>
    );
};

export default Home;
