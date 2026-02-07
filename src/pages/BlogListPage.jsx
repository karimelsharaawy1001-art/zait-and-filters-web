import React, { useState, useEffect } from 'react';
import { databases } from '../appwrite';
import { Query } from 'appwrite';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { getOptimizedImage } from '../utils/cloudinaryUtils';

const BlogListPage = () => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const BLOG_COLLECTION = import.meta.env.VITE_APPWRITE_BLOG_COLLECTION_ID || 'blog_posts';

                if (!DATABASE_ID || !BLOG_COLLECTION) {
                    console.error('Missing Appwrite configuration');
                    setLoading(false);
                    return;
                }

                const response = await databases.listDocuments(DATABASE_ID, BLOG_COLLECTION, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(100)
                ]);

                const list = response.documents.map(doc => ({
                    id: doc.$id,
                    ...doc,
                    createdAt: doc.$createdAt // Map Appwrite's $createdAt
                }));

                // Filter for published posts only
                const publishedPosts = list.filter(post =>
                    post.isActive !== false || post.status === 'published'
                );

                setPosts(publishedPosts);
            } catch (error) {
                console.error("Error fetching blog posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return (
        <div className="bg-white min-h-screen pb-20">
            <SEO
                title={isAr ? 'مدونة النصائح والصيانة | زيت اند فلترز' : 'Maintenance Tips & Blog | Zait & Filters'}
                description={isAr
                    ? 'اكتشف أفضل النصائح للحفاظ على محرك سيارتك وإطالة عمرها الافتراضي مع خبراء زيت اند فلترز.'
                    : 'Discover expert tips to maintain your car engine and extend its lifespan with Zait & Filters experts.'}
                url={window.location.origin + window.location.pathname}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                <Breadcrumbs />
            </div>

            <header className="bg-gray-50 border-b border-gray-100 py-16 mb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center uppercase">
                    <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black tracking-[0.2em] mb-4 font-Cairo italic">
                        {isAr ? "نصائح الخبراء" : "EXPERT KNOWLEDGE"}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none font-Cairo mb-4 italic">
                        {isAr ? "مدونة الصيانة" : "Maintenance Blog"}
                    </h1>
                    <p className="text-gray-500 font-bold max-w-xl mx-auto tracking-widest text-xs uppercase italic">
                        {isAr
                            ? "دليلكم الشامل للحفاظ على أداء سيارتكم بأفضل حال"
                            : "Your comprehensive guide to keeping your car in top performance"}
                    </p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 uppercase italic">
                        <p className="text-gray-400 font-black tracking-widest">{isAr ? "لا توجد مقالات حالياً" : "No articles published yet"}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {posts.map((post) => (
                            <Link
                                key={post.id}
                                to={`/blog/${post.slug || post.id}`}
                                className="group flex flex-col bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                            >
                                <div className="aspect-[16/10] overflow-hidden relative">
                                    <img
                                        src={getOptimizedImage(post.image, 'f_auto,q_auto,w_800')}
                                        alt={isAr ? post.title : post.titleEn}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute top-6 left-6">
                                        <span className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg uppercase tracking-widest">
                                            {post.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8 flex-1 flex flex-col">
                                    <div className={`flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(post.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-orange-600/60">
                                            <User className="h-3 w-3" />
                                            {post.author}
                                        </div>
                                    </div>
                                    <h2 className={`text-2xl font-black text-gray-900 mb-4 font-Cairo leading-tight group-hover:text-orange-600 transition-colors ${isAr ? 'text-right' : 'text-left'}`}>
                                        {isAr ? post.title : post.titleEn}
                                    </h2>
                                    <p className={`text-gray-500 text-sm font-medium leading-relaxed mb-6 line-clamp-3 ${isAr ? 'text-right' : 'text-left'}`}>
                                        {isAr ? post.excerpt : post.excerptEn}
                                    </p>
                                    <div className={`mt-auto pt-6 border-t border-gray-50 flex items-center justify-between ${isAr ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all italic">
                                            {isAr ? 'اقرأ المزيد' : 'Read Article'}
                                            <ArrowRight className={`h-3 w-3 ${isAr ? 'rotate-180' : ''}`} />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BlogListPage;
