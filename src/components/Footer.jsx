import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from 'lucide-react';

const Footer = () => {
    const { settings } = useSettings();
    const { t } = useTranslation();

    return (
        <footer className="footer-section bg-gradient-to-b from-[#0a0a0a] via-[#000000] to-[#000000] text-gray-400 pt-10 pb-6 mt-auto border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8 mb-8">
                    {/* Column 1: About */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="shrink-0">
                                {settings.siteLogo && (
                                    <img src={settings.siteLogo} alt={settings.siteName} className="h-16 w-auto object-contain drop-shadow-2xl" />
                                )}
                            </Link>
                            <div className="flex flex-col justify-center">
                                <Link to="/" className="group">
                                    <span className="font-black text-2xl text-white tracking-tighter uppercase italic leading-tight block hover:scale-105 transition-transform">
                                        ZAIT <span className="text-[#28B463]">& FILTERS</span>
                                    </span>
                                </Link>
                                <p className="text-[10px] font-black text-gray-500 mt-0.5 tracking-widest uppercase">قطع الغيار بضغطة زرار</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 max-w-md">
                            {settings.footerDescription}
                        </p>
                        {/* Social Links */}
                        <div className="pt-2">
                            <div className="flex gap-3">
                                {settings.facebookUrl && (
                                    <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="group p-3 bg-white/5 rounded-xl hover:bg-[#28B463] transition-all duration-300 text-white border border-white/10 hover:border-[#28B463] hover:scale-110 hover:shadow-lg hover:shadow-[#28B463]/20">
                                        <Facebook className="h-5 w-5" />
                                    </a>
                                )}
                                {settings.instagramUrl && (
                                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="group p-3 bg-white/5 rounded-xl hover:bg-[#28B463] transition-all duration-300 text-white border border-white/10 hover:border-[#28B463] hover:scale-110 hover:shadow-lg hover:shadow-[#28B463]/20">
                                        <Instagram className="h-5 w-5" />
                                    </a>
                                )}
                                {settings.whatsappNumber && (
                                    <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="group p-3 bg-white/5 rounded-xl hover:bg-[#28B463] transition-all duration-300 text-white border border-white/10 hover:border-[#28B463] hover:scale-110 hover:shadow-lg hover:shadow-[#28B463]/20">
                                        <MessageCircle className="h-5 w-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-white font-black text-lg mb-4 uppercase tracking-tight relative inline-block">
                            {t('footerQuickLinks', 'Quick Links')}
                            <span className="absolute -bottom-2 left-0 w-12 h-1 bg-[#28B463] rounded-full"></span>
                        </h3>
                        <ul className="space-y-3 text-sm font-bold mt-4">
                            <li><Link to="/" className="hover:text-[#28B463] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-[#28B463] transition-colors"></span>{t('home')}</Link></li>
                            <li><Link to="/shop" className="hover:text-[#28B463] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-[#28B463] transition-colors"></span>{t('shop')}</Link></li>
                            <li><Link to="/blog" className="hover:text-[#28B463] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-[#28B463] transition-colors"></span>{t('blog')}</Link></li>
                            <li><Link to="/cart" className="hover:text-[#28B463] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-[#28B463] transition-colors"></span>{t('cart')}</Link></li>
                            <li><Link to="/marketers" className="hover:text-[#28B463] transition-colors flex items-center gap-2 group font-Cairo"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-[#28B463] transition-colors"></span>{t('nav.marketers', 'Marketers')}</Link></li>
                            <li><Link to="/contact" className="text-[#28B463] hover:text-white transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-[#28B463] group-hover:bg-white transition-colors"></span>{t('footerContact', 'Contact Us')}</Link></li>
                        </ul>
                    </div>

                    {/* Column: Policies */}
                    <div>
                        <h3 className="text-white font-black text-lg mb-4 uppercase tracking-tight relative inline-block">
                            {t('policies')}
                            <span className="absolute -bottom-2 left-0 w-12 h-1 bg-[#28B463] rounded-full"></span>
                        </h3>
                        <ul className="space-y-3 text-sm font-bold mt-4">
                            <li><Link to="/returns" className="hover:text-[#28B463] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-[#28B463] transition-colors"></span>{t('returnsPolicy')}</Link></li>
                            <li><Link to="/shipping" className="hover:text-[#28B463] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-[#28B463] transition-colors"></span>{t('shippingInfo')}</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Contact Info */}
                    <div>
                        <h3 className="text-white font-black text-lg mb-4 uppercase tracking-tight relative inline-block">
                            {t('footerContact', 'Contact Us')}
                            <span className="absolute -bottom-2 left-0 w-12 h-1 bg-[#28B463] rounded-full"></span>
                        </h3>
                        <ul className="space-y-4 text-sm mt-4">
                            {settings.contactAddress && (
                                <li className="flex gap-3 items-start group">
                                    <div className="p-2 bg-[#28B463]/10 rounded-lg group-hover:bg-[#28B463]/20 transition-colors">
                                        <MapPin className="h-5 w-5 text-[#28B463] shrink-0" />
                                    </div>
                                    <span className="pt-2">{settings.contactAddress}</span>
                                </li>
                            )}
                            {settings.contactPhone && (
                                <li className="flex gap-3 items-start font-bold text-white group">
                                    <div className="p-2 bg-[#28B463]/10 rounded-lg group-hover:bg-[#28B463]/20 transition-colors">
                                        <Phone className="h-5 w-5 text-[#28B463] shrink-0" />
                                    </div>
                                    <span className="pt-2">{settings.contactPhone}</span>
                                </li>
                            )}
                            {settings.contactEmail && (
                                <li className="flex gap-3 items-start group">
                                    <div className="p-2 bg-[#28B463]/10 rounded-lg group-hover:bg-[#28B463]/20 transition-colors">
                                        <Mail className="h-5 w-5 text-[#28B463] shrink-0" />
                                    </div>
                                    <span className="break-all pt-2">{settings.contactEmail}</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Column 4: Newsletter - Moved to bottom on mobile, full width */}
                    <div className="lg:col-span-4 mt-4">
                        <div className="bg-gradient-to-r from-[#28B463]/10 via-[#28B463]/5 to-transparent p-6 rounded-2xl border border-[#28B463]/20">
                            <div className="max-w-2xl">
                                <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">Stay Updated</h3>
                                <p className="text-sm text-gray-400 mb-6">Subscribe for exclusive updates on new filters, oils, and auto products.</p>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const email = e.target.email.value;
                                        if (!email) return;

                                        const { default: axios } = await import('axios');
                                        const { toast } = await import('react-hot-toast');

                                        const loadingToast = toast.loading('Subscribing...');
                                        try {
                                            await axios.post('/api/products?action=subscribe', { email });
                                            toast.success('Subscribed successfully!', { id: loadingToast });
                                            e.target.reset();
                                        } catch (error) {
                                            console.error('Subscription error:', error);
                                            toast.error('Failed to subscribe. Please try again.', { id: loadingToast });
                                        }
                                    }}
                                    className="flex flex-col sm:flex-row gap-3"
                                >
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="Enter your email address"
                                        className="flex-1 px-5 py-4 bg-black/40 border-2 border-white/10 focus:border-[#28B463] rounded-xl outline-none transition-all text-sm text-white placeholder:text-gray-500"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="newsletter-btn px-8 py-4 bg-[#28B463] hover:bg-[#22a058] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#28B463]/30 hover:shadow-[#28B463]/50 active:scale-95 whitespace-nowrap"
                                    >
                                        Subscribe Now
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                </div>
                <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] text-center text-gray-600 uppercase font-black tracking-[0.3em]">
                        © 2024 ZAIT & FILTERS. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
