import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getOptimizedImage } from '../utils/cloudinaryUtils';

const ProductCard = ({ product }) => {
    const { t, i18n } = useTranslation();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);

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
        <div className="product-card group relative flex flex-col !gap-0 !space-y-0 !justify-start bg-white rounded-premium shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:translate-y-[-5px] w-full max-w-[320px] mx-auto h-full">
            {/* HERO IMAGE - Fixed Aspect Ratio to prevent collapse */}
            <Link
                to={`/product/${product.id}`}
                className="relative bg-gray-50 block w-full aspect-square overflow-hidden"
            >
                <img
                    src={getOptimizedImage(product.image, 'f_auto,q_auto,w_800')}
                    alt={product.name}
                    className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.png';
                    }}
                />

                {/* Status Badges - Premium Minimal */}
                <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                    <div className="flex items-center justify-center min-w-[70px] px-2.5 py-1.5 rounded-md bg-[#10b981] shadow-sm">
                        <span className="text-[10px] text-white font-black uppercase tracking-widest font-Cairo leading-none">
                            {i18n.language === 'ar' ? 'أصلي' : 'ORIGINAL'}
                        </span>
                    </div>
                </div>

                {hasSale && (
                    <div className="absolute top-3 left-3 z-20">
                        <div className="bg-[#FF8C00] flex items-center justify-center px-2 py-1.5 rounded-sm shadow-md">
                            <span className="text-[#000000] text-[10px] uppercase font-black italic font-Cairo leading-none">
                                {t('hotSale')}
                            </span>
                        </div>
                    </div>
                )}
            </Link>

            {/* CONTENT HUB - Zero Gap Typography */}
            <div className="p-4 flex flex-col flex-1 gap-3 !mt-[-1px] !pt-0">
                <div className="flex flex-col gap-2 text-right">
                    {/* PRODUCT NAME */}
                    <Link to={`/product/${product.id}`} className="block overflow-hidden">
                        <h3
                            className="text-[#000000] text-sm md:text-md font-bold leading-tight line-clamp-2 uppercase transition-colors overflow-hidden text-ellipsis"
                            style={{ fontFamily: 'var(--font-commercial)' }}
                        >
                            {i18n.language === 'en' ? (product.nameEn || product.name) : product.name}
                        </h3>
                    </Link>

                    {/* DETAILS GRID - Brand, Origin, Category, Subcategory */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 border-b border-gray-100 pb-3">
                        {/* Category */}
                        {product.category && (
                            <div className="flex flex-col items-start overflow-hidden">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5 truncate w-full">
                                    {i18n.language === 'ar' ? 'الفئة' : 'Category'}
                                </span>
                                <span className="text-sm text-[#333] font-black font-Cairo truncate w-full">
                                    {product.category}
                                </span>
                            </div>
                        )}

                        {/* Subcategory */}
                        {product.subcategory && (
                            <div className="flex flex-col items-end overflow-hidden">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5 truncate w-full text-right">
                                    {i18n.language === 'ar' ? 'الفئة الفرعية' : 'Sub-Category'}
                                </span>
                                <span className="text-sm text-[#000000] font-black font-Cairo truncate w-full text-right">
                                    {product.subcategory}
                                </span>
                            </div>
                        )}

                        {/* Origin */}
                        <div className="flex flex-col items-start overflow-hidden">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5 truncate w-full">
                                {i18n.language === 'ar' ? 'المنشأ' : 'Origin'}
                            </span>
                            <span className="text-sm text-[#333] font-black italic font-Cairo truncate w-full">
                                {product.origin || product.countryOfOrigin || 'Imported'}
                            </span>
                        </div>

                        {/* Brand */}
                        <div className="flex flex-col items-end overflow-hidden">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5 truncate w-full text-right">
                                {i18n.language === 'ar' ? 'البراند' : 'Brand'}
                            </span>
                            <span className="text-sm text-[#000000] font-black font-Cairo truncate w-full text-right">
                                {i18n.language === 'en'
                                    ? (product.brandEn || product.partBrand || product.brand)
                                    : (product.partBrand || product.brand || 'No Brand')}
                            </span>
                        </div>

                        {/* Model with Year */}
                        <div className="col-span-2 flex flex-col items-end overflow-hidden">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5 truncate w-full text-right">
                                {i18n.language === 'ar' ? 'الموديل' : 'Model'}
                            </span>
                            <span className="text-sm text-[#000000] font-black font-Cairo w-full text-right truncate" title={product.carModel || `${product.make} ${product.model}`}>
                                {product.carModel || `${product.make} ${product.model}` || 'Universal'}
                                {(product.yearRange || product.yearStart || product.yearEnd) && (
                                    <span className="text-xs text-gray-500 font-bold ml-2">
                                        {product.yearRange ||
                                            (product.yearStart && product.yearEnd ? `${product.yearStart}-${product.yearEnd}` :
                                                product.yearStart || product.yearEnd || '')}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* PRICING & ACTION - Racing Red Dominance */}
                <div className="mt-auto flex flex-col gap-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-col 2xs:flex-row items-center justify-between gap-3">
                        <div className="flex flex-col items-center 2xs:items-start">
                            {hasSale && (
                                <span className="text-[10px] text-gray-400 line-through font-bold leading-none mb-1">
                                    {product.price} {t('currency')}
                                </span>
                            )}
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl md:text-3xl font-black text-[#1A1A1A] font-Cairo leading-none drop-shadow-sm">
                                    {hasSale ? product.salePrice : product.price}
                                </span>
                                <span className="text-xs md:text-sm font-black text-[#000000] uppercase tracking-tighter">{t('currency')}</span>
                            </div>
                        </div>

                        {/* QUANTITY SELECTOR - Solid Black Contrast */}
                        <div className="flex items-center bg-[#000000] rounded-lg p-0.5 shadow-md">
                            <button onClick={decrementQuantity} className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-white hover:text-brand-green transition-colors">
                                <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                            <span className="w-5 text-center text-xs md:text-sm font-black text-white">{quantity}</span>
                            <button onClick={incrementQuantity} className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-white hover:text-brand-green transition-colors">
                                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className="w-full py-4 rounded-xl bg-[#28B463] hover:bg-[#219653] text-white font-black text-sm uppercase tracking-widest italic font-Cairo transition-all active:scale-[0.98] shadow-lg shadow-[#28B463]/20 flex items-center justify-center gap-3 group/btn"
                    >
                        <ShoppingCart className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        <span>{i18n.language === 'ar' ? 'أضف للسلة' : 'ADD TO CART'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;




