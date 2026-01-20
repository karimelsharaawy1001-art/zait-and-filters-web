import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

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
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col group relative border border-gray-100 h-full">
            {/* Image Container */}
            <Link to={`/product/${product.id}`} className="relative h-40 sm:h-48 bg-gray-100 overflow-hidden block">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain sm:object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Category Badge */}
                {(product.subCategory || product.category) && (
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] uppercase font-bold px-2 py-1 rounded backdrop-blur-sm tracking-wider z-10">
                        {product.subCategory || product.category}
                    </span>
                )}

                {/* Hot Sale Badge */}
                {hasSale && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] sm:text-[10px] uppercase font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg tracking-widest animate-pulse z-10 border border-white">
                        {t('hotSale')}
                    </span>
                )}
            </Link>

            {/* Content Container */}
            <div className="p-4 flex-1 flex flex-col">
                {/* Vehicle Compatibility info */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    {product.make && (
                        <p className="text-[10px] text-orange-600 font-bold uppercase tracking-tight bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                            {product.make} {product.model} {product.yearRange ? `(${product.yearRange})` : (product.yearStart && product.yearEnd ? `(${product.yearStart}-${product.yearEnd})` : '')}
                        </p>
                    )}
                    {product.countryOfOrigin && (
                        <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">
                            {product.countryOfOrigin}
                        </span>
                    )}
                    {product.viscosity && (
                        <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-100 uppercase">
                            {product.viscosity}
                        </span>
                    )}
                </div>

                <Link to={`/product/${product.id}`}>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 leading-tight group-hover:text-orange-600 transition-all line-clamp-2">
                        {i18n.language === 'en' ? (product.nameEn || product.name) : product.name}
                    </h3>
                </Link>

                <div className="flex items-center gap-1.5 mb-2 mt-auto">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium uppercase tracking-wide">{t('brand')}:</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                        {i18n.language === 'en'
                            ? (product.brandEn || product.partBrand || product.brand)
                            : (product.partBrand || product.brand)}
                    </span>
                </div>

                {/* Price */}
                <div className="mt-2 flex flex-col border-t border-gray-50 pt-2">
                    <div className="flex flex-col mb-3">
                        {hasSale ? (
                            <>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 line-through">
                                    {product.price} {t('currency')}
                                </span>
                                <span className="text-base sm:text-lg font-black text-red-600">
                                    {product.salePrice} <span className="text-[9px] sm:text-[10px] font-normal italic">{t('currency')}</span>
                                </span>
                            </>
                        ) : (
                            <span className="text-base sm:text-lg font-bold text-gray-900">
                                {product.price} <span className="text-[9px] sm:text-[10px] font-normal text-gray-500 italic">{t('currency')}</span>
                            </span>
                        )}
                    </div>

                    {/* Quantity Selector and Add to Cart */}
                    <div className="flex items-center gap-2">
                        {/* Quantity Selector */}
                        <div className="flex items-center border-2 border-[#008a40] rounded-lg overflow-hidden">
                            <button
                                onClick={decrementQuantity}
                                className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-[#008a40] hover:bg-[#006d33] text-white transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={quantity <= 1}
                            >
                                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <span className="w-10 sm:w-12 text-center font-bold text-sm sm:text-base text-gray-900">
                                {quantity}
                            </span>
                            <button
                                onClick={incrementQuantity}
                                className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-[#008a40] hover:bg-[#006d33] text-white transition-colors active:scale-95"
                            >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            onClick={handleAddToCart}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 sm:py-2.5 px-3 rounded-lg transition-all shadow-lg shadow-orange-100 hover:shadow-orange-200 active:scale-95 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm"
                            title={t('addToCart')}
                        >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('addToCart')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
