import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Circle } from 'lucide-react';
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
        imageUrl: 'https://images.unsplash.com/photo-1620836521741-6156e07759b6?auto=format&fit=crop&q=80&w=1200',
        title_ar: 'زيت اند فلترز',
        title_en: 'Zait & Filters',
        subtitle_ar: 'قطع الغيار بضغطة زرار',
        subtitle_en: 'Spare parts with one click'
    }];

    const currentSlide = displaySlides[currentIndex];

    return (
        <div className="relative bg-[#f9f9f9] min-h-[500px] md:h-[600px] flex flex-col items-center overflow-hidden">
            {/* Slide Content */}
            <div className="relative w-full h-full flex items-center transition-all duration-700 ease-in-out">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 py-12 md:py-0">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">

                        {/* Text Content */}
                        <div className="w-full md:w-1/2 text-center md:text-right animate-in fade-in slide-in-from-bottom duration-700">
                            <h1 className="text-3xl md:text-6xl font-black text-[#111111] leading-tight mb-4 md:mb-6 font-Cairo tracking-tighter uppercase italic">
                                <span className="text-[#28B463]">
                                    {i18n.language === 'ar' ? currentSlide.title_ar : currentSlide.title_en}
                                </span>
                                <br />
                                <span className="text-xl md:text-4xl block mt-1 md:mt-2 text-gray-700 not-italic">
                                    {i18n.language === 'ar' ? currentSlide.subtitle_ar : currentSlide.subtitle_en}
                                </span>
                            </h1>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <Link
                                    to="/shop"
                                    className="bg-[#28B463] hover:bg-[#219653] text-white font-black py-3.5 md:py-4 px-10 md:px-12 rounded-lg shadow-xl shadow-[#28B463]/20 transition-all flex items-center justify-center group uppercase italic tracking-widest text-base md:text-lg font-Cairo"
                                >
                                    {t('shopNow')}
                                    <ChevronRight className={`h-5 w-5 md:h-6 md:w-6 transition-transform not-italic ${i18n.language === 'ar' ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'}`} />
                                </Link>
                            </div>
                        </div>

                        {/* Image Content */}
                        <div className="w-full md:w-1/2 flex justify-center animate-in fade-in zoom-in duration-1000">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#28B463]/5 rounded-full scale-110 opacity-50 blur-2xl"></div>
                                <img
                                    src={currentSlide.imageUrl}
                                    alt=""
                                    className="relative z-10 w-full max-w-[500px] h-auto object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-500 rounded-2xl"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            {displaySlides.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all text-gray-800"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all text-gray-800"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {displaySlides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`transition-all duration-300 ${currentIndex === index ? 'w-8 bg-[#28B463]' : 'w-2 bg-gray-300'} h-2 rounded-full`}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Car Selector (Floating Overlay) */}
            <div className="relative md:absolute bottom-auto md:bottom-8 left-0 right-0 z-40 w-full mt-8 md:mt-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-center md:justify-end">
                    <div className="w-[92%] md:w-[350px] lg:w-[380px] mx-auto md:mx-0">
                        <CarSelector />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
