import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { Ticket, Plus, Trash2, Edit2, Loader2, Truck, Gift, CreditCard, Tag, Percent, Calendar, User } from 'lucide-react';

const PROMO_TYPES = [
    { id: 'discount', name: 'Standard Discount', icon: <Ticket className="w-4 h-4" />, description: 'Percentage or Fixed amount off subtotal' },
    { id: 'free_shipping_threshold', name: 'Free Shipping (Threshold)', icon: <Truck className="w-4 h-4" />, description: 'Free shipping if Subtotal > X' },
    { id: 'payment_method_shipping', name: 'Free Shipping (Payment)', icon: <CreditCard className="w-4 h-4" />, description: 'Free shipping for specific payment methods' },
    { id: 'product_gift', name: 'Product Gift', icon: <Gift className="w-4 h-4" />, description: 'Buy Product X, Get Product Y Free' },
];

const ManagePromoCodes = () => {
    const [codes, setCodes] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEditing, setIsEditing] = useState(null);

    const [formData, setFormData] = useState({
        code: '',
        type: 'discount',
        value: 0,
        isPercentage: true,
        minOrderValue: 0,
        usageLimit: 100,
        usedCount: 0,
        requiredPaymentMethod: 'online',
        targetProductId: '',
        giftProductId: '',
        isActive: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const promoSnap = await getDocs(query(collection(db, 'promo_codes'), orderBy('code')));
            const prodSnap = await getDocs(collection(db, 'products'));

            setCodes(promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setProducts(prodSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await addDoc(collection(db, 'promo_codes'), {
                ...formData,
                code: formData.code.toUpperCase().trim(),
                value: Number(formData.value),
                minOrderValue: Number(formData.minOrderValue),
                usageLimit: Number(formData.usageLimit),
                createdAt: new Date()
            });
            setShowAddForm(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error adding promo code:", error);
            toast.error("Failed to add promo code. Make sure the code is unique.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this promo code?")) return;
        setActionLoading(true);
        try {
            await deleteDoc(doc(db, 'promo_codes', id));
            fetchData();
        } catch (error) {
            console.error("Error deleting promo code:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async (promo) => {
        try {
            await updateDoc(doc(db, 'promo_codes', promo.id), {
                isActive: !promo.isActive
            });
            fetchData();
        } catch (error) {
            console.error("Error toggling status:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            type: 'discount',
            value: 0,
            isPercentage: true,
            minOrderValue: 0,
            usageLimit: 100,
            usedCount: 0,
            requiredPaymentMethod: 'online',
            targetProductId: '',
            giftProductId: '',
            isActive: true
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-3 rounded-2xl">
                        <Ticket className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Promo Codes</h1>
                        <p className="text-sm text-gray-500 font-bold">Manage discounts and rewards</p>
                    </div>
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Create New Code
                    </button>
                )}
            </div>

            {showAddForm && (
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-gray-900">New Promotion</h2>
                        <button onClick={() => { setShowAddForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Section 1: Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Promo Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all uppercase font-bold"
                                    placeholder="e.g. SUMMER2024"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Promotion Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold"
                                >
                                    {PROMO_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Usage Limit</label>
                                <input
                                    type="number"
                                    value={formData.usageLimit}
                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">Max total global uses</p>
                            </div>
                        </div>

                        {/* Section 2: Conditional Logic */}
                        <div className="space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-dashed border-gray-200">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Logic Rules</h3>

                            {formData.type === 'discount' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Value</label>
                                            <input
                                                type="number"
                                                value={formData.value}
                                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div className="mt-5">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isPercentage}
                                                    onChange={(e) => setFormData({ ...formData, isPercentage: e.target.checked })}
                                                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                                />
                                                <span className="text-xs font-bold text-gray-600">% Off</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Min Order Value (EGP)</label>
                                        <input
                                            type="number"
                                            value={formData.minOrderValue}
                                            onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.type === 'free_shipping_threshold' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Free Shipping if Order Total Is Over:</label>
                                    <input
                                        type="number"
                                        value={formData.minOrderValue}
                                        onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-black text-orange-600 text-lg"
                                        placeholder="e.g. 1000"
                                        required
                                    />
                                </div>
                            )}

                            {formData.type === 'payment_method_shipping' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Required Payment Method</label>
                                    <select
                                        value={formData.requiredPaymentMethod}
                                        onChange={(e) => setFormData({ ...formData, requiredPaymentMethod: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold"
                                    >
                                        <option value="online">Online Payment (EasyKash)</option>
                                        <option value="cod">Cash on Delivery</option>
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-2 ml-1 italic">Free shipping will be applied if this method is selected during checkout.</p>
                                </div>
                            )}

                            {formData.type === 'product_gift' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Target Product (Buy this...)</label>
                                        <select
                                            value={formData.targetProductId}
                                            onChange={(e) => setFormData({ ...formData, targetProductId: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            required
                                        >
                                            <option value="">Select Target Product</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Gift Product (...Get this free)</label>
                                        <select
                                            value={formData.giftProductId}
                                            onChange={(e) => setFormData({ ...formData, giftProductId: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            required
                                        >
                                            <option value="">Select Gift Product</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 3: Summary & Action */}
                        <div className="flex flex-col justify-end gap-4">
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 mb-2">
                                <p className="text-[10px] font-black text-purple-400 uppercase mb-2">Rule Summary</p>
                                <p className="text-xs font-bold text-purple-900 leading-relaxed italic">
                                    {formData.type === 'discount' && `Apply ${formData.value}${formData.isPercentage ? '%' : ' EGP'} discount ${formData.minOrderValue > 0 ? `on orders above ${formData.minOrderValue} EGP` : ''}.`}
                                    {formData.type === 'free_shipping_threshold' && `Free delivery for all orders over ${formData.minOrderValue} EGP.`}
                                    {formData.type === 'payment_method_shipping' && `Free shipping specifically for ${formData.requiredPaymentMethod === 'online' ? 'Online' : 'COD'} customers.`}
                                    {formData.type === 'product_gift' && `Add a free gift item when specific items are present in the cart.`}
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full bg-purple-600 text-white py-4 rounded-xl font-black text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="h-4 w-4" /> Finalize Promotion</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List View */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        <p className="font-bold text-sm text-gray-400">Loading promotions...</p>
                    </div>
                ) : codes.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 font-bold text-sm">
                        No active promotions found. Click "Create New Code" to start.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type & Logic</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Usage</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {codes.map((promo) => (
                                    <tr key={promo.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100 inline-block w-fit tracking-wider">{promo.code}</span>
                                                <span className="text-[10px] text-gray-400 mt-1 font-bold">Created: {new Date(promo.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 min-w-[250px]">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                                                    {PROMO_TYPES.find(t => t.id === promo.type)?.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-800">{PROMO_TYPES.find(t => t.id === promo.type)?.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold leading-tight line-clamp-1 italic">
                                                        {promo.type === 'discount' && `${promo.value}${promo.isPercentage ? '%' : ' EGP'} Off ${promo.minOrderValue > 0 ? `(min ${promo.minOrderValue})` : ''}`}
                                                        {promo.type === 'free_shipping_threshold' && `Free Ship > ${promo.minOrderValue} EGP`}
                                                        {promo.type === 'payment_method_shipping' && `Free Ship for ${promo.requiredPaymentMethod.toUpperCase()}`}
                                                        {promo.type === 'product_gift' && `Free Gift with Purchase`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-black text-gray-900">{promo.usedCount}</span>
                                                    <span className="text-gray-300">/</span>
                                                    <span className="text-xs font-bold text-gray-400">{promo.usageLimit}</span>
                                                </div>
                                                <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full"
                                                        style={{ width: `${Math.min((promo.usedCount / promo.usageLimit) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-[2pxx]">
                                            <button
                                                onClick={() => handleToggleStatus(promo)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${promo.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                            >
                                                {promo.isActive ? 'Active' : 'Disabled'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDelete(promo.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagePromoCodes;
