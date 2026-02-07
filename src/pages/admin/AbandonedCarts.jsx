import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import {
    ShoppingBag, User, Phone, Mail, Clock, CheckCircle2, AlertCircle, Eye, Send, MessageCircle, X, Loader2, Filter, ExternalLink, Zap, MousePointer2, CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';

const AbandonedCarts = () => {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCart, setSelectedCart] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('all');

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const ABANDONED_COLLECTION = import.meta.env.VITE_APPWRITE_ABANDONED_CARTS_COLLECTION_ID || 'abandoned_carts';

    useEffect(() => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = databases.listDocuments(DATABASE_ID, ABANDONED_COLLECTION, [Query.orderDesc('lastModified'), Query.limit(100)]);
            response.then(res => {
                setCarts(res.documents.map(doc => {
                    let items = doc.items;
                    if (typeof items === 'string') {
                        try {
                            items = JSON.parse(items);
                        } catch (e) {
                            items = [];
                        }
                    }
                    return {
                        id: doc.$id,
                        ...doc,
                        items: items,
                        lastModified: new Date(doc.lastModified)
                    };
                }));
                setLoading(false);
            }).catch(() => { toast.error("Conversion logs unreachable"); setLoading(false); });
        } catch (error) { setLoading(false); }
    }, [DATABASE_ID]);

    const filteredCarts = carts.filter(cart => {
        if (filter === 'all') return true;
        return filter === 'recovered' ? cart.recovered === true : cart.recovered !== true;
    });

    const getStageBadge = (stage) => {
        const styles = {
            'Cart Page': 'bg-gray-100 text-gray-500 border-gray-200',
            'Shipping Info': 'bg-orange-50 text-orange-600 border-orange-100',
            'Payment Selection': 'bg-blue-50 text-blue-600 border-blue-100'
        };
        return <span className={`px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest ${styles[stage] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{stage || 'Unknown Protocol'}</span>;
    };

    const openWhatsApp = (phone) => {
        if (!phone) return toast.error("Node silent (No Phone)");
        const message = `أهلاً يا بطل! 👋 بنفكرك إنك سيبت قطع أصلية في سلتك في Zait & Filters. محتاج أي مساعدة عشان تكمل شروتك؟`;
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Conversion Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Abandoned Matrix</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Monitoring {carts.length} Lost Operational Chains</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border shadow-sm">
                        {['all', 'pending', 'recovered'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-black text-white shadow-xl translate-y-[-2px]' : 'text-gray-400 hover:bg-gray-50'}`}>{f}</button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-8 py-6">Consignee Potential</th>
                                <th className="px-8 py-6">Cart Telemetry</th>
                                <th className="px-8 py-6">Last Protocol</th>
                                <th className="px-8 py-6 text-center">Security State</th>
                                <th className="px-8 py-6 text-right">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr> : filteredCarts.map(cart => (
                                <tr key={cart.id} className="hover:bg-gray-50/50 group transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-sm font-black uppercase italic flex items-center gap-2"><User size={14} className="text-orange-600" /> {cart.customerName || 'Anonymous Node'}</span>
                                            {cart.customerPhone && <span className="text-[10px] font-bold text-gray-400 flex items-center gap-2 uppercase"><Phone size={12} /> {cart.customerPhone}</span>}
                                            {cart.email && <span className="text-[10px] font-bold text-gray-400 flex items-center gap-2 uppercase"><Mail size={12} /> {cart.email}</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-lg font-black italic">{cart.total?.toLocaleString()} <span className="text-[10px] opacity-40 not-italic">EGP</span></span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cart.items?.length || 0} Payload Units</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-2">
                                            {getStageBadge(cart.lastStepReached)}
                                            <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-2"><Clock size={12} /> {cart.lastModified.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {cart.recovered ? <span className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-green-100 italic shadow-sm">Recovered</span> : cart.emailSent ? <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-blue-100 italic shadow-sm">Reminded</span> : <span className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-orange-100 italic shadow-sm">Dormant</span>}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                            <button onClick={() => { setSelectedCart(cart); setIsModalOpen(true); }} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Eye size={18} /></button>
                                            <button onClick={() => openWhatsApp(cart.customerPhone)} className="p-3 bg-white text-green-600 border rounded-xl shadow-xl hover:bg-green-600 hover:text-white transition-all"><MessageCircle size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && selectedCart && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                        <div className="bg-white rounded-[3.5rem] w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border-4 border-black">
                            <div className="bg-black p-10 text-white flex justify-between items-center"><h3 className="text-xl font-black uppercase italic tracking-widest">Cart Diagnostic Manifest</h3><button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X /></button></div>
                            <div className="p-10 overflow-y-auto space-y-10">
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-dashed"><p className="text-[10px] font-black text-gray-400 uppercase mb-2">Consignee Identity</p><p className="text-lg font-black italic uppercase">{selectedCart.customerName || 'Anonymous Guest'}</p><div className="flex gap-4 mt-2"><p className="text-[10px] font-bold text-gray-500 italic">{selectedCart.customerPhone}</p><p className="text-[10px] font-bold text-gray-500 italic">{selectedCart.email}</p></div></div>
                                    <div className="bg-black text-white p-6 rounded-3xl shadow-xl relative overflow-hidden"><p className="text-[10px] font-black text-red-600 uppercase mb-2">Potential Loss</p><p className="text-3xl font-black italic">{selectedCart.total?.toLocaleString()} <span className="text-xs opacity-40 not-italic">EGP</span></p><ShoppingBag className="absolute right-[-10px] bottom-[-10px] opacity-10" size={80} /></div>
                                </section>
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4 border-b pb-4"><Zap size={20} className="text-orange-600" /><h4 className="font-black uppercase italic tracking-widest">Payload Registry</h4></div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {selectedCart.items?.map((item, i) => (
                                            <div key={i} className="bg-white p-6 rounded-[2rem] border hover:border-black transition-all flex gap-8 items-center group shadow-sm">
                                                <img src={item.image} className="w-20 h-20 object-cover rounded-2xl border shadow-md group-hover:scale-110 transition-all" />
                                                <div className="flex-1 min-w-0"><h5 className="font-black text-sm uppercase italic truncate">{item.name}</h5><div className="flex gap-4 mt-1"><span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{item.brand || 'No Brand'}</span><span className="text-[10px] font-bold text-gray-400 uppercase">{item.category}</span></div><p className="text-[9px] font-black uppercase mt-1 opacity-50">{item.quantity} UNITS</p></div>
                                                <div className="text-right"><p className="text-xl font-black italic">{item.price?.toLocaleString()} <span className="text-[10px] not-italic opacity-40">EGP</span></p></div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                            <div className="p-10 border-t bg-gray-50 flex gap-6 shrink-0"><button onClick={() => openWhatsApp(selectedCart.customerPhone)} className="flex-1 bg-green-600 text-white py-5 rounded-3xl font-black uppercase italic text-xs shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"><MessageCircle size={18} /> WhatsApp Relay</button><button onClick={() => selectedCart.email && (window.location.href = `mailto:${selectedCart.email}?subject=Zait %26 Filters: We miss your engine!&body=Hi ${selectedCart.customerName || 'there'}, we noticed you left some items in your cart...`)} className="flex-1 bg-red-600 text-white py-5 rounded-3xl font-black uppercase italic text-xs shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"><Mail size={18} /> Secure Email</button></div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AbandonedCarts;
