import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const NotFound = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState(5);
    const isAr = i18n.language === 'ar';

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/shop');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
            <SEO
                title={isAr ? "الصفحة غير موجودة | Zait & Filters" : "Page Not Found | Zait & Filters"}
                description={isAr ? "نأسف، لم يتم العثور على الصفحة المطلوبة. سيتم توجيهك للمتجر الآن." : "Sorry, the page you're looking for doesn't exist. You'll be redirected soon."}
            />

            <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 shadow-sm max-w-md w-full">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="h-10 w-10 text-orange-600" />
                </div>

                <h1 className="text-4xl font-black text-gray-900 mb-4 font-Cairo uppercase italic">
                    {isAr ? "٤٠٤ - ضللنا الطريق" : "404 - LOST THE TRAIL"}
                </h1>

                <p className="text-gray-500 font-bold mb-8 leading-relaxed">
                    {isAr
                        ? "نأسف، يبدو أن هذه الصفحة لا تنتمي لمخزننا. سنقوم بتوجيهك فوراً لاكتشاف منتجاتنا الأصلية."
                        : "Looks like this part isn't in our inventory. We're redirecting you to find the right part now."}
                </p>

                <div className="bg-gray-900 text-white p-4 rounded-2xl mb-8 flex items-center justify-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest leading-none">
                        {isAr ? "سيتم التوجيه خلال" : "Redirecting in"}
                    </span>
                    <span className="text-2xl font-black text-orange-500">{timeLeft}</span>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/shop')}
                        className="w-full bg-[#28B463] hover:bg-[#219653] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-[#28B463]/20 transition-all flex items-center justify-center gap-3"
                    >
                        <ShoppingBag className="h-5 w-5" />
                        {t('shopNow')}
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-white border border-gray-100 text-gray-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                    >
                        <Home className="h-5 w-5" />
                        {t('home')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
