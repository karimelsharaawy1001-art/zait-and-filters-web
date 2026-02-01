import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
    ShoppingBag,
    User,
    Phone,
    Mail,
    Clock,
    CheckCircle2,
    AlertCircle,
    Eye,
    Send,
    MessageCircle,
    X,
    Loader2,
    Filter,
    ArrowUpDown,
    ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const AbandonedCarts = () => {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCart, setSelectedCart] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // all, pending, recovered

    useEffect(() => {
        const q = query(collection(db, 'abandoned_carts'), orderBy('lastModified', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cartsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastModified: doc.data().lastModified?.toDate() || new Date()
            }));
            setCarts(cartsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching abandoned carts:", error);
            toast.error("Failed to load abandoned carts.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredCarts = carts.filter(cart => {
        if (filter === 'all') return true;
        if (filter === 'recovered') return cart.recovered === true;
        if (filter === 'pending') return cart.recovered !== true;
        return true;
    });

    const getStatusBadge = (cart) => {
        if (cart.recovered) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-admin-green/10 text-admin-green border border-admin-green/10">
                    <CheckCircle2 className="w-3 h-3" />
                    Recovered
                </span>
            );
        }
        if (cart.emailSent) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-admin-accent/10 text-admin-accent border border-admin-accent/10">
                    <Send className="w-3 h-3" />
                    Email Sent
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-admin-yellow/10 text-admin-yellow border border-admin-yellow/10">
                <AlertCircle className="w-3 h-3" />
                Pending
            </span>
        );
    };

    const getStageBadge = (stage) => {
        const styles = {
            'Cart Page': 'bg-gray-100 text-admin-text-secondary border-gray-200',
            'Shipping Info': 'bg-admin-yellow/10 text-admin-yellow border-admin-yellow/20',
            'Payment Selection': 'bg-purple-100 text-purple-600 border-purple-200'
        };
        return (
            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${styles[stage] || 'bg-gray-100 text-admin-text-secondary border-gray-200'}`}>
                {stage || 'Unknown'}
            </span>
        );
    };

    const openWhatsApp = (phone, cart) => {
        if (!phone) {
            toast.error("Phone number not available.");
            return;
        }
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `أهلاً يا بطل! 👋 بنفكرك إنك سيبت قطع أصلية في سلتك في Zait & Filters. محتاج أي مساعدة عشان تكمل شروتك؟`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const viewDetails = (cart) => {
        setSelectedCart(cart);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 space-y-6 bg-admin-bg min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-admin-text-primary flex items-center gap-3 uppercase tracking-widest poppins">
                        <ShoppingBag className="w-8 h-8 text-admin-accent" />
                        Abandoned Carts
                    </h1>
                    <p className="text-gray-500 text-sm font-bold mt-1">Monitor and recover lost sales from abandoned sessions.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-admin-border shadow-sm">
                    {['all', 'pending', 'recovered'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-admin-red hover:bg-admin-red-dark text-white shadow-lg shadow-admin-red/40' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
                        >
                            {f.charAt(0) + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-admin-accent animate-spin" />
                    <p className="text-admin-text-primary font-black uppercase tracking-widest text-[10px]">Loading carts...</p>
                </div>
            ) : filteredCarts.length === 0 ? (
                <div className="bg-admin-card rounded-3xl border border-dashed border-admin-border p-20 text-center shadow-admin">
                    <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-admin-text-primary uppercase tracking-widest poppins">No abandoned carts found</h3>
                    <p className="text-gray-500 font-bold">When users leave items in their cart, they will appear here.</p>
                </div>
            ) : (
                <div className="bg-admin-card rounded-3xl shadow-admin border border-admin-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-admin-border">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest">Customer Info</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest">Cart Details</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest">Stage</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest">Recovery Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-admin-border">
                                {filteredCarts.map((cart) => (
                                    <tr key={cart.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-sm font-black text-admin-text-primary flex items-center gap-2 poppins">
                                                    <User className="w-4 h-4 text-admin-accent/60" />
                                                    {cart.customerName || 'Anonymous Guest'}
                                                </span>
                                                {cart.customerPhone && (
                                                    <span className="text-xs text-admin-text-secondary flex items-center gap-2 font-bold uppercase tracking-widest">
                                                        <Phone className="w-3.5 h-3.5 text-admin-yellow/60" />
                                                        {cart.customerPhone}
                                                    </span>
                                                )}
                                                {cart.email && (
                                                    <span className="text-xs text-admin-text-secondary flex items-center gap-2 font-bold uppercase tracking-widest">
                                                        <Mail className="w-3.5 h-3.5 text-purple-400/60" />
                                                        {cart.email}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-admin-accent poppins">{cart.total?.toLocaleString()} <span className="text-[10px] opacity-60">EGP</span></span>
                                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{cart.items?.length || 0} items</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {getStageBadge(cart.lastStepReached)}
                                            <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                                <Clock className="w-3.5 h-3.5 text-admin-accent/40" />
                                                {cart.lastModified.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {getStatusBadge(cart)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-end gap-2 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                                <button
                                                    onClick={() => viewDetails(cart)}
                                                    className="p-2.5 text-gray-500 hover:text-admin-accent hover:bg-admin-accent/5 rounded-xl transition-all shadow-sm"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => openWhatsApp(cart.customerPhone, cart)}
                                                    className="p-2.5 text-gray-500 hover:text-admin-green hover:bg-admin-green/10 rounded-xl transition-all shadow-lg"
                                                    title="WhatsApp Reminder"
                                                >
                                                    <MessageCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && selectedCart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-admin-border">
                        <div className="p-8 border-b border-admin-border flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-black text-admin-text-primary uppercase tracking-widest poppins">Cart Details</h2>
                                <p className="text-[10px] text-gray-500 font-black mt-1 uppercase tracking-widest">ID: {selectedCart.id}</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all text-gray-500 hover:text-black border border-admin-border shadow-sm"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Customer Info Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-5 rounded-2xl bg-gray-50 border border-admin-border shadow-sm">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Customer</label>
                                    <p className="text-sm font-black text-admin-text-primary poppins">{selectedCart.customerName || 'Anonymous Guest'}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-gray-50 border border-admin-border shadow-sm">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Phone</label>
                                    <p className="text-sm font-black text-admin-accent poppins">{selectedCart.customerPhone || 'N/A'}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-gray-50 border border-admin-border shadow-sm col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Email</label>
                                    <p className="text-sm font-black text-purple-600 poppins">{selectedCart.email || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Item List */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <ShoppingBag className="w-3 h-3" />
                                    Items in Cart ({selectedCart.items?.length || 0})
                                </h3>
                                <div className="space-y-3">
                                    {selectedCart.items?.map((item, idx) => (
                                        <div key={idx} className="flex gap-5 p-4 rounded-2xl bg-white border border-admin-border hover:border-admin-accent/30 transition-all items-center shadow-sm">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-admin-border">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-admin-text-primary poppins mb-1">{item.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.brand} • {item.quantity} units</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-admin-text-primary poppins">{item.price?.toLocaleString()} <span className="text-[10px] opacity-40">EGP</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cart Summary */}
                            <div className="p-8 rounded-3xl bg-admin-accent/5 border border-admin-accent/10 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-black text-admin-accent uppercase tracking-widest poppins">Potential Value</span>
                                    <span className="text-3xl font-black text-admin-text-primary poppins">{selectedCart.total?.toLocaleString()} <span className="text-sm font-normal text-gray-500">EGP</span></span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Calculated from item total values</p>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-admin-border flex gap-4">
                            <button
                                onClick={() => openWhatsApp(selectedCart.customerPhone, selectedCart)}
                                className="flex-1 bg-admin-green text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-admin-green/20 hover:scale-105 uppercase tracking-widest text-xs"
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp Reminder
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedCart.email) {
                                        window.location.href = `mailto:${selectedCart.email}?subject=We miss you at ZAIT %26 FILTERS!&body=Hi ${selectedCart.customerName || 'there'}, we noticed you left some items in your cart...`;
                                    } else {
                                        toast.error("Email not available.");
                                    }
                                }}
                                className="flex-1 bg-admin-red hover:bg-admin-red-dark text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-admin-red/40 hover:scale-105 uppercase tracking-widest text-xs"
                            >
                                <Mail className="w-5 h-5" />
                                Send Manual Email
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AbandonedCarts;
