import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Facebook, BarChart, ExternalLink, ChevronRight, Mail, CreditCard, Eye, Zap, Activity, ShieldCheck, Globe, Share2, Layers } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const Integrations = () => {
    const services = [
        { id: 'google-search-console', name: 'Search Console', description: 'Monitor search performance and index status on Google.', icon: <Search className="w-6 h-6" />, color: 'bg-blue-600', path: '/admin/integrations/google-search-console' },
        { id: 'facebook-pixel', name: 'Meta Pixel', description: 'Track conversion events and optimize ad campaigns.', icon: <Facebook className="w-6 h-6" />, color: 'bg-indigo-600', path: '/admin/integrations/facebook-pixel' },
        { id: 'cloudinary', name: 'Cloudinary CDN', description: 'Dynamic asset optimization and high-speed delivery.', icon: <Eye className="w-6 h-6" />, color: 'bg-blue-500', path: '/admin/integrations/cloudinary' },
        { id: 'installment-partners', name: 'Fintech Partners', description: 'Manage installment providers and visual badges.', icon: <CreditCard className="w-6 h-6" />, color: 'bg-red-600', path: '/admin/integrations/installment-partners' },
        { id: 'facebook-shopping', name: 'Social Shopping', description: 'Real-time catalog synchronization for FB/IG Shops.', icon: <Share2 className="w-6 h-6" />, color: 'bg-gradient-to-br from-blue-600 to-indigo-600', path: '/admin/integrations/facebook-instagram-shopping' },
        { id: 'google-merchant-center', name: 'Merchant Center', description: 'Deploy product catalogs to Google Shopping network.', icon: <Globe className="w-6 h-6" />, color: 'bg-[#4285F4]', path: '/admin/integrations/google-merchant-center' },
        { id: 'mailchimp', name: 'Mailchimp CRM', description: 'High-volume newsletter and customer segmentation.', icon: <Mail className="w-6 h-6" />, color: 'bg-[#FFE01B]', path: '/admin/integrations/mailchimp', iconColor: 'text-black' },
        { id: 'sendgrid', name: 'SendGrid Relay', description: 'Transactional email delivery and audit logs.', icon: <Activity className="w-6 h-6" />, color: 'bg-[#00B3E3]', path: '/admin/integrations/sendgrid' },
        { id: 'google-analytics', name: 'Analytics V4', description: 'Deep behavioral intelligence and traffic telemetry.', icon: <BarChart className="w-6 h-6" />, color: 'bg-orange-500', path: '/admin/integrations/google-analytics' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Ecosystem Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Connectivity Hub</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {services.length} External Network Bridges</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Layers size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Bridges</p><h3 className="text-2xl font-black italic">{services.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Security</p><h3 className="text-2xl font-black italic">Verified</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><Zap size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Sync Speed</p><h3 className="text-2xl font-black italic">Real-time</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Operational</p><h3 className="text-2xl font-black italic">100%</h3></div></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service) => (
                        <NavLink key={service.id} to={service.path} className="group relative bg-white rounded-[3rem] p-10 shadow-sm border transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] flex flex-col">
                            <div className="flex items-start justify-between mb-8">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl text-white ${service.color} group-hover:rotate-6 transition-all`}>
                                    {service.icon}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-100 italic">Operational</span>
                            </div>
                            <h3 className="text-xl font-black uppercase italic mb-3 group-hover:text-red-600 transition-colors">
                                {service.name}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mb-10 italic">
                                {service.description}
                            </p>
                            <div className="mt-auto flex items-center justify-between w-full py-5 px-8 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all">
                                <span>Initialize Protocol</span>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </NavLink>
                    ))}
                </div>

                <div className="mt-16 p-12 bg-black text-white rounded-[3.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/4 translate-y-[-1/4] group-hover:scale-110 transition-all">
                        <ExternalLink size={240} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <h4 className="text-2xl font-black uppercase italic mb-2">Custom Proprietary Hub?</h4>
                        <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Our system architects can facilitate horizontal bridges to any enterprise ERP or logistics cluster.</p>
                    </div>
                    <button className="relative z-10 px-12 py-5 bg-white text-black rounded-[2rem] font-black uppercase italic text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl">
                        Request API Provisioning
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Integrations;
