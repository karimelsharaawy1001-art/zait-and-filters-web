import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
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

    useEffect(() => {
        const fetchAbandonedCarts = async () => {
            setLoading(true);
            try {
                const cartsRef = collection(db, 'carts'); // Assuming 'carts' is the collection name in Firestore
                // Note: You might need to adjust the query if you only want abandoned ones (e.g., waiting > X time)
                // For now, listing all recently modified carts
                const q = query(cartsRef, orderBy('lastModified', 'desc'), limit(100));

                const querySnapshot = await getDocs(q);
                const fetchedCarts = querySnapshot.docs.map(doc => {
                    const data = doc.data();

                    // Handle potential nested objects vs JSON strings for compatibility
                    let items = data.items;
                    if (typeof items === 'string') {
                        try {
                            items = JSON.parse(items);
                        } catch (e) {
                            items = [];
                        }
                    } else if (!Array.isArray(items)) {
                        items = [];
                    }

                    // Parse Last Modified
                    let lastModifiedDate = new Date();
                    if (data.lastModified && data.lastModified.seconds) {
                        lastModifiedDate = new Date(data.lastModified.seconds * 1000);
                    } else if (data.updatedAt) {
                        lastModifiedDate = new Date(data.updatedAt);
                    }

                    return {
                        id: doc.id,
                        ...data,
                        items: items,
                        lastModified: lastModifiedDate
                    };
                });

                // Filter out empty carts or active ones if necessary? 
                // For "Abandoned", usually checks if updated > 1 hour ago and status != completed
                // Adapting strictly to previous logic which just listed all from collection
                setCarts(fetchedCarts);
            } catch (error) {
                console.error("Error fetching abandoned carts:", error);
                toast.error("Failed to load abandoned carts.");
            } finally {
                setLoading(false);
            }
        };

        fetchAbandonedCarts();
    }, []);

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

        try {
            // 1. Get Next Order Number using Transaction
            let nextNumber = 3501;
            const counterRef = doc(db, 'settings', 'counters');

            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (!counterDoc.exists()) {
                    transaction.set(counterRef, { lastOrderNumber: 3500 });
                    nextNumber = 3501;
                } else {
                    const currentLast = counterDoc.data().lastOrderNumber || 3500;
                    nextNumber = currentLast + 1;
                    transaction.update(counterRef, { lastOrderNumber: nextNumber });
                }
            });

            // 2. Prepare Order Payload
            const orderPayload = {
                orderNumber: String(nextNumber),
                userId: cart.uid || 'guest',
                customerInfo: {
                    name: cart.customerName || 'Guest',
                    phone: cart.customerPhone || '',
                    email: cart.email || '',
                    address: cart.customerAddress || '',
                    governorate: cart.customerGovernorate || '',
                    city: cart.customerCity || ''
                },
                items: cart.items, // Firestore supports arrays/objects natively
                subtotal: cart.total || 0,
                discount: 0,
                shippingCost: 0,
                total: cart.total || 0,
                paymentMethod: 'Manual Recovery',
                paymentType: 'offline',
                paymentStatus: 'Pending',
                status: 'Processing',
                shippingAddress: {
                    address: cart.customerAddress || '',
                    governorate: cart.customerGovernorate || '',
                    city: cart.customerCity || ''
                },
                createdAt: new Date().toISOString(), // Use ISO string for consistency or serverTimestamp()
                notes: `Manually converted from Abandoned Cart ${cart.id}`
            };

            // 3. Create Order
            const ordersRef = collection(db, 'orders'); // Using 'orders' collection
            const newOrderRef = doc(ordersRef); // Generate ID automatically
            await setDoc(newOrderRef, orderPayload);

            // 4. Mark Cart as Recovered
            const cartRef = doc(db, 'carts', cart.id);
            await updateDoc(cartRef, {
                recovered: true,
                recoveredAt: new Date().toISOString(),
                orderId: newOrderRef.id
            });

            toast.success("Operational chain restored: Order created successfully!");

            // Update local state
            setCarts(prev => prev.map(c => c.id === cart.id ? { ...c, recovered: true, orderId: newOrderRef.id } : c));
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
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-tighter text-slate-400 italic">Consignee Potential</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-tighter text-slate-400 italic">Cart Telemetry</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-tighter text-slate-400 italic">Last Protocol</th>
                                    <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-tighter text-slate-400 italic">Security State</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-tighter text-slate-400 italic">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? <tr><td colSpan="5" className="p-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-3" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest">Accessing Logs...</p></td></tr> : filteredCarts.map(cart => (
                                    <tr key={cart.id} className="hover:bg-slate-50/50 group transition-all">
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[14px] font-black text-slate-900 group-hover:text-emerald-600 transition-colors uppercase italic tracking-tighter">{cart.customerName || 'Anonymous Node'}</span>
                                                <div className="flex items-center gap-3">
                                                    {cart.customerPhone && <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase"><Phone size={10} className="text-slate-300" /> {cart.customerPhone}</span>}
                                                    {cart.email && <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase"><Mail size={10} className="text-slate-300" /> {cart.email}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[16px] font-black text-slate-900 italic tracking-tighter">{cart.total?.toLocaleString()} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">EGP</span></span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cart.items?.length || 0} Payload Units</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1.5">
                                                {getStageBadge(cart.lastStepReached)}
                                                <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-wider"><Clock size={10} className="text-slate-300" /> {cart.lastModified.toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {cart.recovered ? (
                                                <span className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 border border-emerald-400">Recovered</span>
                                            ) : cart.emailSent ? (
                                                <span className="px-3 py-1 bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 border border-blue-400">Reminded</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-white text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">Dormant</span>
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
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-amber-500" />
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payload Registry</h4>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-300 uppercase">{selectedCart.items?.length || 0} Nodes</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {selectedCart.items?.map((item, i) => (
                                            <div key={i} className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 flex gap-4 items-center group hover:bg-white hover:shadow-md hover:border-slate-200 transition-all duration-300">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h5 className="text-[12px] font-black text-slate-900 truncate uppercase tracking-tight">{item.name}</h5>
                                                    </div>

                                                    {/* Car Spec Telemetry */}
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        {(item.make || item.model) && (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase tracking-wider">
                                                                {item.make} {item.model}
                                                            </div>
                                                        )}
                                                        {(item.yearStart || item.yearEnd || item.yearRange) && (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase border border-slate-200">
                                                                <Clock size={8} /> {item.yearRange || `${item.yearStart}${item.yearEnd ? `-${item.yearEnd}` : ''}`}
                                                            </div>
                                                        )}
                                                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase border border-emerald-100">{item.brand || 'Generic'}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{item.category}</span>
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase">Quantity: <span className="text-slate-900">{item.quantity}</span></p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase">Unit: <span className="text-slate-900">{item.price?.toLocaleString()} EGP</span></p>
                                                    </div>
                                                </div>
                                                <div className="text-right pl-2">
                                                    <p className="text-[13px] font-black text-slate-900">{(item.price * item.quantity).toLocaleString()} <span className="text-[9px] text-slate-400 font-medium">EGP</span></p>
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
