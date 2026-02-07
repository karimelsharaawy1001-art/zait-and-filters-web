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
    const [converting, setConverting] = useState(false);

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

    const handleConvertToOrder = async (cart) => {
        if (!window.confirm("Convert this abandoned cart into a formal order? This will mark it as recovered.")) return;

        setConverting(true);
        const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
        const SETTINGS_COLLECTION = 'settings';

        try {
            // 1. Get Next Order Number
            let nextNumber = 3501;
            try {
                const counterDoc = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, 'counters');
                nextNumber = (counterDoc.lastOrderNumber || 3500) + 1;
                await databases.updateDocument(DATABASE_ID, SETTINGS_COLLECTION, 'counters', {
                    lastOrderNumber: nextNumber
                });
            } catch (e) {
                console.warn("Counter sync failed", e);
                nextNumber = parseInt(Date.now().toString().slice(-6));
            }

            // 2. Prepare Order Payload
            const appwritePayload = {
                orderNumber: String(nextNumber),
                userId: cart.uid || 'guest',
                customerInfo: JSON.stringify({
                    name: cart.customerName || 'Guest',
                    phone: cart.customerPhone || '',
                    email: cart.email || '',
                    address: cart.customerAddress || '',
                    governorate: cart.customerGovernorate || '',
                    city: cart.customerCity || ''
                }),
                items: typeof cart.items === 'string' ? cart.items : JSON.stringify(cart.items),
                subtotal: cart.total,
                discount: 0,
                shippingCost: 0,
                total: cart.total,
                paymentMethod: 'Manual Recovery',
                paymentType: 'offline',
                paymentStatus: 'Pending',
                status: 'Processing',
                shippingAddress: JSON.stringify({
                    address: cart.customerAddress || '',
                    governorate: cart.customerGovernorate || '',
                    city: cart.customerCity || ''
                }),
                createdAt: new Date().toISOString(),
                notes: `Manually converted from Abandoned Cart ${cart.id}`
            };

            // 3. Create Order
            const result = await databases.createDocument(DATABASE_ID, ORDERS_COLLECTION, ID.unique(), appwritePayload);

            // 4. Mark Cart as Recovered
            await databases.updateDocument(DATABASE_ID, ABANDONED_COLLECTION, cart.id, {
                recovered: true,
                recoveredAt: new Date().toISOString(),
                orderId: result.$id
            });

            toast.success("Operational chain restored: Order created successfully!");

            // Update local state
            setCarts(prev => prev.map(c => c.id === cart.id ? { ...c, recovered: true, orderId: result.$id } : c));
            setIsModalOpen(false);
        } catch (error) {
            console.error("Conversion failed:", error);
            toast.error("Protocol failure: Could not convert cart to order.");
        } finally {
            setConverting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Conversion Intelligence" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Abandoned Matrix</h2>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Monitoring {carts.length} Lost Operational Chains</p>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        {['all', 'pending', 'recovered'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{f}</button>
                        ))}
                    </div>
                </div>

                <div className="admin-card-compact overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full admin-table-dense">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="text-left">Consignee Potential</th>
                                    <th className="text-left">Cart Telemetry</th>
                                    <th className="text-left">Last Protocol</th>
                                    <th className="text-center">Security State</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? <tr><td colSpan="5" className="p-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-3" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest">Accessing Logs...</p></td></tr> : filteredCarts.map(cart => (
                                    <tr key={cart.id} className="hover:bg-slate-50/50 group transition-all">
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[13px] font-bold text-slate-900 flex items-center gap-2 italic">{cart.customerName || 'Anonymous Node'}</span>
                                                <div className="flex items-center gap-3">
                                                    {cart.customerPhone && <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5"><Phone size={10} /> {cart.customerPhone}</span>}
                                                    {cart.email && <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5"><Mail size={10} /> {cart.email}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[14px] font-bold text-slate-900">{cart.total?.toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">EGP</span></span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{cart.items?.length || 0} Payload Units</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1.5">
                                                {getStageBadge(cart.lastStepReached)}
                                                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Clock size={10} /> {cart.lastModified.toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {cart.recovered ? (
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-bold uppercase border border-emerald-100">Recovered</span>
                                            ) : cart.emailSent ? (
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase border border-blue-100">Reminded</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase border border-slate-200">Dormant</span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-all">
                                                <button onClick={() => { setSelectedCart(cart); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="View Diagnostic"><Eye size={14} /></button>
                                                <button onClick={() => openWhatsApp(cart.customerPhone)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Relay Comm"><MessageCircle size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isModalOpen && selectedCart && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                        <div className="bg-white rounded-2xl w-full max-w-2xl relative overflow-hidden flex flex-col max-h-[85vh] shadow-2xl border border-slate-200">
                            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Diagnostic Report</h3>
                                    <p className="text-sm font-bold italic">Cart Registry: {selectedCart.id.slice(-6).toUpperCase()}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"><X size={18} /></button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-6">
                                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="admin-text-subtle mb-1.5">Node Identity</p>
                                        <p className="text-sm font-bold text-slate-900">{selectedCart.customerName || 'Anonymous Guest'}</p>
                                        <div className="flex flex-col gap-1 mt-2">
                                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Phone size={10} />{selectedCart.customerPhone || 'Silent'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Mail size={10} />{selectedCart.email || 'Silent'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg relative overflow-hidden">
                                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5">Potential Yield</p>
                                        <p className="text-2xl font-bold italic">{selectedCart.total?.toLocaleString()} <span className="text-[10px] text-slate-400 not-italic uppercase ml-1">EGP</span></p>
                                        <ShoppingBag className="absolute right-[-10px] bottom-[-10px] opacity-10" size={60} />
                                    </div>
                                </section>
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <Zap size={14} className="text-amber-500" />
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payload Registry</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedCart.items?.map((item, i) => (
                                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 flex gap-4 items-center group hover:bg-slate-50 transition-all">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                                    <img src={item.image} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="text-[11px] font-bold text-slate-900 truncate uppercase">{item.name}</h5>
                                                    <div className="flex gap-2 mt-0.5">
                                                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded uppercase border border-emerald-100">{item.brand || 'Generic'}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{item.category}</span>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Quantity: {item.quantity}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-900">{item.price?.toLocaleString()} <span className="text-[8px] font-medium text-slate-400 uppercase ml-0.5">EGP</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 shrink-0">
                                {!selectedCart.recovered && (
                                    <button
                                        onClick={() => handleConvertToOrder(selectedCart)}
                                        disabled={converting}
                                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 mb-2 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {converting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                        Convert to Successful Order
                                    </button>
                                )}
                                <button onClick={() => openWhatsApp(selectedCart.customerPhone)} className="flex-1 admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 justify-center py-3 text-[10px] uppercase shadow-lg shadow-slate-900/10">
                                    <MessageCircle size={14} /> WhatsApp Link
                                </button>
                                <button onClick={() => selectedCart.email && (window.location.href = `mailto:${selectedCart.email}?subject=Zait %26 Filters: We miss your engine!&body=Hi ${selectedCart.customerName || 'there'}, we noticed you left some items in your cart...`)} className="flex-1 admin-btn-slim bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 justify-center py-3 text-[10px] uppercase shadow-sm">
                                    <Mail size={14} /> Email Relay
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AbandonedCarts;
