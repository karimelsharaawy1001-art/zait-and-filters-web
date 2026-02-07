import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import { databases } from '../appwrite';
import { Query } from 'appwrite';

const CategoryThumbnails = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { updateFilter } = useFilters();
    const [categories, setCategories] = useState([]);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CATEGORIES_COLLECTION = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories';

    useEffect(() => {
        const fetchCategories = async () => {
            if (!DATABASE_ID) return;
            try {
                const response = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [Query.limit(100)]);
                setCategories(response.documents);
            } catch (error) {
                console.error("Error fetching categories", error);
            }
        };
        fetchCategories();
    }, [DATABASE_ID]);

    const handleCategoryClick = (categoryId) => {
        navigate(`/category/${categoryId}`);
    };

    if (categories.length === 0) return null;

    return (
        <div className="bg-white py-4 sm:py-5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center mb-3 border-b border-gray-100 pb-4">
                    <h2 className="text-3xl sm:text-4xl font-black text-[#000000] uppercase italic tracking-tighter font-Cairo">
                        {t('shopByCategory')}
                    </h2>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className="group relative h-28 sm:h-56 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-highrev-grey-light"
                        >
                            {/* Background Image */}
                            <img
                                src={cat.image || cat.imageUrl}
                                alt={cat.name}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                loading="lazy"
                            />

                            {/* Dark Overlay for Readability */}
                            <div
                                className="absolute inset-0 group-hover:opacity-90 transition-all duration-500"
                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', borderRadius: '12px' }}
                            ></div>

                            {/* Content - Centered */}
                            <div className="absolute inset-0 flex items-center justify-center p-1 sm:p-4">
                                <h3 className="text-white text-[16px] sm:text-4xl font-black text-center leading-tight tracking-tighter transition-all duration-500 italic uppercase font-Cairo drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] whitespace-normal">
                                    {i18n.language === 'ar' ? cat.name : (cat.nameEn || cat.name)}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryThumbnails;
