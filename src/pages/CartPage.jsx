import React from 'react';
import { Link } from 'react-router-dom';
import { useSafeNavigation } from '../utils/safeNavigation';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { getOptimizedImage } from '../utils/cloudinaryUtils';
import SEO from '../components/SEO';

const CartPage = () => {
    const { cartItems, setCartItems, updateQuantity, removeFromCart, getCartTotal, getEffectivePrice } = useCart();
    const { searchParams } = useSafeNavigation();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    React.useEffect(() => {
        const recoverId = searchParams.get('recover');
        if (recoverId) {
            const recoverCart = async () => {
                try {
                    const cartSnap = await getDoc(doc(db, 'abandoned_carts', recoverId));
                    if (cartSnap.exists()) {
                        const data = cartSnap.data();
                        if (data.recovered) {
                            toast.success(isAr ? 'تم استرجاع السلة مسبقاً' : 'Cart already recovered');
                            return;
                        }

                        setCartItems(data.items);
                        await updateDoc(doc(db, 'abandoned_carts', recoverId), {
                            recovered: true,
                            recoveredAt: new Date()
                        });
                        toast.success(isAr ? 'تم استرجاع منتجاتك بنجاح! كمل دلوقتي' : 'Products recovered successfully! Continue now');
                    }
                } catch (err) {
                    console.error("Error recovering cart:", err);
                    toast.error(isAr ? 'فشل استرجاع السلة' : 'Failed to recover cart');
                }
            };
            recoverCart();
        }
    }, [searchParams, setCartItems, isAr]);

    if (cartItems.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('cartEmpty')}</h2>
                <p className="text-gray-600 mb-8">{t('cartEmptyDesc')}</p>
                <Link to="/" className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-md transition-colors">
                    {t('shopNow')}
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-10">
            <SEO
                title={`${t('cartTitle')} | Zait & Filters`}
                description={t('cartTitle')}
                url={window.location.origin + window.location.pathname}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('cartTitle')}</h1>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Cart Items List */}
                    <div className="lg:w-2/3">
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <ul className="divide-y divide-gray-200">
                                {cartItems.map((item) => (
                                    <li key={item.id} className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                        <img
                                            src={getOptimizedImage(item.image, 'f_auto,q_auto,w_200')}
                                            alt={`${isAr ? item.name : (item.nameEn || item.name)} - ${isAr ? (item.partBrand || item.brand || '') : (item.brandEn || item.partBrand || item.brand || '')}`}
                                            className="w-24 h-24 object-cover rounded-md border border-gray-200"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/placeholder.png';
                                            }}
                                        />
                                        <div className={`flex-1 text-center sm:${isAr ? 'text-right' : 'text-left'}`}>
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                                                {isAr ? item.name : (item.nameEn || item.name)}
                                            </h3>

                                            {/* Compact Spec List */}
                                            <div className="space-y-0.5 mb-3">
                                                <p className="text-xs text-gray-600 font-medium">
                                                    <span className="font-semibold text-gray-400 uppercase text-[10px]">{t('carLabel')}:</span> {item.make} {item.model} {item.yearRange ? `(${item.yearRange})` : ''}
                                                </p>
                                                <p className="text-xs text-gray-600 font-medium">
                                                    <span className="font-semibold text-gray-400 uppercase text-[10px]">{t('brand')}:</span> {isAr ? (item.partBrand || item.brand) : (item.brandEn || item.partBrand || item.brand)} | <span className="font-semibold text-gray-400 uppercase text-[10px]">{t('originLabel')}:</span> {item.countryOfOrigin || item.country}
                                                </p>
                                                {(item.subcategory || item.subCategory) && (
                                                    <p className="text-xs text-gray-600 font-medium">
                                                        <span className="font-semibold text-gray-400 uppercase text-[10px]">{t('typeLabel')}:</span> {item.subcategory || item.subCategory}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Quantity Selector */}
                                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                                <span className="text-xs font-semibold text-gray-400 uppercase">{t('quantityLabel')}:</span>
                                                <div className="flex items-center border-2 border-[#008a40] rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-8 h-8 flex items-center justify-center bg-[#008a40] hover:bg-[#006d33] text-white transition-colors active:scale-95"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-12 text-center font-bold text-sm text-gray-900">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-8 h-8 flex items-center justify-center bg-[#008a40] hover:bg-[#006d33] text-white transition-colors active:scale-95"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`flex flex-col items-center sm:${isAr ? 'items-start' : 'items-end'} gap-2`}>
                                            <span className="text-lg font-bold text-gray-900">{getEffectivePrice(item) * item.quantity} {t('currency')}</span>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-red-500 hover:text-red-700 text-sm flex items-center mt-2"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" /> {t('remove')}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:w-1/3">
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">{t('orderSummary')}</h2>
                            <div className="flex justify-between mb-2 text-gray-600">
                                <span>{t('subtotal')}</span>
                                <span>{getCartTotal()} {t('currency')}</span>
                            </div>
                            <div className="flex justify-between mb-4 text-gray-600">
                                <span>{t('shipping')}</span>
                                <span>{t('shippingCalc')}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-4 flex justify-between mb-6">
                                <span className="text-xl font-bold text-gray-900">{t('total')}</span>
                                <span className="text-xl font-bold text-orange-600">{getCartTotal()} {t('currency')}</span>
                            </div>
                            <Link to="/checkout" className="w-full block text-center bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-md transition-colors text-lg">
                                {t('checkout')}
                            </Link>
                            <Link to="/" className="w-full block mt-3 text-center text-sm text-gray-500 hover:text-gray-900">
                                {t('continueShopping')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
