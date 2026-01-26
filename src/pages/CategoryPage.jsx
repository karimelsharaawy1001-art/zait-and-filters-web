import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import { useFilters } from '../context/FilterContext';

const CategoryPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { updateFilter } = useFilters();

    const [category, setCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategory = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'categories', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCategory({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error("No such category!");
                    navigate('/');
                }
            } catch (error) {
                console.error("Error fetching category:", error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchCategory();
    }, [id, navigate]);

    const handleSubcategoryClick = (subcategoryName) => {
        if (category) {
            updateFilter('category', category.name);
            updateFilter('subCategory', subcategoryName);
            navigate(`/shop?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subcategoryName)}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-brand-red" />
            </div>
        );
    }

    if (!category) return null;

    const subcategories = category.subCategories || [];
    const categoryName = i18n.language === 'ar' ? category.name : (category.nameEn || category.name);

    return (
        <div className="bg-white min-h-screen pb-12">
            <SEO
                title={`${categoryName} | Zait & Filters`}
                description={`Shop ${categoryName} and subcategories at Zait & Filters.`}
                url={window.location.origin + window.location.pathname}
            />

            {/* Breadcrumbs */}
            <div className="bg-gray-50 border-b border-gray-100 py-4 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                        <Link to="/" className="hover:text-black transition-colors">{t('home')}</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-black">{categoryName}</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                    <div>
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('backToHome')}</span>
                        </button>
                        <h1 className="text-4xl md:text-6xl font-black text-black italic uppercase tracking-tighter leading-none font-Cairo">
                            {categoryName}
                        </h1>
                    </div>
                </div>

                {/* Subcategory Grid or Empty State */}
                {subcategories.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <h2 className="text-2xl font-black text-gray-400 italic uppercase mb-4">{t('comingSoon')}</h2>
                        <button
                            onClick={() => {
                                updateFilter('category', category.name);
                                navigate(`/shop?category=${encodeURIComponent(category.name)}`);
                            }}
                            className="admin-primary-btn w-fit px-8"
                        >
                            {t('viewAllProducts')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
                        {subcategories.map((sub, index) => {
                            const subName = typeof sub === 'string' ? sub : sub.name;
                            const subImage = typeof sub === 'string' ? category.imageUrl : (sub.imageUrl || category.imageUrl);

                            return (
                                <div
                                    key={index}
                                    onClick={() => handleSubcategoryClick(subName)}
                                    className="group relative h-32 md:h-56 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100"
                                >
                                    <img
                                        src={subImage}
                                        alt={subName}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />

                                    {/* Heavy Dark Gradient Overlay for Readability */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-all duration-500"
                                    ></div>

                                    {/* Text Content */}
                                    <div className="absolute inset-0 flex items-end justify-center pb-6 px-2 text-center">
                                        <h3 className="text-sm md:text-3xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl whitespace-normal font-Cairo text-white">
                                            {subName}
                                        </h3>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryPage;
