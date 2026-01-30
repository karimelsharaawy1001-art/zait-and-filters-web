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

    const isRecommended = product.isRecommended;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, quantity);
        toast.success(t('addedToCart'));
        setQuantity(1); // Reset to 1 after adding
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
        <article className={`product-card group relative flex flex-col !gap-0 !space-y-0 !justify-start rounded-premium shadow-lg border overflow-hidden transition-all duration-500 hover:translate-y-[-8px] hover:shadow-2xl w-full max-w-[320px] mx-auto h-full ${isCompact ? 'px-0' : 'px-0.5'} ${isRecommended ? 'bg-[#F0FFF4] border-[#D1FAE5] shadow-[0_10px_30px_-15px_rgba(40,180,99,0.2)] hover:shadow-[0_20px_40px_-15px_rgba(40,180,99,0.35)]' : 'bg-white border-gray-100'}`}>
            {/* Premium Compatibility Badge - Only for Garage Matches */}
            {isRecommended && (
                <div className="absolute top-3 left-3 z-30 bg-gradient-to-r from-[#059669] to-[#10b981] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-500">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-Cairo leading-none">متوافق مع سيارتك</span>
                </div>
            )}
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

                {/* Status Badges - Premium Minimal */}
                <div className={`absolute z-20 flex flex-col gap-2 ${isCompact ? 'top-1.5 right-1.5 scale-75' : 'top-3 right-3'}`}>
                    <div className="flex items-center justify-center min-w-[70px] px-2.5 py-1.5 rounded-md bg-[#10b981] shadow-sm">
                        <span className="text-[10px] text-white font-black uppercase tracking-widest font-Cairo leading-none">
                            {i18n.language === 'ar' ? 'أصلي' : 'ORIGINAL'}
                        </span>
                    </div>
                </div>

                {hasSale && (
                    <div className={`absolute z-20 ${isCompact ? 'top-1.5 left-1.5 scale-75 origin-top-left' : 'top-3 left-3'}`}>
                        <div className="bg-[#FF8C00] flex items-center justify-center px-2 py-1.5 rounded-sm shadow-md">
                            <span className="text-[#000000] text-[10px] uppercase font-black italic font-Cairo leading-none">
                                {t('hotSale')}
                            </span>
                        </div>
                    </div>
                )}


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
                            className={`text-[#1A1A1A] font-extrabold leading-tight line-clamp-2 uppercase transition-colors overflow-hidden text-ellipsis ${isCompact ? 'text-[15px]' : 'text-xl'}`}
                            style={{ fontFamily: 'var(--font-commercial)' }}
                        >
                            {i18n.language === 'en' ? (product.nameEn || product.name) : product.name}
                        </h3>
                    </Link>

                    {/* DETAILS GRID - Simplified in compact mode */}
                    <div className={`grid grid-cols-2 gap-x-1 gap-y-1.5 border-b border-gray-100 ${isCompact ? 'pb-1.5' : 'pb-2'}`}>
                        {/* Always show Brand */}
                        <div className="flex flex-col items-end overflow-hidden text-right">
                            <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                {i18n.language === 'ar' ? 'البراند' : 'Brand'}
                            </span>
                            <span className={`${isCompact ? 'text-xs' : 'text-sm'} leading-tight text-[#000000] font-black font-Cairo truncate w-full`}>
                                {i18n.language === 'en'
                                    ? (product.brandEn || product.partBrand || product.brand)
                                    : (product.partBrand || product.brand || 'No Brand')}
                            </span>
                        </div>

                        {/* Always show Model & Year */}
                        <div className="flex flex-col items-end overflow-hidden text-right">
                            <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                {i18n.language === 'ar' ? 'الموديل' : 'Model'}
                            </span>
                            <div className="flex flex-col items-end w-full">
                                <span className={`${isCompact ? 'text-xs' : 'text-sm'} leading-tight text-[#000000] font-black font-Cairo w-full truncate`} title={product.carModel || `${product.make} ${product.model}`}>
                                    {product.carModel || `${product.make} ${product.model}` || 'Universal'}
                                </span>
                                {(product.yearRange || product.yearStart || product.yearEnd) && (
                                    <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} leading-tight text-[#000000] font-bold font-Cairo mt-0.5 truncate w-full`}>
                                        {product.yearRange ||
                                            (product.yearStart && product.yearEnd ? `${product.yearStart}-${product.yearEnd}` :
                                                product.yearStart || product.yearEnd || '')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Origin */}
                        <div className="flex flex-col items-end overflow-hidden text-right">
                            <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                {i18n.language === 'ar' ? 'المنشأ' : 'Origin'}
                            </span>
                            <span className={`${isCompact ? 'text-xs' : 'text-sm'} leading-tight text-[#333] font-black italic font-Cairo truncate w-full`}>
                                {product.origin || product.countryOfOrigin || 'Imported'}
                            </span>
                        </div>

                        {/* Category */}
                        {product.category && (
                            <div className="flex flex-col items-end overflow-hidden text-right">
                                <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} leading-tight text-gray-400 font-bold uppercase tracking-wider truncate w-full`}>
                                    {i18n.language === 'ar' ? 'الفئة' : 'Category'}
                                </span>
                                <span className={`${isCompact ? 'text-xs' : 'text-sm'} leading-tight text-[#333] font-black font-Cairo truncate w-full`}>
                                    {product.category}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`mt-auto flex flex-col ${isCompact ? 'gap-2 pt-2' : 'gap-3 pt-3'} border-t border-gray-100`}>
                    <div className={`flex items-center justify-between ${isCompact ? 'flex-row' : 'flex-col 2xs:flex-row'} gap-2`}>
                        <div className={`flex flex-col ${isCompact ? 'items-start' : 'items-center 2xs:items-start'}`}>
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

                        {/* QUANTITY SELECTOR - Smaller in compact */}
                        <div className={`flex items-center bg-[#000000] rounded-lg p-0.5 shadow-md ${isCompact ? 'scale-95' : ''}`}>
                            <button onClick={decrementQuantity} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-white hover:text-brand-green transition-colors">
                                <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                            <span className="w-5 text-center text-xs md:text-sm font-black text-white">{quantity}</span>
                            <button onClick={incrementQuantity} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-white hover:text-brand-green transition-colors">
                                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className={`w-full ${isCompact ? 'py-2.5' : 'py-4'} rounded-xl bg-[#28B463] hover:bg-[#219653] text-white font-black uppercase tracking-widest italic font-Cairo transition-all active:scale-[0.98] shadow-lg shadow-[#28B463]/20 flex items-center justify-center gap-2 group/btn ${isCompact ? 'text-[11px]' : 'text-sm'}`}
                    >
                        <ShoppingCart className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} transition-transform group-hover/btn:translate-x-1`} />
                        <span>{i18n.language === 'ar' ? 'أضف' : (isCompact ? 'ADD' : 'ADD TO CART')}</span>
                    </button>
                </div>
            </div>
        </article>
    );
};

export default memo(ProductCard);
