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
            {/* HERO IMAGE - Fixed 250px Height */}
            <Link
                to={`/product/${product.id}`}
                className="relative bg-gray-50 block w-full h-auto mb-0 p-0"
            >
                <img
                    src={getOptimizedImage(product.image, 'f_auto,q_auto,w_800')}
                    alt={product.name}
                    className="w-full h-auto object-cover block transition-transform duration-500 group-hover:scale-105"
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
                        <div className="bg-racing-red flex items-center justify-center px-2 py-1.5 rounded-sm shadow-md">
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
                    <Link to={`/product/${product.id}`} className="block">
                        <h3 className="text-[#000000] text-sm font-black leading-tight line-clamp-2 uppercase font-Cairo transition-colors">
                            {i18n.language === 'en' ? (product.nameEn || product.name) : product.name}
                        </h3>
                    </Link>

                    {/* BRAND & ORIGIN ROW - Side by Side */}
                    <div className="flex flex-row justify-between items-end w-full border-b border-gray-100 pb-2">
                        {/* Origin - Left Side */}
                        <div className="flex flex-col items-start">
                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                                {i18n.language === 'ar' ? 'المنشأ' : 'Origin'}
                            </span>
                            <span className="text-[11px] text-[#000000] font-black italic font-Cairo">
                                {product.origin || product.countryOfOrigin || 'Imported'}
                            </span>
                        </div>

                        {/* Brand - Right Side */}
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                                {i18n.language === 'ar' ? 'البراند' : 'Brand'}
                            </span>
                            <span className="text-[13px] text-[#000000] font-black font-Cairo">
                                {i18n.language === 'en'
                                    ? (product.brandEn || product.partBrand || product.brand)
                                    : (product.partBrand || product.brand || 'No Brand')}
                            </span>
                        </div>
                    </div>

                    {/* MODEL ROW - Full Width */}
                    <div className="flex flex-col items-end w-full border-b border-gray-100 pb-2">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                            {i18n.language === 'ar' ? 'الموديل' : 'Model'}
                        </span>
                        <span className="text-[12px] text-[#000000] font-black font-Cairo w-full text-right" title={product.carModel || `${product.make} ${product.model}`}>
                            {product.carModel || `${product.make} ${product.model}` || 'Universal'}
                        </span>
                    </div>
                </div>

                {/* PRICING & ACTION - Racing Red Dominance */}
                <div className="mt-auto flex flex-col gap-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            {hasSale && (
                                <span className="text-[10px] text-gray-400 line-through font-bold leading-none mb-1">
                                    {product.price} {t('currency')}
                                </span>
                            )}
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-[#e31e24] font-Cairo leading-none drop-shadow-sm">
                                    {hasSale ? product.salePrice : product.price}
                                </span>
                                <span className="text-sm font-black text-[#000000] uppercase tracking-tighter">{t('currency')}</span>
                            </div>
                        </div>

                        {/* QUANTITY SELECTOR - Solid Black Contrast */}
                        <div className="flex items-center bg-[#000000] rounded-lg p-1 self-center shadow-lg">
                            <button onClick={decrementQuantity} className="w-8 h-8 flex items-center justify-center text-white hover:text-racing-red transition-colors">
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-6 text-center text-sm font-black text-white">{quantity}</span>
                            <button onClick={incrementQuantity} className="w-8 h-8 flex items-center justify-center text-white hover:text-racing-red transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className="w-full py-4 rounded-xl bg-[#e31e24] hover:bg-[#b8181d] text-white font-black text-sm uppercase tracking-widest italic font-Cairo transition-all active:scale-[0.98] shadow-lg shadow-racing-red/20 flex items-center justify-center gap-3 group/btn"
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




