import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from 'lucide-react';

const Footer = () => {
    const { settings } = useSettings();
    const { t } = useTranslation();

    return (
        <footer className="bg-gray-900 text-gray-300 pt-12 pb-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Column 1: About */}
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center gap-2 group">
                            {settings.siteLogo && (
                                <img src={settings.siteLogo} alt={settings.siteName} className="h-10 w-auto object-contain" />
                            )}
                            <span className="font-bold text-2xl text-[#008a40] tracking-wider">
                                {settings.siteName}
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed text-gray-400">
                            {settings.footerDescription}
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-4">
                            {settings.facebookUrl && (
                                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors text-white">
                                    <Facebook className="h-5 w-5" />
                                </a>
                            )}
                            {settings.instagramUrl && (
                                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors text-white">
                                    <Instagram className="h-5 w-5" />
                                </a>
                            )}
                            {settings.whatsappNumber && (
                                <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors text-white">
                                    <MessageCircle className="h-5 w-5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6 uppercase tracking-wider">{t('footerQuickLinks', 'Quick Links')}</h3>
                        <ul className="space-y-4 text-sm">
                            <li><Link to="/" className="hover:text-orange-500 transition-colors">{t('home')}</Link></li>
                            <li><Link to="/shop" className="hover:text-orange-500 transition-colors">{t('shop')}</Link></li>
                            <li><Link to="/cart" className="hover:text-orange-500 transition-colors">{t('cart')}</Link></li>
                            <li><Link to="/contact" className="hover:text-orange-500 transition-colors font-bold text-orange-400">{t('footerContact', 'Contact Us')}</Link></li>
                        </ul>
                    </div>

                    {/* Column: Policies */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6 uppercase tracking-wider">{t('policies')}</h3>
                        <ul className="space-y-4 text-sm">
                            <li><Link to="/returns" className="hover:text-orange-500 transition-colors">{t('returnsPolicy')}</Link></li>
                            <li><Link to="/shipping" className="hover:text-orange-500 transition-colors">{t('shippingInfo')}</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Contact Info */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6 uppercase tracking-wider">{t('footerContact', 'Contact Us')}</h3>
                        <ul className="space-y-4 text-sm">
                            {settings.contactAddress && (
                                <li className="flex gap-3">
                                    <MapPin className="h-5 w-5 text-orange-500 shrink-0" />
                                    <span>{settings.contactAddress}</span>
                                </li>
                            )}
                            {settings.contactPhone && (
                                <li className="flex gap-3">
                                    <Phone className="h-5 w-5 text-orange-500 shrink-0" />
                                    <span>{settings.contactPhone}</span>
                                </li>
                            )}
                            {settings.contactEmail && (
                                <li className="flex gap-3">
                                    <Mail className="h-5 w-5 text-orange-500 shrink-0" />
                                    <span className="break-all">{settings.contactEmail}</span>
                                </li>
                            )}
                        </ul>
                    </div>

                </div>
                <div className="pt-8 border-t border-gray-800 flex flex-col items-center">
                    <p className="text-xs text-center text-gray-500 mb-4 uppercase tracking-widest">
                        © 2024 ZAIT & FILTERS. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
