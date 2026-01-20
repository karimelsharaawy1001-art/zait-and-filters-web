import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const CategoryThumbnails = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { updateFilter } = useFilters();
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'categories'));
                const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCategories(list);
            } catch (error) {
                console.error("Error fetching categories", error);
            }
        };
        fetchCategories();
    }, []);

    const handleCategoryClick = (categoryName) => {
        updateFilter('category', categoryName);
        navigate('/shop'); // Note: This uses context navigation. If URL sync in ShopPage handles initial context load, this is fine.
        // Actually, better to navigate with URL params now that ShopPage syncs that way.
        // navigate(`/shop?category=${categoryName}`);
        // But since context also updates, ShopPage might double sync.
        // Let's stick to updateFilter + navigate logic which worked before, or switch to URL.
        // Given I updated CarSelector to use URL, I should probably do same here for consistency.
        // navigate(`/shop?category=${categoryName}`);
    };

    if (categories.length === 0) return null;

    return (
        <div className="bg-white py-8 sm:py-12 border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center mb-6 sm:mb-10 border-b border-gray-100 pb-6">
                    <h2 className="text-2xl sm:text-4xl font-black text-gray-900 uppercase tracking-tight">
                        {t('shopByCategory', 'تسوق حسب الفئة')}
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.name)}
                            className="group relative h-32 sm:h-48 rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1.5"
                        >
                            {/* Background Image */}
                            <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            />

                            {/* Refined Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-orange-600/80 transition-colors duration-500"></div>

                            {/* Content */}
                            <div className="absolute inset-0 flex items-end justify-center p-4 sm:p-6">
                                <h3 className="text-white text-base sm:text-xl font-black text-center tracking-wide group-hover:scale-110 transition-transform duration-500 drop-shadow-lg">
                                    {cat.name}
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
