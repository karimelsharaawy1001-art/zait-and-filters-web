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

    return (
        <div className="relative bg-[#f9f9f9] h-auto md:h-[600px] flex flex-col items-center overflow-visible md:overflow-hidden pt-12 md:pt-0 pb-12 md:pb-0">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white transform skew-x-12 translate-x-1/4 z-0 hidden md:block"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">

                    {/* Left Content */}
                    <div className="w-full md:w-1/2 text-center md:text-right lg:pt-14">
                        <h1 className="text-3xl md:text-6xl font-black text-[#111111] leading-tight mb-4 md:mb-6 font-Cairo tracking-tighter uppercase italic">
                            <span className="text-[#e31e24]">ZAIT</span> & FILTERS <br />
                            <span className="text-xl md:text-4xl block mt-1 md:mt-2 text-gray-700 not-italic">قطع الغيار بضغطة زرار</span>
                        </h1>
                        <p className="text-base md:text-xl text-gray-500 mb-8 md:mb-10 font-Cairo max-w-xl mx-auto md:ml-0">
                            احصل على أفضل أنواع الزيوت والفلاتر الأصلية لسيارتك بأفضل الأسعار وبضمان حقيقي.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <Link to="/shop" className="bg-[#e31e24] hover:bg-[#b8181d] text-white font-black py-3.5 md:py-4 px-10 md:px-12 rounded-lg shadow-xl shadow-red-500/20 transition-all flex items-center justify-center group uppercase italic tracking-widest text-base md:text-lg font-Cairo">
                                {t('shopNow')}
                                <ChevronRight className={`h-5 w-5 md:h-6 md:w-6 transition-transform not-italic ${i18n.language === 'ar' ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'}`} />
                            </Link>
                        </div>
                    </div>

                    {/* Right Image (Hidden on Mobile) */}
                    <div className="hidden md:flex md:w-1/2 justify-center">
                        <div className="relative">
                            {/* Decorative Circle Background */}
                            <div className="absolute inset-0 bg-red-100 rounded-full scale-110 opacity-50 blur-2xl"></div>
                            <img
                                src="https://images.unsplash.com/photo-1620836521741-6156e07759b6?auto=format&fit=crop&q=80&w=800"
                                alt=""
                                className="relative z-10 w-full max-w-[500px] h-auto object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Car Selector (Floating Right/Bottom on Desktop, Natural Stack on Mobile) */}
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
