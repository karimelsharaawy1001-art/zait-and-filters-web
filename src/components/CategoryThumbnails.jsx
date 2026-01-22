import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFilters } from '../context/FilterContext';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const CategoryThumbnails = () => {
    const { t, i18n } = useTranslation();
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
        navigate('/shop');
    };

    if (categories.length === 0) return null;

    return (
        <div className="bg-white py-8 sm:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-3xl sm:text-4xl font-black text-[#000000] uppercase italic tracking-tighter font-Cairo">
                        {t('shopByCategory')}
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.name)}
                            className="group relative h-40 sm:h-56 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-highrev-grey-light"
                        >
                            {/* Background Image */}
                            <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            />

                            {/* Dark Overlay for Readability */}
                            <div
                                className="absolute inset-0 group-hover:opacity-90 transition-all duration-500"
                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: '12px' }}
                            ></div>

                            {/* Content - Centered */}
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <h3 className="text-white text-2xl sm:text-4xl font-black text-center tracking-tighter transition-all duration-500 italic uppercase font-Cairo drop-shadow-xl">
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
