import React from 'react';

const PageLoader = () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-[#28B463]/20 border-t-[#28B463] rounded-full animate-spin mb-4"></div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 animate-pulse">
            Loading Performance Assets...
        </div>
    </div>
);

export default PageLoader;
