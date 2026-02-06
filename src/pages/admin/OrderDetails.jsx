import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Loader2, ArrowLeft, Edit2, Clock, Package, User, MapPin, CreditCard, AlertCircle, X, Search, PlusCircle, Minus, Plus, Trash2, Save, ShoppingBag, Truck, Gift, CheckCircle2, DollarSign
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import { useStaticData } from '../../context/StaticDataContext';
import { normalizeArabic } from '../../utils/productUtils';

const OrderDetails = () => {
    const { staticProducts, isStaticLoaded } = useStaticData();
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [enrichedItems, setEnrichedItems] = useState([]);
    const [updating, setUpdating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ paymentStatus: '', paymentMethod: '', status: '', items: [], extraFees: 0, manualDiscount: 0, notes: '' });
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID;

    const fetchOrder = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const data = await databases.getDocument(DATABASE_ID, ORDERS_COLLECTION, id);
            setOrder({ id: data.$id, ...data });
            if (data.isOpened === false) await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, { isOpened: true });
        } catch (error) {
            toast.error('Registry not found');
            navigate('/admin/orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [id, DATABASE_ID]);

    useEffect(() => {
        const fetchProductDetails = async () => {
            if (!order?.items || !PRODUCTS_COLLECTION) return;
            try {
                const enriched = await Promise.all(order.items.map(async (item) => {
                    try {
                        const productData = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.id);
                        return { ...item, brand: productData.brand || item.brand, category: productData.category || item.category, sku: productData.sku || item.sku };
                    } catch { return item; }
                }));
                setEnrichedItems(enriched);
            } catch (err) { console.error(err); }
        };
        if (order) fetchProductDetails();
    }, [order, DATABASE_ID]);

    const handleStatusUpdate = async (newStatus) => {
        setUpdating(true);
        try {
            const payload = { status: newStatus };
            if (newStatus === 'Delivered') payload.deliveryDate = new Date().toISOString();
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, payload);
            setOrder(prev => ({ ...prev, status: newStatus }));
            toast.success(`Protocol status: ${newStatus}`);
        } catch (err) { toast.error("Sync failure"); }
        finally { setUpdating(false); }
    };

    const handleSaveEdit = async () => {
        setUpdating(true);
        try {
            const subtotal = editForm.items.reduce((acc, i) => acc + (parseFloat(i.price) * i.quantity), 0);
            const total = subtotal + parseFloat(order.shipping_cost || 0) + parseFloat(editForm.extraFees || 0) - parseFloat(order.discount || 0) - parseFloat(editForm.manualDiscount || 0);
            const payload = { ...editForm, subtotal, total, updatedAt: new Date().toISOString() };
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, payload);
            setOrder(prev => ({ ...prev, ...payload }));
            setShowEditModal(false);
            toast.success("Order parameters synchronized");
        } catch (err) { toast.error("Update failure"); }
        finally { setUpdating(false); }
    };

    if (loading) return <div className="p-20 text-center uppercase font-black text-[10px] text-gray-400 font-Cairo"><Loader2 className="animate-spin mx-auto mb-4" /> Analyzing Registry Node...</div>;

    const currentItems = enrichedItems.length > 0 ? enrichedItems : order.items;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title={`Protocol Diagnostic #${order.orderNumber}`} />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => navigate('/admin/orders')} className="bg-white px-6 py-3 rounded-xl border font-black uppercase italic text-[10px] shadow-sm flex items-center gap-2 hover:bg-black hover:text-white transition-all"><ArrowLeft size={14} /> Registry Index</button>
                    <div className="flex gap-4">
                        <button onClick={() => { setEditForm({ ...order }); setShowEditModal(true); }} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase italic text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-all"><Edit2 size={16} /> Modify Protocol</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-orange-50 text-orange-600 rounded-3xl border border-orange-100"><Clock size={28} /></div>
                                <div><h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Initialization</h3><p className="text-xl font-black italic">{new Date(order.$createdAt).toGMTString()}</p></div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 block text-right">Phase Control</label>
                                <select value={order.status} onChange={e => handleStatusUpdate(e.target.value)} disabled={updating} className="bg-black text-white px-8 py-3 rounded-2xl font-black uppercase italic text-xs outline-none shadow-xl cursor-pointer">
                                    {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                            <div className="p-8 bg-gray-50/50 border-b flex items-center gap-4"><ShoppingBag className="text-red-600" /><h3 className="text-lg font-black uppercase italic">Itemized Payload</h3></div>
                            <div className="divide-y divide-gray-100">
                                {currentItems.map((item, i) => (
                                    <div key={i} className="p-10 flex gap-10 group hover:bg-gray-50 transition-all">
                                        <img src={item.image} className="w-32 h-32 object-cover rounded-3xl border shadow-lg group-hover:scale-105 transition-all" />
                                        <div className="flex-1 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div><h4 className="text-xl font-black italic uppercase">{item.name}</h4><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">SKU identifier: {item.sku || item.id}</p></div>
                                                <div className="text-right"><p className="text-2xl font-black">{item.price} <span className="text-xs text-gray-400 opacity-50 not-italic">EGP</span></p><p className="text-[10px] font-black py-1 px-3 bg-gray-100 rounded-lg inline-block mt-2">X {item.quantity}</p></div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed text-center"><p className="text-[9px] text-gray-400 font-black uppercase mb-1">Brand</p><p className="text-xs font-black uppercase">{item.brand || 'Universal'}</p></div>
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed text-center"><p className="text-[9px] text-gray-400 font-black uppercase mb-1">Category</p><p className="text-xs font-black uppercase">{item.category || 'Maintenance'}</p></div>
                                                <div className="p-4 bg-orange-50 font-black text-orange-600 rounded-2xl border border-orange-100 text-center"><p className="text-[9px] uppercase mb-1">Unit Subtotal</p><p className="text-xs">{(item.price * item.quantity).toLocaleString()} EGP</p></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-10 bg-black text-white space-y-4">
                                <div className="flex justify-between text-xs font-bold opacity-60 uppercase tracking-widest"><span>Net Subtotal</span><span>{order.subtotal?.toLocaleString()} EGP</span></div>
                                <div className="flex justify-between text-xs font-bold opacity-60 uppercase tracking-widest"><span>Logistics Grant</span><span>+{order.shipping_cost || 0} EGP</span></div>
                                {order.extraFees > 0 && <div className="flex justify-between text-xs font-bold opacity-60 uppercase tracking-widest"><span>Adj. Surcharge</span><span>+{order.extraFees} EGP</span></div>}
                                {order.discount > 0 && <div className="flex justify-between text-xs font-bold text-red-500 uppercase tracking-widest font-black"><span>Campaign Credit</span><span>-{order.discount} EGP</span></div>}
                                <div className="flex justify-between text-3xl font-black italic pt-6 border-t border-white/10 mt-4"><span>Gross Total</span><span className="text-red-600">{order.total?.toLocaleString()} <span className="text-xs text-white opacity-40 not-italic">EGP</span></span></div>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-8">
                        <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                            <div className="flex items-center gap-4 border-b pb-4"><User className="text-red-600" /><h3 className="font-black uppercase italic">Consignee</h3></div>
                            <div><p className="text-xl font-black italic uppercase">{order.customer?.name}</p><p className="text-sm font-bold text-gray-500 mt-1 flex items-center gap-2 italic">{order.customer?.phone}</p></div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed"><p className="text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-2"><MapPin size={12} /> Geolocation</p><p className="text-sm font-black text-red-600 uppercase italic underline">{order.customer?.governorate}</p><p className="text-xs font-bold text-gray-500 mt-2 leading-relaxed">{order.customer?.address}</p></div>
                        </section>

                        <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                            <div className="flex items-center gap-4 border-b pb-4"><CreditCard className="text-red-600" /><h3 className="font-black uppercase italic">Flow Diagnostics</h3></div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400 uppercase">Protocol</span><span className="text-xs font-black uppercase bg-gray-100 px-4 py-2 rounded-xl">{order.paymentMethod}</span></div>
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400 uppercase">Verification</span><span className={`text-xs font-black uppercase px-4 py-2 rounded-xl border ${order.paymentStatus === 'Paid' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>{order.paymentStatus}</span></div>
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                            <div className="flex items-center gap-4 border-b pb-4"><AlertCircle className="text-red-600" /><h3 className="font-black uppercase italic">Terminal Notes</h3></div>
                            <div className="p-5 bg-gray-50 rounded-2xl text-xs font-bold text-gray-500 italic leading-loose">{order.notes || "No operational telemetry recorded."}</div>
                        </section>
                    </div>
                </div>

                {showEditModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowEditModal(false)}></div>
                        <div className="bg-white rounded-[3rem] w-full max-w-2xl relative overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border-4 border-black">
                            <div className="bg-black p-10 text-white flex justify-between items-center"><h3 className="text-xl font-black uppercase italic tracking-wider">Protocol Modifier</h3><button onClick={() => setShowEditModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X /></button></div>
                            <div className="p-10 overflow-y-auto space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Phase Control</label><select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black uppercase italic text-xs outline-none focus:ring-2 focus:ring-black">
                                        {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Verification State</label><select value={editForm.paymentStatus} onChange={e => setEditForm({ ...editForm, paymentStatus: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black uppercase italic text-xs outline-none focus:ring-2 focus:ring-black">
                                        {['Pending', 'Paid'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select></div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Inventory Management</label>
                                    {editForm.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-6 bg-gray-50 p-5 rounded-3xl border group">
                                            <img src={item.image} className="w-16 h-16 rounded-2xl object-cover border shadow-sm" />
                                            <div className="flex-1 min-w-0"><h5 className="font-black text-xs uppercase italic truncate">{item.name}</h5><p className="text-[10px] text-gray-400 font-bold uppercase">{item.price} EGP</p></div>
                                            <div className="flex items-center bg-white rounded-xl border p-1">
                                                <button onClick={() => { const u = [...editForm.items]; u[i].quantity = Math.max(1, u[i].quantity - 1); setEditForm({ ...editForm, items: u }); }} className="p-2 text-gray-400 hover:text-black"><Minus size={14} /></button>
                                                <span className="px-3 font-black text-xs">{item.quantity}</span>
                                                <button onClick={() => { const u = [...editForm.items]; u[i].quantity += 1; setEditForm({ ...editForm, items: u }); }} className="p-2 text-gray-400 hover:text-black"><Plus size={14} /></button>
                                            </div>
                                            <button onClick={() => setEditForm({ ...editForm, items: editForm.items.filter((_, idx) => idx !== i) })} className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Operational Log (Notes)</label><textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full p-5 bg-gray-50 border rounded-3xl font-bold min-h-[100px] outline-none" /></div>
                            </div>
                            <div className="p-10 border-t bg-gray-50 flex gap-6 shrink-0"><button onClick={() => setShowEditModal(false)} className="flex-1 font-black uppercase italic text-xs text-gray-400">Discard Changes</button><button onClick={handleSaveEdit} className="flex-[2] bg-red-600 text-white py-5 rounded-3xl font-black uppercase italic text-xs shadow-2xl hover:scale-105 transition-all">Synchronize Protocol</button></div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrderDetails;
