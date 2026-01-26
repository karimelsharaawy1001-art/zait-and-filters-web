import React from 'react';
import { ShieldCheck, Truck, Headset, CreditCard, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const ValuePropositionBanner = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const features = [
        {
            icon: <ShieldCheck className="h-8 w-8 text-[#28B463]" />,
            title: isRTL ? 'ضمان الأصالة والجودة' : 'Authenticity & Quality Guarantee',
            subtitle: isRTL ? 'منتجات أصلية 100% مع ضمان رسمي' : '100% genuine products with official warranty',
        },
        {
            icon: <Truck className="h-8 w-8 text-[#28B463]" />,
            title: isRTL ? 'توصيل سريع وموثوق' : 'Fast & Reliable Delivery',
            subtitle: isRTL ? 'شحن لجميع المحافظات خلال 48 ساعة' : 'Shipping to all governorates within 48 hours',
        },
        {
            icon: <Headset className="h-8 w-8 text-[#28B463]" />,
            title: isRTL ? 'دعم فني متخصص' : 'Expert Technical Support',
            subtitle: isRTL ? 'مهندسين متخصصين لمساعدتك في اختيار القطعة' : 'Specialized engineers to help you choose the right part',
        },
        {
            icon: <CreditCard className="h-8 w-8 text-[#28B463]" />,
            title: isRTL ? 'خيارات دفع متعددة' : 'Multiple Payment Options',
            subtitle: isRTL ? 'كاش، فيزا، أو تقسيط بجميع الأنظمة' : 'Cash, Credit, or Easy Installments',
        }
    ];

    return (
        <section className="relative overflow-hidden bg-white py-12 border-y border-gray-50">
            {/* Subtle Gradient Background Effect */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#28B463]/5 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/4 h-full bg-gradient-to-r from-[#28B463]/3 to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className={`flex ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'} items-center gap-5 p-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 group cursor-default`}
                        >
                            <div className="bg-[#28B463]/10 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-black text-gray-900 mb-1 uppercase tracking-tight font-Cairo">
                                    {feature.title}
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold leading-relaxed font-Cairo">
                                    {feature.subtitle}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Shop Now Integration */}
                <div className="mt-12 flex justify-center">
                    <Link
                        to="/shop"
                        className="group relative inline-flex items-center justify-center px-10 py-4 bg-[#28B463] text-white rounded-full font-black text-sm uppercase tracking-widest overflow-hidden transition-all shadow-xl shadow-[#28B463]/30 hover:shadow-[#28B463]/50 transform hover:-translate-y-1"
                    >
                        <span className="relative z-10 flex items-center gap-2 font-Cairo font-black">
                            {isRTL ? 'تسوق الآن' : 'Shop Now'}
                            <Sparkles className="h-4 w-4" />
                        </span>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default ValuePropositionBanner;
