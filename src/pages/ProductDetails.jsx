import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSafeNavigation } from '../utils/safeNavigation';
import { databases, storage, account } from '../appwrite';
import { Query, ID } from 'appwrite';
import {
    ShoppingCart,
    ArrowLeft,
    ShieldCheck,
    Truck,
    RotateCcw,
    Loader2,
    Star,
    Camera,
    X,
    MessageSquare,
    CheckCircle2,
    Clock,
    UserCircle2,
    Tag,
    Globe,
    Box,
    Car
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import RelatedProducts from '../components/RelatedProducts';
import TrustPaymentSection from '../components/TrustPaymentSection';
import InstallmentBar from '../components/InstallmentBar';
import OptimizedImage from '../components/OptimizedImage';
import { getOptimizedImage } from '../utils/cloudinaryUtils';
import { generateProductDescription, formatWarranty } from '../utils/productUtils';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { useStaticData } from '../context/StaticDataContext';

const ProductDetails = () => {
    const { id } = useParams();
    const { navigate } = useSafeNavigation();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language && i18n.language.startsWith('ar');
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const { staticProducts, isStaticLoaded } = useStaticData();
    const { user } = useAuth();

    // Appwrite IDs
    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID;
    const REVIEWS_COLLECTION = 'reviews'; // Needs to be added to ENV/Project
    const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;

    // Review States
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [expandedImage, setExpandedImage] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchProduct = async () => {
            setLoading(true);
            try {
                // 1. Try static first (Zero-Cost strategy)
                if (isStaticLoaded) {
                    const staticMatch = staticProducts.find(p => p.id === id);
                    if (staticMatch) {
                        setProduct(staticMatch);
                        setLoading(false);
                        return;
                    }
                }

                // 2. Try Appwrite
                if (DATABASE_ID && PRODUCTS_COLLECTION) {
                    try {
                        const doc = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, id);
                        setProduct({ id: doc.$id, ...doc });
                    } catch (err) {
                        toast.error('Product not found in our catalog.');
                        navigate('/shop');
                    }
                }
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error('Sync error. Try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id, navigate, isStaticLoaded, staticProducts, DATABASE_ID, PRODUCTS_COLLECTION]);

    // Fetch Approved Reviews
    useEffect(() => {
        const fetchReviews = async () => {
            if (!DATABASE_ID) return;
            try {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    REVIEWS_COLLECTION,
                    [
                        Query.equal('productId', id),
                        Query.equal('status', 'approved'),
                        Query.orderDesc('$createdAt')
                    ]
                );
                setReviews(response.documents.map(d => ({ id: d.$id, ...d })));
            } catch (err) {
                console.warn("Reviews fetching skipped (Collection not ready yet)");
            }
        };

        fetchReviews();
        // Note: Appwrite has Realtime support, but keeping it simple with fetch for now
    }, [id, DATABASE_ID]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            toast.error(t('loginToReview'));
            navigate('/login');
            return;
        }

        if (!comment.trim()) {
            toast.error(t('commentRequired'));
            return;
        }

        setIsSubmittingReview(true);
        try {
            let photoUrl = '';
            if (photo && BUCKET_ID) {
                const file = await storage.createFile(BUCKET_ID, ID.unique(), photo);
                photoUrl = storage.getFileView(BUCKET_ID, file.$id);
            }

            if (DATABASE_ID) {
                await databases.createDocument(DATABASE_ID, REVIEWS_COLLECTION, ID.unique(), {
                    productId: id,
                    productName: product.name,
                    userId: user.$id,
                    userName: user.name || user.email.split('@')[0],
                    rating,
                    comment,
                    photoUrl,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }

            toast.success(t('reviewSuccess'));

            // Reset form
            setRating(5);
            setComment('');
            setPhoto(null);
            setPhotoPreview(null);
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.error(t('reviewError'));
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleAddToCart = () => {
        addToCart({ ...product, quantity });
        toast.success(t('addedToCart'));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
            </div>
        );
    }

    if (!product) return null;

    const hasSale = product.salePrice && Number(product.salePrice) < Number(product.price);

    // Expert SEO Meta Description Templates
    const arMetaTemplate = `اشتري ${product.name} الأصلي لموديل ${product.model || ''} بضمان زيت اند فلترز. توصيل سريع لكل محافظات مصر.`;
    const enMetaTemplate = `Buy original ${product.nameEn || product.name} for ${product.make || ''} ${product.model || ''} from Zait & Filters. Fast delivery across Egypt.`;

    const displayDescription = isAr ? arMetaTemplate : enMetaTemplate;

    const combinedSchema = [{
        '@context': 'https://schema.org/',
        '@type': 'Product',
        'name': isAr ? product.name : (product.nameEn || product.name),
        'image': product.imageUrl || product.image || 'https://zait-and-filters-web.vercel.app/logo.png',
        'description': displayDescription,
        'brand': {
            '@type': 'Brand',
            'name': isAr ? (product.partBrand || product.brand || 'زيت اند فلترز') : (product.brandEn || product.partBrand || product.brand || 'Zait & Filters')
        },
        'offers': {
            '@type': 'Offer',
            'url': window.location.href,
            'priceCurrency': 'EGP',
            'price': product.salePrice || product.price || '0',
            'availability': 'https://schema.org/InStock',
            'seller': { '@type': 'Organization', 'name': 'Zait & Filters' }
        }
    }];

    return (
        <div className="bg-white min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
            <SEO
                title={`${isAr ? product.name : (product.nameEn || product.name)} | Zait & Filters`}
                description={displayDescription}
                keywords={`${product.category}, ${product.make || ''}, ${product.model || ''}, ${product.partBrand || ''}`}
                image={product.imageUrl || product.image || 'https://zait-and-filters-web.vercel.app/logo.png'}
                url={window.location.href}
                type="product"
                schema={combinedSchema}
            />
            <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
                <Breadcrumbs extraSteps={[
                    { name: product.category, path: `/shop?category=${encodeURIComponent(product.category)}` },
                    { name: isAr ? product.name : (product.nameEn || product.name), path: `/product/${product.id}` }
                ]} />

                <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 group">
                    <ArrowLeft className={`h-5 w-5 ${isAr ? 'ml-2 rotate-180' : 'mr-2'} group-hover:translate-x-${isAr ? '1' : '-1'} transition-transform`} />
                    {t('back')}
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                    <div className="relative rounded-3xl overflow-hidden bg-gray-50 aspect-square border border-gray-100 shadow-sm group">
                        <OptimizedImage
                            src={product.image}
                            alt={isAr ? product.name : product.nameEn}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            width={1000}
                        />
                        {hasSale && (
                            <span className="absolute top-6 left-6 bg-[#FF8C00] text-white text-xs font-black px-4 py-2 rounded-full shadow-xl animate-pulse">
                                {t('sale')}
                            </span>
                        )}
                    </div>

                    <div className={`flex flex-col ${isAr ? 'text-right' : 'text-left'}`}>
                        <div className="mb-6">
                            <p className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2">{product.category}</p>
                            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4" style={{ fontFamily: 'var(--font-commercial)' }}>
                                {isAr ? product.name : (product.nameEn || product.name)}
                            </h1>

                            <div className="flex flex-wrap gap-3 mb-6">
                                {product.brand && (
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                        {t('brand')}: {isAr ? (product.partBrand || product.brand) : (product.brandEn || product.brand)}
                                    </span>
                                )}
                                {product.warranty && (
                                    <span className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase border border-green-100">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {formatWarranty(product.warranty_months || product.warranty, i18n.language)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 font-bold">
                            <div className="flex items-end gap-3 mb-1">
                                {hasSale ? (
                                    <>
                                        <span className="text-3xl font-black text-[#1A1A1A]">{product.salePrice} <span className="text-sm font-normal">{t('currency')}</span></span>
                                        <span className="text-lg text-gray-400 line-through mb-1">{product.price} {t('currency')}</span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-black text-gray-900">{product.price} <span className="text-sm font-normal">{t('currency')}</span></span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium italic">{t('taxIncluded')}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex items-center bg-gray-100 rounded-xl px-4 py-2 border border-gray-200">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-500 hover:text-gray-900 text-xl font-bold w-8">-</button>
                                <span className="w-12 text-center font-bold text-gray-900">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="text-gray-500 hover:text-gray-900 text-xl font-bold w-8">+</button>
                            </div>
                            <button
                                onClick={handleAddToCart}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                <ShoppingCart className="h-6 w-6" />
                                {t('addToCart')}
                            </button>
                        </div>

                        <TrustPaymentSection />
                        <div className="mt-6">
                            <InstallmentBar price={hasSale ? product.salePrice : product.price} showCalculator={true} />
                        </div>
                    </div>
                </div>

                <RelatedProducts currentProduct={product} />

                {/* Reviews Section */}
                <div className="mt-12 border-t border-gray-100 pt-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                        <div className="lg:col-span-1">
                            <h3 className="text-2xl font-black text-gray-900 mb-2">{t('leaveReview')}</h3>
                            <form onSubmit={handleReviewSubmit} className="space-y-6 mt-8">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} type="button" onClick={() => setRating(star)} className="transition-transform active:scale-90">
                                            <Star className={`h-8 w-8 ${star <= rating ? 'fill-orange-500 text-orange-500' : 'text-gray-200'}`} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder={t('commentPlaceholder')}
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingReview}
                                    className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmittingReview ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MessageSquare className="h-5 w-5" /> {t('submitReview')}</>}
                                </button>
                            </form>
                        </div>

                        <div className="lg:col-span-2">
                            <h3 className="text-2xl font-black text-gray-900 mb-8">{t('customerReviews')} ({reviews.length})</h3>
                            {reviews.length === 0 ? (
                                <div className="bg-gray-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-100">
                                    <h4 className="text-xl font-black text-gray-900">{t('noReviewsYet')}</h4>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {reviews.map((rev) => (
                                        <div key={rev.id} className="bg-white rounded-3xl p-8 border border-gray-50 shadow-sm">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600"><UserCircle2 className="h-7 w-7" /></div>
                                                <div>
                                                    <h4 className="font-black text-gray-900">{rev.userName}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-3 w-3 ${s <= rev.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />)}</div>
                                                        <span className="text-[10px] font-bold text-gray-400 tracking-widest">{new Date(rev.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 font-medium italic">"{rev.comment}"</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default ProductDetails;
