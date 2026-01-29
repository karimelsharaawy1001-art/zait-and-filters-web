import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { useFilters } from '../context/FilterContext';

const GarageActiveIndicator = () => {
    const { activeCar, isGarageFilterActive, setIsGarageFilterActive } = useFilters();

    // Don't render if garage is not active
    if (!isGarageFilterActive || !activeCar) {
        return null;
    }

    const handleDeactivate = () => {
        setIsGarageFilterActive(false);
    };

    return (
        <div className="sticky top-[88px] md:top-[96px] z-40 w-full animate-in slide-in-from-top-2 duration-500">
            <div className="relative overflow-hidden">
                {/* Background with gradient and subtle pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#047857] via-[#059669] to-[#10b981] opacity-95"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]"></div>

                {/* Pulse animation overlay */}
                <div className="absolute inset-0 bg-white/5 animate-pulse-slow"></div>

                {/* Content */}
                <div className="relative px-4 py-3 md:py-3.5">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        {/* Left: Icon + Text */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse-slow">
                                <Sparkles className="w-4 h-4 text-yellow-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-black text-sm md:text-base leading-tight font-Cairo">
                                    <span className="inline-block">✨ وضع الجراج نشط:</span>
                                    {' '}
                                    <span className="text-yellow-200 font-extrabold">
                                        عرض المنتجات المتوافقة مع {activeCar.make} {activeCar.model} ({activeCar.year})
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Right: Deactivate Button */}
                        <button
                            onClick={handleDeactivate}
                            className="flex-shrink-0 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 border border-white/30 shadow-lg"
                            aria-label="إيقاف وضع الجراج"
                        >
                            <X className="w-4 h-4" />
                            <span className="hidden md:inline font-Cairo">إيقاف</span>
                        </button>
                    </div>
                </div>

                {/* Bottom border accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-300 to-transparent"></div>
            </div>

            {/* Add custom pulse animation */}
            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% {
                        opacity: 0.05;
                    }
                    50% {
                        opacity: 0.15;
                    }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default GarageActiveIndicator;
