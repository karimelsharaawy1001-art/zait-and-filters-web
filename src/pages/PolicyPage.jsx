import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const PolicyPage = ({ pageId }) => {
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { i18n, t } = useTranslation();

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const docSnap = await getDoc(doc(db, 'content_pages', pageId));
                if (docSnap.exists()) {
                    setPageData(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching policy page:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
        window.scrollTo(0, 0);
    }, [pageId]);

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
            </div>
        );
    }

    if (!pageData) {
        return (
            <div className="flex-1 max-w-4xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('pageNotFound', 'Page Not Found')}</h1>
                <Link to="/" className="text-orange-600 hover:text-orange-700 font-medium">
                    {t('backToHome', 'Back to Home')}
                </Link>
            </div>
        );
    }

    const isAr = i18n.language === 'ar';
    const title = isAr ? pageData.title_ar : pageData.title_en;
    const content = isAr ? pageData.content_ar : pageData.content_en;

    return (
        <div className="flex-1 bg-white">
            <SEO
                title={`${title} | Zait & Filters`}
                description={content.slice(0, 160)}
                url={window.location.origin + window.location.pathname}
            />
            {/* Page Header */}
            <div className="bg-gray-50 border-b border-gray-100 py-12 md:py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="mb-6 flex items-center text-sm font-medium text-gray-500">
                        <Link to="/" className="hover:text-orange-600 transition-colors">{t('home')}</Link>
                        <span className="mx-2">
                            {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        </span>
                        <span className="text-gray-900">{title}</span>
                    </nav>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                        {title}
                    </h1>
                </div>
            </div>

            {/* Content Body */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div
                    className={`prose prose-orange lg:prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap ${isAr ? 'text-right' : 'text-left'}`}
                    dir={isAr ? 'rtl' : 'ltr'}
                >
                    {content}
                </div>
            </div>
        </div>
    );
};

export default PolicyPage;
