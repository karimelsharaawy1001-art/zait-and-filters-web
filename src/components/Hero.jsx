import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CarSelector from './CarSelector';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const Hero = () => {
    const { t, i18n } = useTranslation();
    const [slides, setSlides] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                // Fetch all active slides without orderBy to avoid index requirement
                const q = query(
                    collection(db, 'hero_slides'),
                    where('isActive', '==', true)
                );
                const querySnapshot = await getDocs(q);
                const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort in JS
                setSlides(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
            } catch (error) {
                console.error("Error fetching hero slides:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSlides();
    }, []);

    // Auto-play logic
    useEffect(() => {
        if (slides.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [slides]);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

    // Fallback static data
    const staticSlide = {
        imageUrl: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&q=80&w=2000",
        title: t('premiumParts'),
        subtitleOne: t('professional'),
        subtitleTwo: t('service'),
        description: t('heroDesc')
    };

    if (loading) {
        return <div className="h-[600px] bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
    }

    const currentData = slides.length > 0 ? slides[currentSlide] : null;

    return (
        <div className="relative bg-gray-900 text-white min-h-[600px] md:h-[600px] flex items-center py-10 md:py-0 overflow-hidden">
            {/* Slides */}
            {slides.length > 0 ? (
                slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    >
                        {/* Background */}
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent z-10"></div>
                            <img
                                src={slide.imageUrl}
                                alt=""
                                className="w-full h-full object-cover opacity-50"
                            />
                        </div>

                        {/* Content */}
                        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center z-20">
                            <div className={`w-full md:w-1/2 text-center pt-20 md:pt-0 ${i18n.language === 'ar' ? 'md:text-right' : 'md:text-left'}`}>
                                <h1 className={`font-extrabold tracking-tight mb-6 drop-shadow-lg ${i18n.language === 'ar' ? 'text-5xl md:text-7xl leading-[1.3]' : 'text-4xl md:text-6xl leading-tight'}`}>
                                    {i18n.language === 'ar' ? slide.title_ar : slide.title_en}
                                </h1>
                                <p className={`text-gray-200 mb-8 max-w-lg drop-shadow-md mx-auto ${i18n.language === 'ar' ? 'text-xl md:mr-0 leading-[1.6]' : 'text-lg md:ml-0 leading-relaxed'}`}>
                                    {i18n.language === 'ar' ? slide.subtitle_ar : slide.subtitle_en}
                                </p>
                                <div className={`flex flex-col sm:flex-row gap-4 justify-center ${i18n.language === 'ar' ? 'md:justify-start' : 'md:justify-start'}`}>
                                    <Link to="/shop" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-lg transition-all flex items-center justify-center group shadow-lg">
                                        {t('shopNow')}
                                        <ChevronRight className={`h-5 w-5 transition-transform ${i18n.language === 'ar' ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'}`} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                /* Fallback Static Hero */
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent z-10"></div>
                    <img src={staticSlide.imageUrl} alt="" className="w-full h-full object-cover opacity-50" />
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center z-20">
                        <div className={`w-full md:w-1/2 text-center pt-20 md:pt-0 ${i18n.language === 'ar' ? 'md:text-right' : 'md:text-left'}`}>
                            <h1 className={`font-extrabold tracking-tight mb-6 drop-shadow-lg ${i18n.language === 'ar' ? 'text-5xl md:text-7xl leading-[1.3]' : 'text-4xl md:text-6xl leading-tight'}`}>
                                {staticSlide.title} <br />
                                <span className="text-orange-500">{staticSlide.subtitleOne}</span> {staticSlide.subtitleTwo}
                            </h1>
                            <p className={`text-gray-200 mb-8 max-w-lg drop-shadow-md mx-auto ${i18n.language === 'ar' ? 'text-xl md:mr-0 leading-[1.6]' : 'text-lg md:ml-0 leading-relaxed'}`}>
                                {staticSlide.description}
                            </p>
                            <Link to="/shop" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-lg transition-all flex items-center justify-center group shadow-lg inline-flex">
                                {t('shopNow')}
                                <ChevronRight className={`h-5 w-5 transition-transform ${i18n.language === 'ar' ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'}`} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Slider Controls (Only if slides > 1) */}
            {slides.length > 1 && (
                <>
                    <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/30 hover:bg-black/50 rounded-full transition-all text-white hidden md:block">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/30 hover:bg-black/50 rounded-full transition-all text-white hidden md:block">
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                className={`h-2 transition-all rounded-full ${i === currentSlide ? 'w-8 bg-orange-500' : 'w-2 bg-white/50 hover:bg-white'}`}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Car Selector (Always visible on top on mobile, right on desktop) */}
            <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-40 flex items-center justify-end pointer-events-none`}>
                <div className="w-full md:w-[350px] lg:w-[400px] pointer-events-auto">
                    <CarSelector />
                </div>
            </div>
        </div>
    );
};

export default Hero;
