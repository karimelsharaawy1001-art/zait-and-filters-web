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
import { ArrowRight, Flame, Sparkles, ChevronLeft, ChevronRight, Car } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFilters } from '../context/FilterContext';
import { useRef } from 'react';
import inventoryData from '../data/inventory.json';

const RecommendationSkeleton = () => (
    <div className="flex gap-4 overflow-hidden pb-4 opacity-50">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="basis-[48.5%] md:basis-[24.2%] lg:basis-[24.2%] bg-gray-100 rounded-premium h-[350px] animate-pulse flex-shrink-0"></div>
        ))}
    </div>
);

const GarageModeBanner = ({ car }) => {
    const { t } = useTranslation();
    if (!car || !car.make) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
            <div className="relative overflow-hidden bg-gradient-to-r from-[#28B463] to-[#1a7a42] rounded-xl p-3 shadow-md border border-[#28B463]/20 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                            <Car className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-sm uppercase italic tracking-tighter leading-none font-Cairo">
                                {t('garageOffersTitle') || 'عروض مخصصة لسيارتك'}
                            </h4>
                            <p className="text-white/80 font-bold text-[11px] mt-0.5 uppercase font-Cairo">
                                {car.make} {car.model} {car.year}
                            </p>
                        </div>
                    </div>
                    {/* Pulse Indicator */}
                    <div className="flex items-center gap-2 pr-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span className="text-white text-[9px] font-black uppercase tracking-widest leading-none opacity-90 italic">GARAGE ACTIVE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Home = () => {
    const { t, i18n } = useTranslation();
    const { activeCar } = useFilters();
    const [bestSellers, setBestSellers] = useState([]);
    const [hotOffers, setHotOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const processHomeData = () => {
            setLoading(true);
            try {
                // Use Master Cache for zero-latency, zero-cost scaling
                const allActive = (inventoryData || []).filter(p => p.isActive !== false);

                // Helper to check if a product matches the active car
                const matchesGarage = (p) => {
                    if (!activeCar || !activeCar.make) return false;

                    const pMake = (p.make || p.car_make || '').toUpperCase();
                    const pModel = (p.model || p.car_model || '').toUpperCase();
                    const cMake = activeCar.make.toUpperCase();
                    const cModel = (activeCar.model || '').toUpperCase();

                    // Specific match
                    const isCarMatch = pMake === cMake && (!cModel || pModel === cModel);

                    // Year match if applicable
                    let isYearMatch = true;
                    if (isCarMatch && activeCar.year) {
                        const y = parseInt(activeCar.year);
                        isYearMatch = (!p.yearStart || y >= p.yearStart) && (!p.yearEnd || y <= p.yearEnd);
                    }

                    return isCarMatch && isYearMatch;
                };

                // Helper to check if product is 'Universal'
                const isUniversal = (p) => {
                    const pMake = (p.make || p.car_make || '').toUpperCase();
                    // Products with no make or explicitly Universal/General are universal
                    const categoryCheck = p.category === 'إكسسوارات وعناية' || p.category === 'إضافة للموتور و البنزين';
                    return !pMake || pMake === 'UNIVERSAL' || pMake === 'GENERAL' || categoryCheck;
                };

                // Filter logic for Garage mode
                const getFiltered = (items) => {
                    if (!activeCar?.make) return items.slice(0, 12);

                    const garageMatches = items.filter(p => matchesGarage(p)).map(p => ({ ...p, isRecommended: true }));
                    const universalMatches = items.filter(p => isUniversal(p) && !matchesGarage(p)).map(p => ({ ...p, isRecommended: false }));

                    // NARROW FILTER: Show ONLY Garage Matches + Universal
                    return [...garageMatches, ...universalMatches].slice(0, 12);
                };

                // 1. Best Sellers: Filtered and Sorted
                const sortedBest = [...allActive].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
                setBestSellers(getFiltered(sortedBest));

                // 2. Hot Offers: Filtered and Selected
                const offers = allActive.filter(p => p.salePrice && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price));
                setHotOffers(getFiltered(offers));

            } catch (error) {
                console.error("Error processing home data:", error);
            } finally {
                setLoading(false);
            }
        };

        processHomeData();
    }, [activeCar?.make, activeCar?.model, activeCar?.year, inventoryData?.length]);

    const ProductSection = ({ title, icon: Icon, products, subtitle, color = "red" }) => {
        const scrollRef = useRef(null);

        const scroll = (direction) => {
            if (scrollRef.current) {
                const { current } = scrollRef;
                const scrollAmount = current.clientWidth * 0.8;
                current.scrollBy({
                    left: direction === 'left' ? -scrollAmount : scrollAmount,
                    behavior: 'smooth'
                });
            }
        };

        return (
            <section className="py-3 overflow-hidden">
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
                        <div className="flex items-center gap-4">
                            <Link to="/shop" className="text-[#000000] border border-[#000000] hover:text-[#e31e24] hover:border-[#e31e24] font-black flex items-center gap-1.5 group bg-white px-4 py-2 rounded shadow-sm transition-all hover:bg-gray-50 italic text-[10px] uppercase tracking-widest font-Cairo">
                                <span>{t('viewAll')}</span>
                                <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform not-italic" />
                            </Link>
                        </div>
                    </div>

                    {loading ? (
                        <RecommendationSkeleton />
                    ) : products.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] font-Cairo">{t('noProductsFound')}</p>
                        </div>
                    ) : (
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
                                ref={scrollRef}
                                className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                            >
                                {products.slice(0, 12).map(product => (
                                    <div key={product.id} className="basis-[48.5%] md:basis-[31%] lg:basis-[24.2%] snap-start flex-shrink-0">
                                        <ProductCard product={product} isCompact={true} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                `}} />
            </section>
        );
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": i18n.language === 'ar' ? "أين يمكنني شراء قطع غيار أصلية في مصر؟" : "Where can I buy original car parts in Egypt?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": i18n.language === 'ar'
                        ? "زيت اند فلترز هو مصدرك الأول لقطع الغيار الأصلية مع ضمان حقيقي وتوصيل لكل المحافظات."
                        : "Zait & Filters is your primary source for original car parts with genuine warranty and shipping across all Egyptian governorates."
                }
            },
            {
                "@type": "Question",
                "name": i18n.language === 'ar' ? "هل يوجد تقسيط على قطع الغيار؟" : "Do you offer installments for car parts?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": i18n.language === 'ar'
                        ? "نعم، بنوفر أنظمة تقسيط متنوعة من خلال (فوري، أمان، فاليو) لتسهيل شراء احتياجات عربيتك."
                        : "Yes, we provide various installment systems through (Fawry, Aman, ValU) to make it easier for you to purchase your car needs."
                }
            }
        ]
    };

    return (
        <div className="home-page flex-1 bg-white">
            <SEO
                title="Zait & Filters | HIGHREV - قطع الغيار بضغطة زرار"
                description="HIGHREV: اشتري قطع غيار عربيتك الأصلية بالضمان من زيت اند فلترز. بنوصل لكل محافظات مصر وعندنا كل طرق التقسيط."
                keywords="قطع غيار سيارات أصلية بمصر, زيوت وفلاتر بالضمان, تقسيط قطع غيار سيارات"
                url={window.location.origin + window.location.pathname}
                schema={faqSchema}
            />
            <Hero />
            <GarageModeBanner car={activeCar} />

            {/* Brands Section */}
            <section className="py-3 bg-white border-b border-gray-50">
                <BrandMarquee />
            </section>

            {/* Exclusive Offers Section */}
            <div className="bg-white py-2">
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
            <div className="bg-white py-2">
                <ProductSection
                    title={t('bestSellers')}
                    subtitle={t('bestSellersSub')}
                    icon={Sparkles}
                    products={bestSellers}
                    color="red"
                />
            </div>

            <section className="mt-4 pt-2 border-t border-gray-50">
                <ValuePropositionBanner />
            </section>

            <section className="py-6 bg-gray-50/30">
                <CategoryThumbnails />
            </section>

        </div>
    );
};

export default Home;
