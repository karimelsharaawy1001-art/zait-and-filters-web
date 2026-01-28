import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from 'react-i18next';
import { Calendar, User, ArrowLeft, Loader2, Clock, Share2, Tag } from 'lucide-react';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { getOptimizedImage } from '../utils/cloudinaryUtils';
import RelatedProducts from '../components/RelatedProducts';
import { toast } from 'react-hot-toast';

const BlogPostPage = () => {
    const { id: slugOrId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            try {
                // 1. Try fetching by slug
                const q = query(collection(db, 'blog_posts'), where('slug', '==', slugOrId), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    setPost({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
                } else {
                    // 2. Fallback to fetching by ID
                    const docRef = doc(db, 'blog_posts', slugOrId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setPost({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        toast.error("Article not found");
                        navigate('/blog');
                    }
                }
            } catch (error) {
                console.error("Error fetching blog post:", error);
                navigate('/blog');
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
        window.scrollTo(0, 0);
    }, [slugOrId, navigate]);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: isAr ? post.title : post.titleEn,
                text: isAr ? post.excerpt : post.excerptEn,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success(isAr ? 'تم نسخ الرابط' : 'Link copied to clipboard');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
            </div>
        );
    }

    if (!post) return null;

    const title = isAr ? post.title : post.titleEn;
    const content = isAr ? post.content : post.contentEn;
    const excerpt = isAr ? post.excerpt : post.excerptEn;

    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": excerpt,
        "image": post.image,
        "author": {
            "@type": "Organization",
            "name": "Zait & Filters",
            "url": "https://zait-and-filters-web.vercel.app"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Zait & Filters",
            "logo": {
                "@type": "ImageObject",
                "url": "https://zait-and-filters-web.vercel.app/logo.png"
            }
        },
        "datePublished": post.createdAt?.toDate().toISOString(),
        "dateModified": post.updatedAt?.toDate().toISOString() || post.createdAt?.toDate().toISOString()
    };

    return (
        <div className="bg-white min-h-screen pb-20">
            <SEO
                title={`${title} | مدونة زيت اند فلترز`}
                description={excerpt}
                image={post.image}
                url={window.location.host + window.location.pathname}
                type="article"
                schema={articleSchema}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                <Breadcrumbs />

                <button
                    onClick={() => navigate('/blog')}
                    className={`flex items-center text-gray-400 hover:text-black font-bold transition-colors uppercase tracking-widest text-[10px] mb-8 group ${isAr ? 'flex-row-reverse' : ''}`}
                >
                    <ArrowLeft className={`h-4 w-4 ${isAr ? 'ml-2 rotate-180' : 'mr-2'} transform group-hover:-translate-x-1 transition-transform`} />
                    {isAr ? 'العودة للمدونة' : 'Back to Blog'}
                </button>

                <article>
                    <header className={`mb-12 ${isAr ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-3 mb-6 ${isAr ? 'flex-row-reverse' : ''}`}>
                            <span className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg uppercase tracking-widest italic">
                                {post.category}
                            </span>
                            <div className="h-[1px] flex-1 bg-gray-100" />
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-tight font-Cairo mb-8 italic">
                            {title}
                        </h1>

                        <div className={`flex flex-wrap items-center justify-between gap-6 py-6 border-y border-gray-100 ${isAr ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-6 ${isAr ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-2 text-xs font-bold text-gray-500 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    {post.createdAt?.toDate().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                </div>
                                <div className={`flex items-center gap-2 text-xs font-bold text-gray-500 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <User className="h-4 w-4 text-orange-600" />
                                    {post.author}
                                </div>
                                <div className={`flex items-center gap-2 text-xs font-bold text-gray-400 ${isAr ? 'flex-row-reverse' : ''}`}>
                                    <Clock className="h-4 w-4" />
                                    {Math.ceil(content?.split(' ').length / 200)} {isAr ? 'دقائق قراءة' : 'min read'}
                                </div>
                            </div>

                            <button
                                onClick={handleShare}
                                className="p-3 bg-gray-50 hover:bg-orange-50 text-gray-400 hover:text-orange-600 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-orange-100"
                            >
                                <Share2 className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    <div className="rounded-[3rem] overflow-hidden mb-12 shadow-2xl shadow-gray-200 border border-gray-100 relative group">
                        <img
                            src={getOptimizedImage(post.image, 'f_auto,q_auto,w_1200')}
                            alt={title}
                            className="w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                    </div>

                    <div
                        className={`prose prose-lg max-w-none text-gray-600 font-medium leading-relaxed font-Cairo whitespace-pre-line ${isAr ? 'text-right' : 'text-left'}`}
                        dir={isAr ? 'rtl' : 'ltr'}
                    >
                        {content}
                    </div>

                    <footer className="mt-20 pt-10 border-t border-gray-100 italic">
                        <div className={`flex items-center gap-3 mb-10 ${isAr ? 'flex-row-reverse' : ''}`}>
                            <Tag className="h-5 w-5 text-orange-600" />
                            <div className={`flex flex-wrap gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                                {post.category && (
                                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-xl">
                                        #{post.category.replace(/\s+/g, '')}
                                    </span>
                                )}
                                <span className="text-xs font-black text-gray-900 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-xl">
                                    #ZaitAndFilters
                                </span>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10 font-Cairo">
                                <h3 className="text-3xl md:text-4xl font-black text-white mb-4 italic tracking-tighter">
                                    {isAr ? 'هل تحتاج لقطع غيار؟' : 'Need Quality Car Parts?'}
                                </h3>
                                <p className="text-gray-400 font-bold mb-8 max-w-lg mx-auto uppercase tracking-widest text-xs">
                                    {isAr
                                        ? 'تسوق الآن أفضل الماركات الأصلية بضمان حقيقي وتوصيل سريع'
                                        : 'Shop the best original brands with genuine warranty and fast delivery'}
                                </p>
                                <button
                                    onClick={() => navigate('/shop')}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-600/20 transition-all hover:scale-105 active:scale-95"
                                >
                                    {isAr ? 'تصفح المتجر الآن' : 'Shop Now'}
                                </button>
                            </div>
                        </div>
                    </footer>
                </article>

                {/* Related Products Funnel */}
                <section className="mt-20 not-italic">
                    <h2 className={`text-3xl font-black text-gray-900 mb-10 font-Cairo tracking-tighter italic ${isAr ? 'text-right' : 'text-left'}`}>
                        {isAr ? 'منتجات مقترحة صيانة' : 'Recommended for You'}
                    </h2>
                    <RelatedProducts />
                </section>
            </div>
        </div>
    );
};

export default BlogPostPage;
