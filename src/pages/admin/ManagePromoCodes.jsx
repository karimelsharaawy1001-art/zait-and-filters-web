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
        <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                    <div className="bg-admin-red hover:bg-admin-red-dark p-3.5 rounded-2xl shadow-lg shadow-admin-red/40">
                        <Ticket className="h-6 w-6 text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-black uppercase tracking-widest poppins">Promo Codes</h1>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Campaigns & Rewards Engine</p>
                    </div>
                </div>
            </div>
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-3 bg-[#28B463] hover:bg-[#219653] text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-[#28B463]/20 hover:scale-[1.02] transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Create New Code
                </button>
            )}

            {
                showAddForm && (
                    <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-gray-100 mb-12 animate-in fade-in slide-in-from-top-4 duration-300 max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-xl font-black text-black uppercase tracking-widest poppins">New Campaign</h2>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Configure promotion logic and constraints</p>
                            </div>
                            <button onClick={() => { setShowAddForm(false); resetForm(); }} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all text-gray-500 hover:text-black border border-gray-200 shadow-lg">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Section 1: Basic Info */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Promo Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all uppercase font-bold shadow-lg"
                                        placeholder="e.g. SUMMER2024"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Promotion Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                    >
                                        {PROMO_TYPES.map(t => (
                                            <option key={t.id} value={t.id} className="bg-white">{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Usage Limit</label>
                                    <input
                                        type="number"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                        required
                                    />
                                    <p className="text-[9px] text-gray-600 mt-2 px-1 font-bold uppercase tracking-widest">Maximum global redemptions allowed</p>
                                </div>
                            </div>

                            {/* Section 2: Conditional Logic */}
                            <div className="space-y-6 bg-white border border-gray-200 text-black border-dashed border-[#ffffff0d] shadow-inner">
                                <h3 className="text-[10px] font-black text-admin-accent uppercase tracking-widest px-1">Logic Constraints</h3>

                                {formData.type === 'discount' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-6">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Value</label>
                                                <input
                                                    type="number"
                                                    value={formData.value}
                                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                                    required
                                                />
                                            </div>
                                            <div className="mt-6">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.isPercentage}
                                                        onChange={(e) => setFormData({ ...formData, isPercentage: e.target.checked })}
                                                        className="w-5 h-5 bg-[#ffffff0d] text-admin-accent rounded-lg border-[#ffffff1a] focus:ring-admin-accent transition-all cursor-pointer"
                                                    />
                                                    <span className="text-[10px] font-black text-gray-400 group-hover:text-black uppercase tracking-widest transition-colors">% Discount</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Min Order Value (EGP)</label>
                                            <input
                                                type="number"
                                                value={formData.minOrderValue}
                                                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.type === 'free_shipping_threshold' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Threshold amount (EGP)</label>
                                        <input
                                            type="number"
                                            value={formData.minOrderValue}
                                            onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-6 py-5 text-xl font-black text-admin-accent focus:ring-2 focus:ring-admin-accent outline-none transition-all shadow-lg"
                                            placeholder="e.g. 1000"
                                            required
                                        />
                                        <p className="mt-3 text-[9px] text-gray-600 font-bold uppercase tracking-widest px-1 leading-relaxed">System will auto-apply 100% shipping discount if subtotal &gt;= this value</p>
                                    </div>
                                )}

                                {formData.type === 'payment_method_shipping' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Required Payment Gateway</label>
                                        <select
                                            value={formData.requiredPaymentMethod}
                                            onChange={(e) => setFormData({ ...formData, requiredPaymentMethod: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                        >
                                            <option value="online" className="bg-white text-black">Online Payment (Card/Wallet)</option>
                                            <option value="cod" className="bg-white text-black">Cash on Delivery</option>
                                        </select>
                                        <p className="text-[9px] text-gray-600 mt-4 px-1 font-bold uppercase tracking-widest leading-relaxed italic">Strategic incentive for specific payment flows</p>
                                    </div>
                                )}

                                {formData.type === 'product_gift' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Trigger Product (Primary)</label>
                                            <select
                                                value={formData.targetProductId}
                                                onChange={(e) => setFormData({ ...formData, targetProductId: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                                required
                                            >
                                                <option value="" className="bg-white">Select Product</option>
                                                {products.map(p => <option key={p.id} value={p.id} className="bg-white">{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Gift Product (Complementary)</label>
                                            <select
                                                value={formData.giftProductId}
                                                onChange={(e) => setFormData({ ...formData, giftProductId: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 text-black rounded-xl px-5 py-4 text-sm text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                                required
                                            >
                                                <option value="" className="bg-white">Select Product</option>
                                                {products.map(p => <option key={p.id} value={p.id} className="bg-white">{p.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section 3: Summary & Action */}
                            <div className="flex flex-col justify-end gap-6">
                                <div className="bg-admin-accent/5 p-6 rounded-3xl border border-admin-accent/20 shadow-inner">
                                    <label className="block text-[10px] font-black text-admin-accent uppercase tracking-widest mb-2 px-1">Campaign Outcome</label>
                                    <p className="text-sm font-bold text-black leading-relaxed whitespace-pre-line italic">
                                        {formData.type === 'discount' && `Apply ${formData.value}${formData.isPercentage ? '%' : ' EGP'} discount ${formData.minOrderValue > 0 ? `on orders exceeding ${formData.minOrderValue} EGP` : ''}.`}
                                        {formData.type === 'free_shipping_threshold' && `System will grant free delivery for all orders reaching ${formData.minOrderValue} EGP.`}
                                        {formData.type === 'payment_method_shipping' && `Exclusively reward ${formData.requiredPaymentMethod === 'online' ? 'Online Gateway' : 'COD'} transactions with free shipping.`}
                                        {formData.type === 'product_gift' && `Inject a free gift item automatically when the target SKU is detected in checkout.`}
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full bg-[#28B463] hover:bg-[#219653] text-black font-black py-5 rounded-xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest shadow-lg shadow-[#28B463]/20 hover:scale-[1.01]"
                                >
                                    {actionLoading ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : <><Plus className="h-5 w-5" /> Launch Promotion</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* List View */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden max-w-7xl mx-auto">
                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center text-gray-400 gap-4">
                        <Loader2 className="h-12 w-12 text-admin-accent animate-spin" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Parsing promotion registry...</p>
                    </div>
                ) : codes.length === 0 ? (
                    <div className="p-24 text-center">
                        <Ticket className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                        <p className="font-black text-black uppercase tracking-widest text-lg poppins">No active campaigns</p>
                        <p className="text-gray-400 font-bold text-sm mt-1">Start by creating your first promotional offer.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                    <th className="px-8 py-6 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest">Code</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest">Strategy & Constraints</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest text-center">Velocity</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest text-center">Lifecycle</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ffffff0d]">
                                {codes.map((promo) => (
                                    <tr key={promo.id} className="hover:bg-gray-50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-black bg-admin-accent/10 px-4 py-1.5 rounded-xl border border-admin-accent/20 inline-block w-fit tracking-widest poppins shadow-lg">{promo.code}</span>
                                                <span className="text-[9px] text-gray-600 mt-2 font-black uppercase tracking-widest">Est. {new Date(promo.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 min-w-[300px]">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#ffffff05] p-3 rounded-2xl text-admin-accent shadow-inner border border-gray-200">
                                                    {PROMO_TYPES.find(t => t.id === promo.type)?.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-black poppins">{PROMO_TYPES.find(t => t.id === promo.type)?.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 line-clamp-1 italic">
                                                        {promo.type === 'discount' && `${promo.value}${promo.isPercentage ? '%' : ' EGP'} Off ${promo.minOrderValue > 0 ? `(Target > ${promo.minOrderValue})` : '(No Min)'}`}
                                                        {promo.type === 'free_shipping_threshold' && `Free Shipping > ${promo.minOrderValue} EGP`}
                                                        {promo.type === 'payment_method_shipping' && `Gateway: ${promo.requiredPaymentMethod.toUpperCase()}`}
                                                        {promo.type === 'product_gift' && `Complementary Gift Strategy`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-black text-black poppins">{promo.usedCount}</span>
                                                    <span className="text-gray-700 font-bold text-xs uppercase">of</span>
                                                    <span className="text-xs font-black text-gray-400 uppercase">{promo.usageLimit}</span>
                                                </div>
                                                <div className="w-24 h-1.5 bg-[#ffffff05] rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="h-full bg-admin-red hover:bg-admin-red-dark rounded-full shadow-lg"
                                                        style={{ width: `${Math.min((promo.usedCount / promo.usageLimit) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(promo)}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${promo.isActive ? 'bg-[#28B463] text-white border-[#28B463] shadow-md shadow-[#28B463]/20' : 'bg-gray-200 text-gray-400 border-gray-300'}`}
                                            >
                                                {promo.isActive ? 'Active' : 'Disabled'}
                                            </button>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                                <button
                                                    onClick={() => handleDelete(promo.id)}
                                                    className="p-3 bg-red-50 text-red-600 hover:text-white hover:bg-red-600 rounded-2xl transition-all shadow-sm border border-red-100"
                                                    title="Remove Campaign"
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
        </div >
    );
};

export default ManagePromoCodes;
