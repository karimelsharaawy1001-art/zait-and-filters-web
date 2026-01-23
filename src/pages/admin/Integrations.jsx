import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Facebook, BarChart, ExternalLink, ChevronRight, Mail, CreditCard, Eye } from 'lucide-react';

const Integrations = () => {
    const services = [
        {
            id: 'google-search-console',
            name: 'Google Search Console',
            description: 'Verify your site ownership and monitor your search performance on Google.',
            icon: <Search className="w-6 h-6 text-white" />,
            color: 'bg-blue-600',
            path: '/admin/integrations/google-search-console',
            status: 'Operational'
        },
        {
            id: 'facebook-pixel',
            name: 'Facebook Pixel',
            description: 'Track conversions and optimize your Facebook ads campaigns.',
            icon: <Facebook className="w-6 h-6 text-white" />,
            color: 'bg-indigo-600',
            path: '/admin/integrations/facebook-pixel',
            status: 'Operational'
        },
        {
            id: 'cloudinary',
            name: 'Cloudinary',
            description: 'Automatic image optimization, resizing, and fast delivery (CDN).',
            icon: <Eye className="w-6 h-6 text-white" />,
            color: 'bg-[#3448C5]', // Cloudinary Blue
            path: '/admin/integrations/cloudinary',
            status: 'Operational'
        },
        {
            id: 'installment-partners',
            name: 'Installment Partners',
            description: 'Manage installment providers (Valu, Aman, etc.) and display them on your site.',
            icon: <CreditCard className="w-6 h-6 text-white" />,
            color: 'bg-admin-red',
            path: '/admin/integrations/installment-partners',
            status: 'Operational'
        },
        {
            id: 'facebook-shopping',
            name: 'FB & Instagram Shop',
            description: 'Sync your catalog and sell directly on Facebook and Instagram.',
            icon: <Facebook className="w-6 h-6 text-white" />,
            color: 'bg-gradient-to-br from-[#0064E0] to-[#0064E0]', // Meta Blue
            path: '/admin/integrations/facebook-instagram-shopping',
            status: 'Operational'
        },
        {
            id: 'google-merchant-center',
            name: 'Merchant Center',
            description: 'List your products on Google Shopping and across Google surfaces.',
            icon: <Search className="w-6 h-6 text-white" />, // Using Search icon for Google GMC
            color: 'bg-[#4285F4]', // Google Blue
            path: '/admin/integrations/google-merchant-center',
            status: 'Operational'
        },
        {
            id: 'mailchimp',
            name: 'Mailchimp',
            description: 'Sync your customers and newsletter subscribers to Mailchimp lists.',
            icon: <Mail className="w-6 h-6 text-white" />,
            color: 'bg-[#FFE01B]',
            path: '/admin/integrations/mailchimp',
            status: 'Operational',
            iconColor: 'text-black'
        },
        {
            id: 'sendgrid',
            name: 'SendGrid Email',
            description: 'Send automated transactional emails for orders and notifications.',
            icon: <Mail className="w-6 h-6 text-white" />,
            color: 'bg-[#00B3E3]', // SendGrid Blue
            path: '/admin/integrations/sendgrid',
            status: 'Operational'
        },
        {
            id: 'google-analytics',
            name: 'Google Analytics',
            description: 'Track website traffic and user behavior in real-time.',
            icon: <BarChart className="w-6 h-6 text-white" />,
            color: 'bg-orange-500',
            path: '/admin/integrations/google-analytics',
            status: 'Operational'
        }
    ];

    return (
        <div className="min-h-screen bg-admin-bg font-sans pb-20 p-4 md:p-8">
            <header className="mb-12 max-w-7xl mx-auto mt-10">
                <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-widest poppins">Integrations Hub</h1>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">
                    Connect your storefront node with third-party analytical and logistics clusters.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {services.map((service) => (
                    <div
                        key={service.id}
                        className={`group relative bg-admin-card rounded-[2.5rem] p-10 shadow-admin border border-admin-border transition-all duration-500 hover:bg-[#ffffff05] ${service.disabled ? 'opacity-50 grayscale' : 'hover:border-admin-accent/30'}`}
                    >
                        <div className="flex items-start justify-between mb-8">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${service.color} group-hover:scale-110 transition-transform`}>
                                {service.icon}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${service.disabled ? 'bg-[#ffffff05] text-gray-600 border-[#ffffff1a]' : 'bg-admin-green/10 text-admin-green border-admin-green/20 shadow-lg shadow-admin-green/5'}`}>
                                {service.disabled ? 'Offline' : 'Operational'}
                            </span>
                        </div>

                        <h3 className="text-xl font-black text-white mb-2 group-hover:text-admin-accent transition-colors poppins">
                            {service.name}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed mb-10 min-h-[40px]">
                            {service.description}
                        </p>

                        {!service.disabled ? (
                            <NavLink
                                to={service.path}
                                className="flex items-center justify-between w-full py-4 px-8 bg-[#ffffff05] hover:bg-admin-accent text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all border border-admin-border hover:border-admin-accent hover:shadow-lg hover:shadow-admin-red/40"
                            >
                                <span>Initialize Config</span>
                                <ChevronRight className="w-4 h-4" />
                            </NavLink>
                        ) : (
                            <div className="flex items-center justify-center w-full py-4 px-8 bg-[#ffffff02] text-gray-700 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-dashed border-[#ffffff0d]">
                                Node Restricted
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-16 p-10 bg-admin-card rounded-[3rem] border border-admin-border shadow-admin flex flex-col md:flex-row items-center justify-between gap-8 max-w-7xl mx-auto relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ExternalLink className="h-40 w-40 text-white" />
                </div>
                <div className="flex-1 relative">
                    <h4 className="text-lg font-black text-white mb-1 uppercase tracking-widest poppins">Custom Node Integration?</h4>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Our sysops team can facilitate direct bridges to any proprietary API or service cluster.</p>
                </div>
                <button className="whitespace-nowrap px-10 py-4 bg-admin-red text-white border border-admin-red rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-admin-red-dark hover:scale-105 transition-all shadow-xl shadow-admin-red/20 relative active:scale-95">
                    Consult SysAdmin
                </button>
            </div>
        </div>
    );
};

export default Integrations;
