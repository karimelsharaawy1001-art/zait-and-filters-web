import React from 'react';

const SkeletonProductCard = ({ isCompact = false }) => {
    return (
        <div className={`product-card relative flex flex-col rounded-premium shadow-md border border-gray-100 overflow-hidden w-full max-w-[320px] mx-auto h-full bg-white animate-pulse`}>
            {/* Image Placeholder */}
            <div className="relative bg-gray-200 aspect-square w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            </div>

            {/* Content Placeholder */}
            <div className={`${isCompact ? 'p-2' : 'p-4'} flex flex-col flex-1 gap-3`}>
                <div className="flex flex-col gap-2">
                    {/* Title Placeholder */}
                    <div className={`bg-gray-200 h-6 w-3/4 rounded-md mt-4 self-end`}></div>

                    {/* Details Grid Placeholder */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 pb-2 border-b border-gray-50 mt-2">
                        <div className="flex flex-col items-end gap-1">
                            <div className="h-2 w-10 bg-gray-100 rounded"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="h-2 w-10 bg-gray-100 rounded"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section Placeholder */}
                <div className="mt-auto flex flex-col gap-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-16 bg-gray-200 rounded-lg"></div>
                    </div>
                    {/* Button Placeholder */}
                    <div className="h-12 w-full bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonProductCard;
