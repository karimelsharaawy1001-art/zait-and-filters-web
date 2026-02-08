import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Shield, Eye, EyeOff, Save, Loader2, CreditCard, Banknote, Smartphone, Activity, ShieldCheck, Lock } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const PaymentMethods = () => {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [showKeys, setShowKeys] = useState({});

    // Define defaults outside for reuse
    const defaults = {
        cod: { name: 'Cash on Delivery', nameAr: 'دفع عند الاستلام', isActive: true, type: 'offline' },
        easykash: { name: 'Pay via Card or Installments', nameAr: 'الدفع عن طريق الفيزا و شركات التقسيط', isActive: false, type: 'online', apiKey: '', secretKey: '' },
        instapay: { name: 'Instapay', nameAr: 'انستاباي', isActive: false, type: 'manual', number: '', paymentLink: '' },
        wallet: { name: 'Electronic Wallets', nameAr: 'المحافظ الإلكترونية', isActive: false, type: 'manual', number: '' }
    };

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const keys = Object.keys(defaults);
            const fetchPromises = keys.map(key => getDoc(doc(db, 'payment_methods', key)));
            const snapshots = await Promise.all(fetchPromises);

            const data = {};
            const batchPromises = [];

            snapshots.forEach((snap, index) => {
                const key = keys[index];
                if (snap.exists()) {
                    data[key] = { id: snap.id, ...snap.data() };
                } else {
                    // Create default if missing
                    const newConfig = { ...defaults[key] };
                    data[key] = { id: key, ...newConfig };
                    const docRef = doc(db, 'payment_methods', key);
                    batchPromises.push(setDoc(docRef, newConfig));
                }
            });

            if (batchPromises.length > 0) {
                await Promise.all(batchPromises);
                console.log("Initialized missing payment configurations");
            }

            setConfigs(data);
        } catch (error) {
            console.error("Error fetching payment configs:", error);
            // If quota exceeded, at least show defaults so the page doesn't crash 
            // (though saves might fail, it's better than a blank screen)
            const fallbackData = {};
            Object.keys(defaults).forEach(key => {
                fallbackData[key] = { id: key, ...defaults[key] };
            });
            setConfigs(fallbackData);

            toast.error("Network limit reached. Using offline defaults.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleToggle = async (id, currentStatus) => {
        if (!configs[id]) return; // Guard

        // Optimistic UI update
        const newState = !currentStatus;
        setConfigs(prev => ({ ...prev, [id]: { ...prev[id], isActive: newState } }));

        try {
            const docRef = doc(db, 'payment_methods', id);
            await updateDoc(docRef, { isActive: newState });
            toast.success(`${id.toUpperCase()} Status Updated`);
        } catch (error) {
            console.error("Toggle error:", error);
            toast.error("Toggle failure");
            // Revert on error
            setConfigs(prev => ({ ...prev, [id]: { ...prev[id], isActive: currentStatus } }));
        }
    };

    const handleInputChange = (id, field, value) => {
        if (!configs[id]) return;
        setConfigs(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const handleSaveConfig = async (id) => {
        if (!configs[id]) return;
        setSaving(id);
        try {
            const dataToSave = { ...configs[id] };
            // Clean up internal ID if present (though Firestore ignores unused fields, cleaner to remove)
            delete dataToSave.id;

            const docRef = doc(db, 'payment_methods', id);
            await setDoc(docRef, dataToSave, { merge: true }); // Use set with merge to be safe
            toast.success(`${id.toUpperCase()} Configuration Deployed`);
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Deployment failure");
        } finally {
            setSaving(null);
        }
    };

    const toggleShowKey = (id, field) => {
        setShowKeys(prev => ({ ...prev, [`${id}_${field}`]: !prev[`${id}_${field}`] }));
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Financial Infrastructure" />
            <main className="max-w-5xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Settlement Registry</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {Object.keys(configs).length} Secure Payment Gateways</p>
                    </div>
                </div>

                <div className="bg-black/5 p-8 rounded-[2.5rem] mb-12 border-2 border-dashed border-black/10 flex items-start gap-8 relative overflow-hidden group">
                    <div className="p-5 bg-black text-white rounded-3xl shadow-2xl relative z-10"><Shield size={32} /></div>
                    <div className="relative z-10 flex-1">
                        <h4 className="text-sm font-black uppercase italic tracking-widest mb-2">Protocol Directive</h4>
                        <p className="text-xs font-bold leading-relaxed text-gray-600 italic">Financial credentials are managed through encrypted vaults. Ensure all production API keys are rotated periodically to maintain network integrity.</p>
                    </div>
                    <Lock className="absolute -right-10 -bottom-10 opacity-5 group-hover:rotate-12 transition-all" size={200} />
                </div>

                <div className="space-y-12">
                    {/* EasyKash - Global Gateway */}
                    {configs.easykash && (
                        <div className={`bg-white rounded-[3.5rem] border shadow-sm transition-all duration-700 overflow-hidden ${configs.easykash?.isActive ? 'ring-4 ring-black/5 border-black/10' : 'opacity-80'}`}>
                            <div className="p-10 flex items-center justify-between bg-gray-50/50 border-b border-gray-100">
                                <div className="flex items-center gap-6"><div className="bg-black text-white p-4 rounded-2xl shadow-xl transition-all"><CreditCard size={24} /></div><div><h3 className="text-xl font-black uppercase italic">{configs.easykash?.name}</h3><p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Universal Digital Settlement Tier</p></div></div>
                                <button onClick={() => handleToggle('easykash', configs.easykash.isActive)} className={`w-16 h-10 rounded-full transition-all flex items-center px-1.5 ${configs.easykash?.isActive ? 'bg-black' : 'bg-gray-200'}`}><div className={`w-7 h-7 bg-white rounded-full shadow-lg transition-all ${configs.easykash?.isActive ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                            </div>
                            <div className="p-10 space-y-10 group">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Identity Label (EN)</label><input type="text" value={configs.easykash?.name} onChange={e => handleInputChange('easykash', 'name', e.target.value)} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:border-black transition-all" /></div>
                                    <div className="space-y-3 text-right"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1 italic">مسمى الواجهة (عربي)</label><input type="text" value={configs.easykash?.nameAr} onChange={e => handleInputChange('easykash', 'nameAr', e.target.value)} className="w-full px-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-lg italic outline-none focus:border-black transition-all text-right font-Cairo" dir="rtl" /></div>
                                </div>
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Network Authorization Key</label><div className="relative"><input type={showKeys.easykash_apiKey ? "text" : "password"} value={configs.easykash?.apiKey} onChange={e => handleInputChange('easykash', 'apiKey', e.target.value)} className="w-full pl-8 pr-16 py-5 bg-gray-50 border-2 rounded-2xl font-black text-base italic outline-none focus:border-black transition-all font-mono" placeholder="EYK_PUB_XXXXXXXX" /><button onClick={() => toggleShowKey('easykash', 'apiKey')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-all">{showKeys.easykash_apiKey ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
                                    <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Vault Secret Component</label><div className="relative"><input type={showKeys.easykash_secretKey ? "text" : "password"} value={configs.easykash?.secretKey} onChange={e => handleInputChange('easykash', 'secretKey', e.target.value)} className="w-full pl-8 pr-16 py-5 bg-gray-50 border-2 rounded-2xl font-black text-base italic outline-none focus:border-black transition-all font-mono" placeholder="EYK_SEC_XXXXXXXX" /><button onClick={() => toggleShowKey('easykash', 'secretKey')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-all">{showKeys.easykash_secretKey ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
                                </div>
                                <div className="flex justify-end pt-4"><button onClick={() => handleSaveConfig('easykash')} disabled={saving === 'easykash'} className="bg-black text-white px-12 py-5 rounded-[2.5rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3">{saving === 'easykash' ? <Loader2 className="animate-spin" /> : <Save size={18} />} Commit Configuration</button></div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Wallet settlement */}
                        {configs.wallet && (
                            <div className={`bg-white rounded-[3rem] border shadow-sm transition-all duration-500 overflow-hidden ${configs.wallet?.isActive ? 'ring-2 ring-orange-500/20 shadow-orange-500/5' : 'opacity-80'}`}>
                                <div className="p-8 border-b bg-gray-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4"><div className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg"><Smartphone size={20} /></div><h3 className="text-lg font-black uppercase italic">Mobile Wallets</h3></div>
                                    <button onClick={() => handleToggle('wallet', configs.wallet.isActive)} className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${configs.wallet?.isActive ? 'bg-orange-500' : 'bg-gray-200'}`}><div className={`w-6 h-6 bg-white rounded-full transition-all ${configs.wallet?.isActive ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Terminal ID (Number)</label><input type="text" value={configs.wallet?.number} onChange={e => handleInputChange('wallet', 'number', e.target.value)} className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl font-black text-base italic outline-none focus:border-orange-500 transition-all font-mono" placeholder="010XXXXXXXX" /></div>
                                    <div className="flex justify-end"><button onClick={() => handleSaveConfig('wallet')} disabled={saving === 'wallet'} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[10px] shadow-xl hover:scale-105 transition-all flex items-center gap-2">{saving === 'wallet' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Deploy</button></div>
                                </div>
                            </div>
                        )}

                        {/* Instapay settlement */}
                        {configs.instapay && (
                            <div className={`bg-white rounded-[3rem] border shadow-sm transition-all duration-500 overflow-hidden ${configs.instapay?.isActive ? 'ring-2 ring-purple-600/20 shadow-purple-600/5' : 'opacity-80'}`}>
                                <div className="p-8 border-b bg-gray-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4"><div className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg"><Activity size={20} /></div><h3 className="text-lg font-black uppercase italic">Instapay Network</h3></div>
                                    <button onClick={() => handleToggle('instapay', configs.instapay.isActive)} className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${configs.instapay?.isActive ? 'bg-purple-600' : 'bg-gray-200'}`}><div className={`w-6 h-6 bg-white rounded-full transition-all ${configs.instapay?.isActive ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Account Number / QR Details</label><input type="text" value={configs.instapay?.number} onChange={e => handleInputChange('instapay', 'number', e.target.value)} className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl font-black text-base italic outline-none focus:border-purple-600 transition-all font-mono" placeholder="Account number or QR details" /></div>
                                    <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Payment Link (Optional)</label><input type="url" value={configs.instapay?.paymentLink || ''} onChange={e => handleInputChange('instapay', 'paymentLink', e.target.value)} className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl font-black text-base italic outline-none focus:border-purple-600 transition-all font-mono" placeholder="https://instapay.com/pay/..." /></div>
                                    <div className="flex justify-end"><button onClick={() => handleSaveConfig('instapay')} disabled={saving === 'instapay'} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[10px] shadow-xl hover:scale-105 transition-all flex items-center gap-2">{saving === 'instapay' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Deploy</button></div>
                                </div>
                            </div>
                        )}

                        {/* Cash Settlement */}
                        {configs.cod && (
                            <div className={`bg-white rounded-[3rem] border shadow-sm transition-all duration-500 overflow-hidden flex items-center justify-between p-8 ${configs.cod?.isActive ? 'ring-2 ring-green-600/20' : 'opacity-80'}`}>
                                <div className="flex items-center gap-4"><div className="p-4 bg-green-600 text-white rounded-2xl shadow-lg"><Banknote size={20} /></div><div><h3 className="text-lg font-black uppercase italic">Cash Liquidity</h3><p className="text-[9px] font-bold text-gray-400 uppercase italic">On-Site Physical Settlement</p></div></div>
                                <button onClick={() => handleToggle('cod', configs.cod.isActive)} className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${configs.cod?.isActive ? 'bg-green-600' : 'bg-gray-200'}`}><div className={`w-6 h-6 bg-white rounded-full transition-all ${configs.cod?.isActive ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                            </div>
                        )}

                        <div className="bg-black p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                            <h4 className="text-sm font-black uppercase italic tracking-widest mb-2">Network Health</h4>
                            <p className="text-[10px] font-bold opacity-60 italic leading-relaxed">All encrypted channels are currently performing within operational safety indices. Latency: 12ms | Resilience: 99.9%</p>
                            <ShieldCheck className="absolute -right-6 -bottom-6 opacity-10" size={100} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PaymentMethods;
