import React, { useState, memo } from 'react';
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import OptimizedImage from './OptimizedImage';
import { getOptimizedImage } from '../utils/cloudinaryUtils';
import { safeSessionStorage } from '../utils/safeStorage';

const ProductCard = ({ product, isCompact = false }) => {
    const { t, i18n } = useTranslation();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [isAdded, setIsAdded] = useState(false);

    const isRecommended = product.isRecommended;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, quantity);
        toast.success(t('addedToCart'));
        setQuantity(1); // Reset to 1 after adding

        // Trigger success animation
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    const incrementQuantity = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setQuantity(prev => prev + 1);
    };

    const decrementQuantity = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const hasSale = product.salePrice && Number(product.salePrice) < Number(product.price);

    return (
        <article
            className={`product-card group relative flex flex-col !gap-0 !space-y-0 !justify-start rounded-premium shadow-lg border overflow-hidden transition-all duration-500 hover:translate-y-[-8px] hover:shadow-2xl w-full max-w-[320px] mx-auto h-full ${isCompact ? 'px-0' : 'px-0.5'} bg-white border-gray-100`}
            style={{
                willChange: 'transform',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                contain: 'content'
            }}
        >
            {/* HERO IMAGE - Fixed Aspect Ratio to prevent collapse */}
            <Link
                to={`/product/${product.id}`}
                className="relative bg-gray-50 block w-full aspect-square overflow-hidden"
                onClick={() => {
                    // Save scroll position before navigating
                    const currentPosition = window.scrollY;
                    safeSessionStorage.setItem('productListScrollPosition', currentPosition.toString());
                }}
            >
                <OptimizedImage
                    src={product.image}
                    alt={`${i18n.language === 'en' ? (product.nameEn || product.name) : product.name} - ${i18n.language === 'en' ? (product.brandEn || product.partBrand || product.brand || 'Original') : (product.partBrand || product.brand || 'أصلي')}`}
                    className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
                    width={400}
                />

                {/* Status Badges - Optimized for Mobile Overlay */}
                <div className={`absolute z-20 flex flex-col gap-1.5 ${isCompact ? 'top-1.5 right-1.5' : 'top-3 right-3'}`}>
                    {/* Original Badge - Only show if isGenuine is true */}
                    {product.isGenuine && (
                        <div className="flex items-center justify-center px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#10b981] shadow-xl shadow-green-900/20 border-2 border-white/20 backdrop-blur-sm">
                            <span className="text-[9px] sm:text-xs text-white font-black uppercase tracking-widest font-Cairo leading-none whitespace-nowrap">
                                {i18n.language === 'ar' ? 'منتج أصلي' : 'ORIGINAL'}
                            </span>
                        </div>
                    )}

                    {/* Sale Badge - Stacking below Original on the same side */}
                    {hasSale && (
                        <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF4500] flex items-center justify-center px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl shadow-xl shadow-orange-900/20 border-2 border-white/20">
                            <span className="text-[#000000] text-[9px] sm:text-xs uppercase font-black italic font-Cairo leading-none whitespace-nowrap">
                                {t('hotSale')}
                            </span>
                        </div>
                    )}
                </div>


            </Link>

            {/* CONTENT HUB - Zero Gap Typography */}
            <div className={`${isCompact ? 'p-2' : 'p-4'} flex flex-col flex-1 gap-3 !mt-[-1px] !pt-0`}>
                <div className="flex flex-col gap-2 text-right">
                    {/* PRODUCT NAME */}
                    <Link
                        to={`/product/${product.id}`}
                        className={`block overflow-hidden ${isCompact ? 'mt-1.5' : 'mt-4'}`}
                        onClick={() => {
                            // Save scroll position before navigating
                            const currentPosition = window.scrollY;
                            safeSessionStorage.setItem('productListScrollPosition', currentPosition.toString());
                        }}
                    >
                        <h3
                            className={`text-[#1A1A1A] font-extrabold leading-tight line-clamp-2 uppercase transition-colors overflow-hidden text-ellipsis ${isCompact ? '!text-[12px] md:!text-base' : '!text-base md:!text-xl'}`}
                            style={{ fontFamily: 'var(--font-commercial)' }}
                        >
                            {i18n.language === 'en' ? (product.nameEn || product.name) : product.name}
                        </h3>
                    </Link>

                    {/* DETAILS GRID - Simplified in compact mode */}
                    <div className={`grid grid-cols-2 gap-x-1 gap-y-1.5 border-b border-gray-100 ${isCompact ? 'pb-1.5' : 'pb-2'}`}>
                        {/* Always show Brand */}
                        <div className="flex flex-col items-end overflow-hidden text-right">
                            <span className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                {i18n.language === 'ar' ? 'البراند' : 'Brand'}
                            </span>
                            <span className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} leading-tight text-[#000000] font-black font-Cairo truncate w-full`}>
                                {i18n.language === 'en'
                                    ? (product.brandEn || product.partBrand || product.brand)
                                    : (product.partBrand || product.brand || 'No Brand')}
                            </span>
                        </div>

                        {/* Always show Model & Year */}
                        <div className="flex flex-col items-end overflow-hidden text-right">
                            <span className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                {i18n.language === 'ar' ? 'الموديل' : 'Model'}
                            </span>
                            <div className="flex flex-col items-end w-full">
                                <span className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} leading-tight text-[#000000] font-black font-Cairo w-full line-clamp-2`} title={product.carModel || `${product.make} ${product.model}`}>
                                    {product.carModel || `${product.make} ${product.model}` || 'Universal'}
                                </span>
                                {(product.yearRange || product.yearStart || product.yearEnd) && (
                                    <span className={`${isCompact ? 'text-[7px]' : 'text-[8px]'} leading-tight text-[#000000] font-bold font-Cairo mt-0.5 truncate w-full`}>
                                        {product.yearRange ||
                                            (product.yearStart && product.yearEnd ? `${product.yearStart}-${product.yearEnd}` :
                                                product.yearStart || product.yearEnd || '')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Origin */}
                        <div className="flex flex-col items-end overflow-hidden text-right">
                            <span className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                {i18n.language === 'ar' ? 'المنشأ' : 'Origin'}
                            </span>
                            <span className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} leading-tight text-[#333] font-black italic font-Cairo truncate w-full`}>
                                {product.origin || product.countryOfOrigin || 'Imported'}
                            </span>
                        </div>

                        {/* Category */}
                        {product.category && (
                            <div className="flex flex-col items-end overflow-hidden text-right">
                                <span className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                    {i18n.language === 'ar' ? 'الفئة' : 'Category'}
                                </span>
                                <span className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} leading-tight text-[#333] font-black font-Cairo truncate w-full`}>
                                    {product.category}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`mt-auto flex flex-col ${isCompact ? 'gap-2 pt-2' : 'gap-3 pt-3'} border-t border-gray-100`}>
                    <div className={`flex items-center justify-between ${isCompact ? 'flex-row' : 'flex-col sm:flex-row'} gap-3`}>
                        <div className={`flex flex-col ${isCompact ? 'items-start' : 'items-center sm:items-start'}`}>
                            {hasSale && (
                                <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-gray-400 line-through font-bold leading-none mb-0.5`}>
                                    {product.price} {t('currency')}
                                </span>
                            )}
                            <div className="flex items-baseline gap-1">
                                <span className={`${isCompact ? 'text-xl' : 'text-2xl md:text-3xl'} font-black text-[#059669] font-Cairo leading-none drop-shadow-sm`}>
                                    {hasSale ? product.salePrice : product.price}
                                </span>
                                <span className={`${isCompact ? 'text-xs' : 'text-xs md:text-sm'} font-black text-[#1A1A1A] uppercase tracking-tighter`}>{t('currency')}</span>
                            </div>
                        </div>

                        {/* PREMIUM QUANTITY SELECTOR */}
                        <div className={`flex items-center bg-gray-50 border border-gray-200 rounded-full p-1 shadow-inner h-[36px] sm:h-[42px] ${isCompact ? 'scale-90 origin-right' : ''}`}>
                            <button
                                onClick={decrementQuantity}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white text-gray-600 hover:text-emerald-600 hover:shadow-sm border border-transparent hover:border-emerald-100 transition-all active:scale-90"
                            >
                                <Minus className="h-3.5 w-3.5 sm:h-4 w-4" />
                            </button>
                            <span className="min-w-[24px] sm:min-w-[32px] text-center text-xs sm:text-sm font-black text-gray-900 font-Cairo">{quantity}</span>
                            <button
                                onClick={incrementQuantity}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white text-gray-600 hover:text-emerald-600 hover:shadow-sm border border-transparent hover:border-emerald-100 transition-all active:scale-90"
                            >
                                <Plus className="h-3.5 w-3.5 sm:h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className={`w-full ${isCompact ? 'py-3' : 'py-4'} rounded-full transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 group/btn overflow-hidden relative ${isCompact ? 'text-[12px]' : 'text-[15px]'} ${isAdded ? 'bg-green-500 shadow-xl shadow-green-900/30 scale-105' : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-900/20'} text-white font-medium uppercase tracking-wide font-Cairo`}
                    >
                        <div className={`absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ${isAdded ? 'hidden' : ''}`} />
                        {isAdded ? (
                            <Check className={`${isCompact ? 'h-5 w-5' : 'h-6 w-6'} relative z-10 animate-in zoom-in duration-300`} />
                        ) : (
                            <ShoppingCart className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} relative z-10 transition-all group-hover/btn:scale-110 group-hover/btn:-rotate-6`} />
                        )}
                        <span className="relative z-10 font-black">
                            {isAdded
                                ? (i18n.language === 'ar' ? 'تمت الإضافة' : 'ADDED')
                                : (i18n.language === 'ar' ? 'أضف للسلة' : (isCompact ? 'ADD TO CART' : 'ADD TO SHOPPING CART'))}
                        </span>
                    </button>
                </div>
            </div>
        </article>
    );
};

export default memo(ProductCard);
