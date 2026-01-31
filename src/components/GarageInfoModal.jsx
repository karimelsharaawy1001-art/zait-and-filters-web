import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Car, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GarageInfoModal = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const isAr = i18n.language === 'ar';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" dir={isAr ? 'rtl' : 'ltr'}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-gray-100">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 group`}
                >
                    <X className="h-6 w-6 transition-transform group-hover:rotate-90" />
                </button>

                {/* Hero Icon Section */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 sm:p-12 flex flex-col items-center justify-center text-white text-center">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md mb-6 animate-bounce duration-[2000ms]">
                        <Car className="h-12 w-12 sm:h-16 sm:w-16 stroke-[2px]" />
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black font-Cairo uppercase italic tracking-tighter leading-tight">
                        {t('garageInfo.title')}
                    </h2>
                </div>

                {/* Body Section */}
                <div className="p-8 sm:p-10 space-y-6">
                    <p className="text-[#1A1A1A] text-lg sm:text-xl font-bold font-Cairo leading-relaxed text-center">
                        {t('garageInfo.description')}
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                navigate('/login');
                                onClose();
                            }}
                            className="w-full bg-[#1A1A1A] hover:bg-[#000000] text-white py-5 rounded-2xl font-black font-Cairo text-lg uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/20 flex items-center justify-center gap-3 group"
                        >
                            <LogIn className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            {t('garageInfo.action')}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold font-Cairo text-[15px] uppercase transition-colors"
                        >
                            {t('garageInfo.close')}
                        </button>
                    </div>
                </div>

                {/* Bottom Accent */}
                <div className="h-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600"></div>
            </div>
        </div>
    );
};

export default GarageInfoModal;
