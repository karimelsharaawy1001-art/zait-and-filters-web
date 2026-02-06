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
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Promotion Engine" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Campaign Registry</h2>
                        <p className="text-sm font-bold text-gray-500">Managing {codes.length} active protocols</p>
                    </div>
                    {!showAddForm && (
                        <button onClick={() => setShowAddForm(true)} className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase italic text-xs flex items-center gap-2 shadow-2xl hover:scale-105 transition-all"><Plus size={18} /> New Campaign</button>
                    )}
                </div>

                {showAddForm && (
                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm mb-12 space-y-8 animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center border-b pb-6">
                            <div><h3 className="text-xl font-black uppercase italic">Protocol Configuration</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Define logic constraints and rewards</p></div>
                            <button onClick={() => setShowAddForm(false)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-black hover:text-white transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Registry Code</label><input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xl italic" placeholder="SUMMER25" required /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Strategy Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xs uppercase italic">
                                        {PROMO_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Global Limit</label><input type="number" value={formData.usageLimit} onChange={e => setFormData({ ...formData, usageLimit: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" required /></div>
                            </div>
                            <div className="space-y-6 bg-gray-50 p-8 rounded-[2rem] border border-dashed border-gray-200">
                                <h4 className="text-[10px] font-black uppercase text-red-600 block mb-2 tracking-widest">Logic Constraints</h4>
                                {formData.type === 'discount' && (
                                    <div className="space-y-6">
                                        <div className="flex gap-4">
                                            <input type="number" placeholder="Value" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} className="flex-1 p-4 bg-white border rounded-xl font-black" required />
                                            <button type="button" onClick={() => setFormData({ ...formData, isPercentage: !formData.isPercentage })} className={`px-4 rounded-xl font-black text-xs ${formData.isPercentage ? 'bg-black text-white' : 'bg-white border text-black'}`}>{formData.isPercentage ? '%' : 'EGP'}</button>
                                        </div>
                                        <input type="number" placeholder="Min. Order Value" value={formData.minOrderValue} onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })} className="w-full p-4 bg-white border rounded-xl font-black" />
                                    </div>
                                )}
                                {formData.type === 'free_shipping_threshold' && (
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Grant delivery for subtotal &gt;=</label><input type="number" value={formData.minOrderValue} onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })} className="w-full p-4 bg-white border rounded-xl font-black text-xl text-red-600" required /></div>
                                )}
                                {formData.type === 'payment_method_shipping' && (
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Exclusive Reward for</label>
                                        <select value={formData.requiredPaymentMethod} onChange={e => setFormData({ ...formData, requiredPaymentMethod: e.target.value })} className="w-full p-4 bg-white border rounded-xl font-black text-xs uppercase">
                                            <option value="online">Online Gateway Only</option>
                                            <option value="cod">Cash on Delivery</option>
                                        </select>
                                    </div>
                                )}
                                {formData.type === 'product_gift' && (
                                    <div className="space-y-4">
                                        <select value={formData.targetProductId} onChange={e => setFormData({ ...formData, targetProductId: e.target.value })} className="w-full p-4 bg-white border rounded-xl font-black text-[10px] uppercase"><option value="">Select Trigger SKU</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                        <select value={formData.giftProductId} onChange={e => setFormData({ ...formData, giftProductId: e.target.value })} className="w-full p-4 bg-white border rounded-xl font-black text-[10px] uppercase"><option value="">Select Reward SKU</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col justify-end space-y-6">
                                <div className="bg-black text-white p-6 rounded-[2rem] shadow-2xl space-y-2">
                                    <h5 className="text-[8px] font-black uppercase text-red-600 tracking-widest">Projection</h5>
                                    <p className="text-xs font-bold leading-relaxed italic opacity-80">
                                        {formData.type === 'discount' && `Incentivize with ${formData.value}${formData.isPercentage ? '%' : ' EGP'} reduction ${formData.minOrderValue > 0 ? `for orders above ${formData.minOrderValue} EGP` : ''}.`}
                                        {formData.type === 'free_shipping_threshold' && `Universal delivery grant for all orders surpassing ${formData.minOrderValue} EGP.`}
                                        {formData.type === 'payment_method_shipping' && `Optimize ${formData.requiredPaymentMethod} conversion by zeroing delivery fees.`}
                                        {formData.type === 'product_gift' && `Complementary asset injection strategy for target high-value SKU.`}
                                    </p>
                                </div>
                                <button type="submit" disabled={actionLoading} className="bg-red-600 text-white py-5 rounded-2xl font-black uppercase italic shadow-2xl hover:scale-105 transition-all">{actionLoading ? 'Deploying...' : 'Launch Protocol'}</button>
                            </div>
                        </form>
                    </section>
                )}

                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                    {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <tr>
                                        <th className="px-8 py-6">Code & Core</th>
                                        <th className="px-8 py-6">Strategy Profile</th>
                                        <th className="px-8 py-6 text-center">Velocity (Usage)</th>
                                        <th className="px-8 py-6 text-center">Phase</th>
                                        <th className="px-8 py-6 text-right">Ops</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {codes.map(promo => (
                                        <tr key={promo.id} className="hover:bg-gray-50/50 group transition-all">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-lg font-black text-black italic tracking-wider p-2 bg-gray-50 border rounded-xl inline-block w-fit">{promo.code}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">{new Date(promo.$createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">{PROMO_TYPES.find(t => t.id === promo.type)?.icon || <Tag size={20} />}</div>
                                                    <div>
                                                        <h4 className="font-black text-xs uppercase italic">{PROMO_TYPES.find(t => t.id === promo.type)?.name}</h4>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                                            {promo.type === 'discount' && `${promo.value}${promo.isPercentage ? '%' : ' EGP'} Off ${promo.minOrderValue > 0 ? `(Orders > ${promo.minOrderValue})` : ''}`}
                                                            {promo.type === 'free_shipping_threshold' && `Free Shipping > ${promo.minOrderValue} EGP`}
                                                            {promo.type === 'payment_method_shipping' && `Gateway: ${promo.requiredPaymentMethod.toUpperCase()}`}
                                                            {promo.type === 'product_gift' && `Gift Distribution Logic`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="inline-flex flex-col items-center gap-2">
                                                    <div className="flex items-center gap-2 font-black text-xs uppercase"><span className="text-red-600">{promo.usedCount}</span><span className="text-gray-300">/</span><span>{promo.usageLimit}</span></div>
                                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden border"><div className="h-full bg-red-600 transition-all" style={{ width: `${Math.min((promo.usedCount / promo.usageLimit) * 100, 100)}%` }} /></div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <button onClick={() => handleToggleStatus(promo)} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${promo.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                    {promo.isActive ? <CheckCircle size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />} {promo.isActive ? 'Active' : 'Offline'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button onClick={() => handleDelete(promo.id)} className="p-3 bg-white text-gray-400 border rounded-xl shadow-xl hover:text-red-600 hover:border-red-600 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"><Trash2 size={18} /></button>
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
