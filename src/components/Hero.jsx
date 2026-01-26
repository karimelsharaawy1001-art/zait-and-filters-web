import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Circle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import CarSelector from './CarSelector';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { getOptimizedImage } from '../utils/cloudinaryUtils';

const Hero = () => {
    const { t, i18n } = useTranslation();
    const { settings } = useSettings();
    const [slides, setSlides] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                const q = query(
                    collection(db, 'hero_slides'),
                    where('isActive', '==', true),
                    orderBy('order', 'asc')
                );
                const querySnapshot = await getDocs(q);
                const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSlides(list);
            } catch (error) {
                console.error("Error fetching hero slides:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSlides();
    }, []);

    // Auto-play timer
    useEffect(() => {
        if (slides.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % slides.length);
        }, 6000);

        return () => clearInterval(timer);
    }, [slides]);

    const nextSlide = () => {
        setCurrentIndex(prev => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
    };

    if (loading && slides.length === 0) {
        return (
            <div className="relative bg-[#f9f9f9] h-[500px] md:h-[600px] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#28B463]" />
            </div>
        );
    }

    // Default slide if none found
    const displaySlides = slides.length > 0 ? slides : [{
        id: 'default',
        imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1920',
        title_ar: 'زيت اند فلترز',
        title_en: 'Zait & Filters',
        subtitle_ar: 'قطع الغيار بضغطة زرار',
        subtitle_en: 'Spare parts with one click'
    }];

    const currentSlide = displaySlides[currentIndex];

    return (
        <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 transition-all duration-700 ease-in-out">
                <img
                    src={currentSlide.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                />
                {/* Dark Overlay for Text Contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
            </div>

            {/* Content Overlay */}
            <div className="relative h-full flex items-center z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="max-w-2xl">
                        {/* Title */}
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-4 md:mb-6 font-Cairo tracking-tighter uppercase italic drop-shadow-2xl">
                            <span className="text-[#28B463]">
                                {i18n.language === 'ar' ? currentSlide.title_ar : currentSlide.title_en}
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl md:text-3xl text-white/95 mb-6 md:mb-8 font-Cairo font-bold drop-shadow-lg">
                            {i18n.language === 'ar' ? currentSlide.subtitle_ar : currentSlide.subtitle_en}
                        </p>

                        {/* Promo Code Badge (if available) */}
                        {settings?.promoCode && (
                            <div className="mb-6 inline-block">
                                <div className="bg-[#28B463] text-white px-6 py-3 rounded-lg shadow-xl font-black text-lg uppercase tracking-widest">
                                    {settings.promoCode}
                                </div>
                            </div>
                        )}

                        {/* CTA Button */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/shop"
                                className="bg-[#28B463] hover:bg-[#219653] text-white font-black py-4 md:py-5 px-10 md:px-14 rounded-lg shadow-2xl shadow-[#28B463]/40 transition-all flex items-center justify-center group uppercase italic tracking-widest text-base md:text-xl font-Cairo transform hover:scale-105"
                            >
                                {t('shopNow')}
                                <ChevronRight className={`h-6 w-6 md:h-7 md:w-7 transition-transform not-italic ${i18n.language === 'ar' ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'}`} />
                            </Link>
                        </div>

                        {/* Delivery Message (if available) */}
                        {settings?.deliveryMessage && (
                            <p className="mt-6 text-white/90 text-sm md:text-base font-Cairo font-bold drop-shadow-md">
                                {i18n.language === 'ar' ? settings.deliveryMessage_ar : settings.deliveryMessage}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            {displaySlides.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/90 hover:bg-white rounded-full shadow-xl transition-all text-gray-800 hover:scale-110"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/90 hover:bg-white rounded-full shadow-xl transition-all text-gray-800 hover:scale-110"
                        aria-label="Next slide"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Pagination Dots */}
                    <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                        {displaySlides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`transition-all duration-300 ${currentIndex === index ? 'w-8 bg-[#28B463]' : 'w-2 bg-white/60'} h-2 rounded-full hover:bg-[#28B463]`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Car Selector Widget (Floating on Top) */}
            <div className="absolute bottom-4 md:bottom-8 left-0 right-0 z-50 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-center md:justify-end">
                    <div className="w-[92%] md:w-[350px] lg:w-[380px]">
                        <CarSelector />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
