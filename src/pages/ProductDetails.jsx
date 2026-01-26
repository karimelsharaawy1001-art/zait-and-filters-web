import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
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
    UserCircle2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';
import { auth, storage } from '../firebase';
import RelatedProducts from '../components/RelatedProducts';
import TrustPaymentSection from '../components/TrustPaymentSection';
import InstallmentBar from '../components/InstallmentBar';
import { getOptimizedImage } from '../utils/cloudinaryUtils';
import { generateProductDescription, formatWarranty } from '../utils/productUtils';
import SEO from '../components/SEO';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

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
                const docRef = doc(db, 'products', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error("No such product!");
                    navigate('/shop');
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id, navigate]);

    // Fetch Approved Reviews
    useEffect(() => {
        const q = query(
            collection(db, 'reviews'),
            where('productId', '==', id),
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReviews(reviewsList);
        });

        return () => unsubscribe();
    }, [id]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
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
            if (photo) {
                const storageRef = ref(storage, `review_photos/${crypto.randomUUID()}_${photo.name}`);
                const uploadResult = await uploadBytes(storageRef, photo);
                photoUrl = await getDownloadURL(uploadResult.ref);
            }

            await addDoc(collection(db, 'reviews'), {
                productId: id,
                productName: product.name,
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                rating,
                comment,
                photoUrl,
                status: 'pending',
                createdAt: serverTimestamp()
            });

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

    const autoDescription = generateProductDescription(product, i18n.language);
    const displayDescription = isAr ? (product.description || product.descriptionEn || autoDescription) : (product.descriptionEn || product.description || autoDescription);

    const productSchema = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        'name': isAr ? product.name : (product.nameEn || product.name),
        'image': product.imageUrl || product.images?.[0] || 'https://zait-and-filters-web.vercel.app/logo.png',
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
            'availability': product.isActive ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'seller': {
                '@type': 'Organization',
                'name': 'Zait & Filters'
            }
        }
    };

    return (
        <div className="bg-white min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
            <SEO
                title={`${isAr ? product.name : (product.nameEn || product.name)} | Zait & Filters`}
                description={displayDescription}
                keywords={`${product.category}, ${product.make || ''}, ${product.model || ''}, ${product.partBrand || ''}, قطع غيار سيارات`}
                image={product.imageUrl || product.images?.[0] || 'https://zait-and-filters-web.vercel.app/logo.png'}
                url={window.location.href}
                type="product"
                schema={productSchema}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Link */}
                <button
                    onClick={() => navigate(-1)}
                    className={`flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-8 group ${isAr ? 'flex-row-reverse' : ''}`}
                >
                    <ArrowLeft className={`h-5 w-5 ${isAr ? 'ml-2 rotate-180' : 'mr-2'} group-hover:translate-x-${isAr ? '1' : '-1'} transition-transform`} />
                    {t('back')}
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                    {/* Product Image */}
                    <div className="relative rounded-3xl overflow-hidden bg-gray-50 aspect-square group border border-gray-100 shadow-sm">
                        <img
                            src={getOptimizedImage(product.image, 'f_auto,q_auto,w_1000')}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder.png';
                            }}
                        />
                        {hasSale && (
                            <span className={`absolute top-6 ${isAr ? 'right-6' : 'left-6'} bg-[#FF8C00] text-white text-xs font-black px-4 py-2 rounded-full shadow-xl tracking-widest animate-pulse border-2 border-white`}>
                                {t('sale')}
                            </span>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className={`flex flex-col ${isAr ? 'text-right' : 'text-left'}`}>
                        <div className="mb-6">
                            <p className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2">
                                {product.category} {product.subcategory ? `> ${product.subcategory}` : ''}
                            </p>
                            <h1
                                className="text-4xl font-bold text-gray-900 leading-tight mb-4"
                                style={{ fontFamily: 'var(--font-commercial)' }}
                            >
                                {isAr ? product.name : (product.nameEn || product.name)}
                            </h1>

                            <div className={`flex flex-wrap gap-3 mb-6 ${isAr ? 'flex-row-reverse' : ''}`}>
                                {(product.partBrand || product.brand) && (
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {t('brand')}: {isAr ? (product.partBrand || product.brand) : (product.brandEn || product.partBrand || product.brand)}
                                    </span>
                                )}
                                {product.warranty_months && (
                                    <span className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border border-green-100">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {formatWarranty(product.warranty_months, i18n.language)}
                                    </span>
                                )}
                                {product.make && (
                                    <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-orange-100">
                                        {product.make} {product.model}
                                    </span>
                                )}
                                {product.countryOfOrigin && (
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-blue-100">
                                        {product.countryOfOrigin}
                                    </span>
                                )}
                            </div>

                            {/* PROMINENT AUTO-DESCRIPTION */}
                            <div className={`mb-6 p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 ${isAr ? 'text-right' : 'text-left'}`}>
                                <p className="text-sm font-bold text-gray-700 leading-relaxed italic font-Cairo">
                                    {displayDescription}
                                </p>
                            </div>
                        </div>

                        {/* Price Section */}
                        <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 font-bold">
                            <div className={`flex items-end gap-3 mb-1 ${isAr ? 'flex-row-reverse' : ''}`}>
                                {hasSale ? (
                                    <>
                                        <span className="text-3xl font-black text-[#1A1A1A]">
                                            {product.salePrice} <span className="text-sm font-normal">{t('currency')}</span>
                                        </span>
                                        <span className="text-lg text-gray-400 line-through mb-1">
                                            {product.price} {t('currency')}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-black text-gray-900">
                                        {product.price} <span className="text-sm font-normal">{t('currency')}</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium italic">{t('taxIncluded')}</p>
                        </div>

                        {/* Add to Cart Section */}
                        <div className={`flex flex-col sm:flex-row gap-4 mb-8 ${isAr ? 'flex-row-reverse' : ''}`}>
                            <div className="flex items-center bg-gray-100 rounded-xl px-4 py-2 border border-gray-200">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="text-gray-500 hover:text-gray-900 text-xl font-bold w-8"
                                >-</button>
                                <span className="w-12 text-center font-bold text-gray-900">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="text-gray-500 hover:text-gray-900 text-xl font-bold w-8"
                                >+</button>
                            </div>
                            <button
                                onClick={handleAddToCart}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-xl shadow-orange-100 hover:shadow-orange-200 flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <ShoppingCart className={`h-6 w-6 ${isAr ? 'ml-2' : ''}`} />
                                {t('addToCart')}
                            </button>
                        </div>

                        <TrustPaymentSection />

                        <div className="mt-8">
                            <InstallmentBar
                                price={hasSale ? product.salePrice : product.price}
                                showCalculator={true}
                            />
                        </div>


                        {/* Trust Badges */}
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 border-t border-gray-100 ${isAr ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                <Truck className="h-5 w-5 text-orange-600" />
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-tighter">{t('fastDelivery')}</span>
                            </div>
                            <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                <ShieldCheck className="h-5 w-5 text-orange-600" />
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-tighter">{t('genuinePart')}</span>
                            </div>
                            <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                <RotateCcw className="h-5 w-5 text-orange-600" />
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-tighter">{t('easyReturns')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-20 border-t border-gray-100 pt-16">
                    <h3 className={`text-2xl font-black text-gray-900 mb-8 ${isAr ? 'text-right' : 'text-left'}`}>{t('relatedProducts')}</h3>
                    <RelatedProducts currentProduct={product} />
                </div>

                {/* Review System Section */}
                <div className="mt-24 border-t border-gray-100 pt-16">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                        {/* Review Form */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24">
                                <h3 className={`text-2xl font-black text-gray-900 mb-2 ${isAr ? 'text-right' : 'text-left'}`}>{t('leaveReview')}</h3>
                                <p className={`text-gray-500 font-medium mb-8 ${isAr ? 'text-right' : 'text-left'}`}>{t('shareExperience')}</p>

                                <form onSubmit={handleReviewSubmit} className="space-y-6">
                                    <div className="space-y-3">
                                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest ${isAr ? 'text-right' : 'text-left'}`}>{t('ratingLabel')}</label>
                                        <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className="transition-transform active:scale-90"
                                                >
                                                    <Star
                                                        className={`h-8 w-8 ${star <= rating ? 'fill-orange-500 text-orange-500' : 'text-gray-200'}`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest ${isAr ? 'text-right' : 'text-left'}`}>{t('commentLabel')}</label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            rows={4}
                                            className={`w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300 ${isAr ? 'text-right' : 'text-left'}`}
                                            placeholder={t('commentPlaceholder')}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest ${isAr ? 'text-right' : 'text-left'}`}>{t('photoUpload')}</label>
                                        <div className={`flex flex-wrap gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                                            {photoPreview ? (
                                                <div className="relative h-24 w-24 rounded-2xl overflow-hidden group shadow-lg">
                                                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                                                        className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full text-red-500 hover:bg-white transition-all shadow-sm"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="h-24 w-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-orange-200 hover:text-orange-400 transition-all bg-gray-50 group">
                                                    <Camera className="h-6 w-6 mb-1 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('uploadButton')}</span>
                                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingReview}
                                        className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                                    >
                                        {isSubmittingReview ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <MessageSquare className={`h-5 w-5 ${isAr ? 'ml-2' : ''}`} />
                                                {t('submitReview')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Reviews List */}
                        <div className="lg:col-span-2">
                            <div className={`flex items-center justify-between mb-8 ${isAr ? 'flex-row-reverse' : ''}`}>
                                <h3 className={`text-2xl font-black text-gray-900 ${isAr ? 'text-right' : 'text-left'}`}>
                                    {t('customerReviews')}
                                    <span className={`${isAr ? 'mr-3' : 'ml-3'} text-sm font-bold text-gray-400`}>({reviews.length})</span>
                                </h3>
                            </div>

                            {reviews.length === 0 ? (
                                <div className="bg-gray-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                                    <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                                        <Star className="h-10 w-10 text-gray-200 fill-gray-200" />
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900">{t('noReviewsYet')}</h4>
                                    <p className="text-gray-500 mt-2 max-w-xs mx-auto">{t('beFirstDesc')}</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {Array.isArray(reviews) && reviews.map((rev) => (
                                        <div key={rev.id} className="bg-white rounded-3xl p-8 border border-gray-50 shadow-sm hover:shadow-md transition-shadow animate-in fade-in duration-500">
                                            <div className={`flex flex-col md:flex-row gap-6 ${isAr ? 'md:flex-row-reverse' : ''}`}>
                                                <div className="flex-1">
                                                    <div className={`flex items-center gap-4 mb-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                        <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                                                            <UserCircle2 className="h-7 w-7" />
                                                        </div>
                                                        <div className={isAr ? 'text-right' : 'text-left'}>
                                                            <div className={`flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                                <h4 className="font-black text-gray-900">{rev.userName}</h4>
                                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                            </div>
                                                            <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                                                                <div className={`flex ${isAr ? 'flex-row-reverse' : ''}`}>
                                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                                        <Star
                                                                            key={s}
                                                                            className={`h-3 w-3 ${s <= rev.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {rev.createdAt?.toDate().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className={`text-gray-600 font-medium leading-relaxed italic ${isAr ? 'text-right' : 'text-left'}`}>
                                                        "{rev.comment}"
                                                    </p>
                                                </div>

                                                {rev.photoUrl && (
                                                    <div
                                                        className="w-full md:w-40 h-40 flex-shrink-0 cursor-pointer group"
                                                        onClick={() => setExpandedImage(rev.photoUrl)}
                                                    >
                                                        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl shadow-gray-200 ring-4 ring-white transition-transform duration-300 group-hover:scale-[1.02]">
                                                            <img src={rev.photoUrl} alt="Review" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Camera className="h-6 w-6 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* Image Expansion Modal */}
                {expandedImage && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"
                        onClick={() => setExpandedImage(null)}
                    >
                        <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
                            <img src={expandedImage} alt="Expanded Review" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" />
                            <button className={`absolute -top-12 ${isAr ? 'left-0' : 'right-0'} text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full`}>
                                <X className="h-8 w-8" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetails;
