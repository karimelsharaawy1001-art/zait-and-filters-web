import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {
    const { t } = useTranslation();
    const { addToCart } = useCart();

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product);
        toast.success(t('addedToCart'));
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
                        HOT SALE
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
                        {product.name}
                    </h3>
                </Link>

                {(product.partBrand || product.brand) && (
                    <div className="flex items-center gap-1.5 mb-2 mt-auto">
                        <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium uppercase tracking-wide">Brand:</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{product.partBrand || product.brand}</span>
                    </div>
                )}

                {/* Price and Cart Action */}
                <div className="mt-2 sm:mt-4 flex items-center justify-between pt-2 sm:pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                        {hasSale ? (
                            <>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 line-through">
                                    {product.price} EGP
                                </span>
                                <span className="text-base sm:text-lg font-black text-red-600">
                                    {product.salePrice} <span className="text-[9px] sm:text-[10px] font-normal italic">EGP</span>
                                </span>
                            </>
                        ) : (
                            <span className="text-base sm:text-lg font-bold text-gray-900">
                                {product.price} <span className="text-[9px] sm:text-[10px] font-normal text-gray-500 italic">EGP</span>
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className="bg-orange-600 hover:bg-orange-700 text-white p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all shadow-lg shadow-orange-100 hover:shadow-orange-200 active:scale-95 group/btn"
                        title={t('addToCart')}
                    >
                        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 group-hover/btn:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
