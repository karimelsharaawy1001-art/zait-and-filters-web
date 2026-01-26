import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const BrandPage = () => {
    const { brandName } = useParams();
    const { updateFilter, filters } = useFilters();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    useEffect(() => {
        if (brandName) {
            updateFilter('brand', brandName);
            // Reset other major filters to ensure prominence
            updateFilter('category', 'All');
            updateFilter('subcategory', '');
        }
    }, [brandName]);

    return (
        <div className="bg-white min-h-screen">
            <SEO
                title={`${brandName} ${isAr ? 'في مصر' : 'in Egypt'} | Zait & Filters`}
                description={isAr
                    ? `اشتري منتجات ${brandName} الأصلية بأفضل الأسعار في مصر. زيوت وفلاتر بالضمان.`
                    : `Buy original ${brandName} parts at best prices in Egypt. Quality oils and filters with warranty.`}
                url={window.location.origin + window.location.pathname}
            />

            <div className="bg-gray-50 border-b border-gray-100 py-12 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        {isAr ? "البراندات الأصلية" : "OFFICIAL BRAND PARTNER"}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 italic uppercase tracking-tighter leading-none font-Cairo mb-4">
                        {brandName}
                    </h1>
                    <p className="text-gray-500 font-bold max-w-xl mx-auto uppercase tracking-widest text-xs">
                        {isAr
                            ? `استكشف تشكيلة منتجات ${brandName} المتوفرة بضمان زيت اند فلترز`
                            : `Explore our selection of ${brandName} products with Zait & Filters warranty`}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <ProductGrid showFilters={true} />
            </div>
        </div>
    );
};

export default BrandPage;
