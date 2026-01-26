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
        <>
            {/* Hero Section with Background Image */}
            <div className="hero-section-wrapper relative w-full h-[450px] md:h-[600px] overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 transition-all duration-700 ease-in-out">
                    <img
                        src={currentSlide.imageUrl}
                        alt=""
                        className="w-full h-full object-cover object-center"
                    />
                    {/* Subtle Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"></div>
                </div>

                {/* Content Container */}
                <div className="relative h-full flex items-center z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                        <div className="flex flex-col md:flex-row items-center md:items-stretch justify-between gap-8">

                            {/* LEFT: Car Selector Widget (Desktop Only) */}
                            <div className="hidden md:flex md:w-[380px] lg:w-[420px] flex-shrink-0">
                                <div className="w-full">
                                    <CarSelector />
                                </div>
                            </div>

                            {/* RIGHT: Text Content & CTA */}
                            <div className="flex-1 flex flex-col items-center md:items-end justify-center text-center md:text-right">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#28B463] leading-tight mb-3 md:mb-4 font-Cairo tracking-tighter uppercase italic drop-shadow-2xl">
                                    {i18n.language === 'ar' ? currentSlide.title_ar : currentSlide.title_en}
                                </h1>
                                <p className="text-2xl md:text-3xl lg:text-4xl text-gray-800 font-black mb-6 md:mb-8 font-Cairo drop-shadow-lg">
                                    {i18n.language === 'ar' ? currentSlide.subtitle_ar : currentSlide.subtitle_en}
                                </p>
                                <Link
                                    to="/shop"
                                    className="bg-[#28B463] hover:bg-[#219653] text-white font-black py-4 md:py-5 px-12 md:px-16 rounded-lg shadow-2xl shadow-[#28B463]/40 transition-all flex items-center justify-center group uppercase italic tracking-widest text-lg md:text-xl font-Cairo transform hover:scale-105"
                                >
                                    {t('shopNow')}
                                    <ChevronRight className={`h-6 w-6 md:h-7 md:w-7 transition-transform not-italic ${i18n.language === 'ar' ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'}`} />
                                </Link>
                            </div>

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
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                            {displaySlides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`transition-all duration-300 ${currentIndex === index ? 'w-8 bg-[#28B463]' : 'w-2 bg-white/80'} h-2 rounded-full hover:bg-[#28B463] shadow-lg`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Mobile Car Selector (Below Hero with Overlap) */}
            <div className="md:hidden relative -mt-16 z-50 px-4 pb-4">
                <div className="w-full max-w-[92%] mx-auto">
                    <CarSelector />
                </div>
            </div>
        </>
    );
};

export default Hero;
