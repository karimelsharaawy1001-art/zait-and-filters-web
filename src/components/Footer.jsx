import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from 'lucide-react';

const Footer = () => {
    const { settings } = useSettings();
    const { t } = useTranslation();

    return (
        <footer className="footer-section bg-[#000000] text-gray-400 pt-12 pb-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
                    {/* Column 1: About */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="shrink-0">
                                {settings.siteLogo && (
                                    <img src={settings.siteLogo} alt={settings.siteName} className="h-16 w-auto object-contain" />
                                )}
                            </Link>
                            <div className="flex flex-col justify-center">
                                <Link to="/" className="group">
                                    <span className="font-black text-2xl text-white tracking-tighter uppercase italic leading-tight block">
                                        <span className="text-highrev-red">ZAIT</span> & FILTERS
                                    </span>
                                </Link>
                                <p className="text-[10px] font-black text-gray-500 mt-0.5 tracking-widest uppercase">قطع الغيار بضغطة زرار</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed">
                            {settings.footerDescription}
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-4">
                            {settings.facebookUrl && (
                                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-lg hover:bg-highrev-red transition-colors text-white">
                                    <Facebook className="h-5 w-5" />
                                </a>
                            )}
                            {settings.instagramUrl && (
                                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-lg hover:bg-highrev-red transition-colors text-white">
                                    <Instagram className="h-5 w-5" />
                                </a>
                            )}
                            {settings.whatsappNumber && (
                                <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-lg hover:bg-highrev-red transition-colors text-white">
                                    <MessageCircle className="h-5 w-5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-white font-black text-lg mb-6 uppercase tracking-tight">{t('footerQuickLinks', 'Quick Links')}</h3>
                        <ul className="space-y-4 text-sm font-bold">
                            <li><Link to="/" className="hover:text-highrev-red transition-colors">{t('home')}</Link></li>
                            <li><Link to="/shop" className="hover:text-highrev-red transition-colors">{t('shop')}</Link></li>
                            <li><Link to="/cart" className="hover:text-highrev-red transition-colors">{t('cart')}</Link></li>
                            <li><Link to="/marketers" className="hover:text-highrev-red transition-colors font-Cairo">{t('nav.marketers', 'Marketers')}</Link></li>
                            <li><Link to="/contact" className="text-highrev-red hover:text-white transition-colors">{t('footerContact', 'Contact Us')}</Link></li>
                        </ul>
                    </div>

                    {/* Column: Policies */}
                    <div>
                        <h3 className="text-white font-black text-lg mb-6 uppercase tracking-tight">{t('policies')}</h3>
                        <ul className="space-y-4 text-sm font-bold">
                            <li><Link to="/returns" className="hover:text-highrev-red transition-colors">{t('returnsPolicy')}</Link></li>
                            <li><Link to="/shipping" className="hover:text-highrev-red transition-colors">{t('shippingInfo')}</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Contact Info */}
                    <div>
                        <h3 className="text-white font-black text-lg mb-6 uppercase tracking-tight">{t('footerContact', 'Contact Us')}</h3>
                        <ul className="space-y-4 text-sm">
                            {settings.contactAddress && (
                                <li className="flex gap-3">
                                    <MapPin className="h-5 w-5 text-highrev-red shrink-0" />
                                    <span>{settings.contactAddress}</span>
                                </li>
                            )}
                            {settings.contactPhone && (
                                <li className="flex gap-3 font-bold text-white">
                                    <Phone className="h-5 w-5 text-highrev-red shrink-0" />
                                    <span>{settings.contactPhone}</span>
                                </li>
                            )}
                            {settings.contactEmail && (
                                <li className="flex gap-3">
                                    <Mail className="h-5 w-5 text-highrev-red shrink-0" />
                                    <span className="break-all">{settings.contactEmail}</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div className="space-y-6">
                        <h3 className="text-white font-black text-lg uppercase tracking-tight">Newsletter</h3>
                        <p className="text-sm">Subscribe for updates on new filters and auto products.</p>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const email = e.target.email.value;
                                if (!email) return;

                                const { default: axios } = await import('axios');
                                const { toast } = await import('react-hot-toast');

                                const loadingToast = toast.loading('Subscribing...');
                                try {
                                    await axios.post('/api/mailchimp-subscribe', { email });
                                    toast.success('Subscribed successfully!', { id: loadingToast });
                                    e.target.reset();
                                } catch (error) {
                                    console.error('Subscription error:', error);
                                    toast.error('Failed to subscribe. Please try again.', { id: loadingToast });
                                }
                            }}
                            className="flex flex-col gap-3"
                        >
                            <input
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                className="w-full px-4 py-3 bg-white/5 border-2 border-transparent focus:border-highrev-red rounded-xl outline-none transition-all text-sm text-white"
                                required
                            />
                            <button
                                type="submit"
                                className="newsletter-btn w-full py-3 bg-highrev-red hover:bg-highrev-red-dark text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-highrev-red/20 active:scale-95"
                            >
                                Subscribe Now
                            </button>
                        </form>
                    </div>

                </div>
                <div className="pt-8 border-t border-white/5">
                    <p className="text-[10px] text-center text-gray-600 uppercase font-black tracking-[0.3em]">
                        © 2024 ZAIT & FILTERS. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
