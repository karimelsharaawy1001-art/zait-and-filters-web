import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { ID, Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Ticket, Plus, Trash2, Loader2, Truck, Gift, CreditCard, Tag, Percent, Calendar, User, X, CheckCircle, XCircle } from 'lucide-react';

const PROMO_TYPES = [
    { id: 'discount', name: 'Standard Discount', icon: <Percent className="w-5 h-5" />, description: 'Percentage or Fixed amount off subtotal' },
    { id: 'free_shipping_threshold', name: 'Free Delivery (Threshold)', icon: <Truck className="w-5 h-5" />, description: 'Free shipping if Subtotal > X' },
    { id: 'payment_method_shipping', name: 'Free Delivery (Logic)', icon: <CreditCard className="w-5 h-5" />, description: 'Free shipping for specific payment flows' },
    { id: 'product_gift', name: 'Product Gift', icon: <Gift className="w-5 h-5" />, description: 'Reward specific purchases with gifts' },
];

const ManagePromoCodes = () => {
    const [codes, setCodes] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const [formData, setFormData] = useState({
        code: '', type: 'discount', value: 0, isPercentage: true,
        minOrderValue: 0, usageLimit: 100, usedCount: 0,
        requiredPaymentMethod: 'online', targetProductId: '', giftProductId: '', isActive: true
    });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PROMO_COLLECTION = import.meta.env.VITE_APPWRITE_PROMO_CODES_COLLECTION_ID || 'promo_codes';
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const fetchData = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const [promoSnap, prodSnap] = await Promise.all([
                databases.listDocuments(DATABASE_ID, PROMO_COLLECTION, [Query.orderDesc('$createdAt'), Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [Query.limit(100)])
            ]);
            setCodes(promoSnap.documents.map(d => ({ id: d.$id, ...d })));
            setProducts(prodSnap.documents.map(d => ({ id: d.$id, name: d.name || d.nameEn })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [DATABASE_ID]);

    const handleAdd = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                ...formData,
                code: formData.code.toUpperCase().trim(),
                value: Number(formData.value),
                minOrderValue: Number(formData.minOrderValue),
                usageLimit: Number(formData.usageLimit),
                createdAt: new Date().toISOString()
            };
            await databases.createDocument(DATABASE_ID, PROMO_COLLECTION, ID.unique(), payload);
            setShowAddForm(false);
            setFormData({ code: '', type: 'discount', value: 0, isPercentage: true, minOrderValue: 0, usageLimit: 100, usedCount: 0, requiredPaymentMethod: 'online', targetProductId: '', giftProductId: '', isActive: true });
            fetchData();
            toast.success("Campaign launched");
        } catch (error) {
            toast.error("Sync failure");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge campaign?")) return;
        try {
            await databases.deleteDocument(DATABASE_ID, PROMO_COLLECTION, id);
            fetchData();
            toast.success("Resource deleted");
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const handleToggleStatus = async (promo) => {
        try {
            await databases.updateDocument(DATABASE_ID, PROMO_COLLECTION, promo.id, { isActive: !promo.isActive });
            fetchData();
            toast.success("Status synced");
        } catch (error) {
            toast.error("Update failed");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Promotion Engine" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Campaign Registry</h2>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Monitoring: {codes.length} active protocols</p>
                    </div>
                    {!showAddForm && (
                        <button onClick={() => setShowAddForm(true)} className="admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10">
                            <Plus size={14} /> New Campaign
                        </button>
                    )}
                </div>

                {showAddForm && (
                    <section className="admin-card-compact p-6 mb-8 space-y-6 animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Protocol Configuration</h3>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Define logic constraints and rewards</p>
                            </div>
                            <button onClick={() => setShowAddForm(false)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="admin-text-subtle ml-1">Registry Code</label>
                                    <input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold italic outline-none focus:ring-1 focus:ring-slate-900 transition-all" placeholder="SUMMER25" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="admin-text-subtle ml-1">Strategy Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-slate-900 transition-all">
                                        {PROMO_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="admin-text-subtle ml-1">Global Limit</label>
                                    <input type="number" value={formData.usageLimit} onChange={e => setFormData({ ...formData, usageLimit: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" required />
                                </div>
                            </div>
                            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="text-[9px] font-bold uppercase text-amber-600 block mb-1 tracking-widest">Logic Constraints</h4>
                                {formData.type === 'discount' && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <input type="number" placeholder="Value" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-slate-900" required />
                                            <button type="button" onClick={() => setFormData({ ...formData, isPercentage: !formData.isPercentage })} className={`px-4 rounded-lg font-bold text-[10px] transition-all ${formData.isPercentage ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>{formData.isPercentage ? '%' : 'EGP'}</button>
                                        </div>
                                        <input type="number" placeholder="Min. Order Value" value={formData.minOrderValue} onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900" />
                                    </div>
                                )}
                                {formData.type === 'free_shipping_threshold' && (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Grant delivery for subtotal &gt;=</label>
                                        <input type="number" value={formData.minOrderValue} onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-lg font-bold text-slate-900" required />
                                    </div>
                                )}
                                {formData.type === 'payment_method_shipping' && (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase text-slate-400">Exclusive Reward for</label>
                                        <select value={formData.requiredPaymentMethod} onChange={e => setFormData({ ...formData, requiredPaymentMethod: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase">
                                            <option value="online">Online Gateway Only</option>
                                            <option value="cod">Cash on Delivery</option>
                                        </select>
                                    </div>
                                )}
                                {formData.type === 'product_gift' && (
                                    <div className="space-y-3">
                                        <select value={formData.targetProductId} onChange={e => setFormData({ ...formData, targetProductId: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase">
                                            <option value="">Select Trigger SKU</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <select value={formData.giftProductId} onChange={e => setFormData({ ...formData, giftProductId: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase">
                                            <option value="">Select Reward SKU</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col justify-end space-y-4">
                                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg space-y-1.5">
                                    <h5 className="text-[8px] font-bold uppercase text-emerald-400 tracking-widest">Projection</h5>
                                    <p className="text-[11px] font-medium leading-relaxed italic opacity-80">
                                        {formData.type === 'discount' && `Incentivize with ${formData.value}${formData.isPercentage ? '%' : ' EGP'} reduction ${formData.minOrderValue > 0 ? `for orders above ${formData.minOrderValue} EGP` : ''}.`}
                                        {formData.type === 'free_shipping_threshold' && `Universal delivery grant for all orders surpassing ${formData.minOrderValue} EGP.`}
                                        {formData.type === 'payment_method_shipping' && `Optimize ${formData.requiredPaymentMethod} conversion by zeroing delivery fees.`}
                                        {formData.type === 'product_gift' && `Complementary asset injection strategy for target high-value SKU.`}
                                    </p>
                                </div>
                                <button type="submit" disabled={actionLoading} className="w-full admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 justify-center py-3 text-xs uppercase shadow-lg shadow-slate-900/10">
                                    {actionLoading ? 'Deploying...' : 'Launch Protocol'}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                <div className="admin-card-compact overflow-hidden">
                    {loading ? (
                        <div className="p-16 text-center text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                            <p className="text-xs font-medium uppercase tracking-widest">Accessing Logs...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full admin-table-dense">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="text-left">Code & Core</th>
                                        <th className="text-left">Strategy Profile</th>
                                        <th className="text-center">Velocity (Usage)</th>
                                        <th className="text-center">Phase</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {codes.map(promo => (
                                        <tr key={promo.id} className="hover:bg-slate-50/50 group transition-all">
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[13px] font-bold text-slate-900 italic tracking-wider px-2 py-1 bg-slate-50 border border-slate-100 rounded-md inline-block w-fit">{promo.code}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(promo.$createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-all">{PROMO_TYPES.find(t => t.id === promo.type)?.icon || <Tag size={16} />}</div>
                                                    <div>
                                                        <h4 className="text-[12px] font-bold text-slate-800 leading-tight">{PROMO_TYPES.find(t => t.id === promo.type)?.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {promo.type === 'discount' && `${promo.value}${promo.isPercentage ? '%' : ' EGP'} Off ${promo.minOrderValue > 0 ? `(Orders > ${promo.minOrderValue})` : ''}`}
                                                            {promo.type === 'free_shipping_threshold' && `Free Shipping > ${promo.minOrderValue} EGP`}
                                                            {promo.type === 'payment_method_shipping' && `Gateway: ${promo.requiredPaymentMethod.toUpperCase()}`}
                                                            {promo.type === 'product_gift' && `Gift Distribution Logic`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase"><span className="text-slate-900">{promo.usedCount}</span><span className="text-slate-300">/</span><span className="text-slate-400">{promo.usageLimit}</span></div>
                                                    <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900 transition-all" style={{ width: `${Math.min((promo.usedCount / promo.usageLimit) * 100, 100)}%` }} /></div>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <button onClick={() => handleToggleStatus(promo)} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${promo.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                    {promo.isActive ? 'Active' : 'Offline'}
                                                </button>
                                            </td>
                                            <td className="text-right">
                                                <button onClick={() => handleDelete(promo.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ManagePromoCodes;
