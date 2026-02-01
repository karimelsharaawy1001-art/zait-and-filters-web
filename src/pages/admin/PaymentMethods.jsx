import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Shield, Eye, EyeOff, Save, Loader2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const PaymentMethods = () => {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKeys, setShowKeys] = useState({});

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'payment_configs'));
            const data = {};
            querySnapshot.docs.forEach(doc => {
                data[doc.id] = doc.data();
            });

            // Initialize defaults if missing
            if (!data.cod) {
                const codRef = doc(db, 'payment_configs', 'cod');
                const defaultCod = { name: 'Cash on Delivery', isActive: true, type: 'offline' };
                await setDoc(codRef, defaultCod);
                data.cod = defaultCod;
            }
            if (!data.easykash) {
                const ekRef = doc(db, 'payment_configs', 'easykash');
                const defaultEk = {
                    name: 'Pay via Card or Installments',
                    nameAr: 'الدفع عن طريق الفيزا و شركات التقسيط',
                    isActive: false,
                    type: 'online',
                    apiKey: '',
                    secretKey: ''
                };
                await setDoc(ekRef, defaultEk);
                data.easykash = defaultEk;
            }

            if (!data.instapay) {
                const ipRef = doc(db, 'payment_configs', 'instapay');
                const defaultIp = {
                    name: 'Instapay',
                    nameAr: 'انستاباي',
                    isActive: false,
                    type: 'manual',
                    number: ''
                };
                await setDoc(ipRef, defaultIp);
                data.instapay = defaultIp;
            }

            if (!data.wallet) {
                const walletRef = doc(db, 'payment_configs', 'wallet');
                const defaultWallet = {
                    name: 'Electronic Wallets (Vodafone/Orange/Etisalat)',
                    nameAr: 'المحافظ الإلكترونية',
                    isActive: false,
                    type: 'manual',
                    number: ''
                };
                await setDoc(walletRef, defaultWallet);
                data.wallet = defaultWallet;
            }

            if (data.easykash && data.easykash.name === 'Credit Card (EasyKash)') {
                data.easykash.name = 'Pay via Card or Installments';
                data.easykash.nameAr = 'الدفع عن طريق الفيزا و شركات التقسيط';
            }

            setConfigs(data);
        } catch (error) {
            console.error("Error fetching payment configs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            const ref = doc(db, 'payment_configs', id);
            await updateDoc(ref, { isActive: !currentStatus });
            setConfigs(prev => ({
                ...prev,
                [id]: { ...prev[id], isActive: !currentStatus }
            }));
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleInputChange = (id, field, value) => {
        setConfigs(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSaveConfig = async (id) => {
        setSaving(true);
        try {
            const ref = doc(db, 'payment_configs', id);
            await setDoc(ref, configs[id]);
            toast.success(`${configs[id].name} configuration saved!`);
        } catch (error) {
            console.error("Error saving config:", error);
            toast.error("Failed to save configuration");
        } finally {
            setSaving(null);
        }
    };

    const toggleShowKey = (id, field) => {
        setShowKeys(prev => ({
            ...prev,
            [`${id}_${field}`]: !prev[`${id}_${field}`]
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-admin-bg flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing encryption layer...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-admin-bg font-sans pb-20 p-4 md:p-8">
            <AdminHeader title="Gateway Protocols" />

            <div className="max-w-4xl mx-auto mt-10">
                <div className="bg-admin-accent/10 border border-admin-accent/20 p-6 mb-12 rounded-[2rem] flex items-start gap-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Shield className="h-24 w-24 text-admin-accent" />
                    </div>
                    <div className="bg-admin-accent/20 p-3 rounded-xl text-admin-accent relative">
                        <Shield className="h-6 w-6" />
                    </div>
                    <div className="relative">
                        <p className="text-[10px] text-admin-accent font-black uppercase tracking-widest mb-1">Security Directive</p>
                        <p className="text-xs text-white/70 font-bold leading-relaxed">
                            API credentials are encrypted at rest. <span className="text-admin-accent">WARNING:</span> For mission-critical production environments, ensure these keys are strictly isolated within the server-side environment clusters.
                        </p>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Cash on Delivery (COD) */}
                    <div className="bg-admin-card rounded-[2.5rem] shadow-admin border border-admin-border overflow-hidden group hover:bg-[#ffffff05] transition-all">
                        <div className="p-10 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="bg-admin-green/10 p-4 rounded-2xl text-admin-green transition-transform group-hover:scale-110">
                                    <Banknote className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest poppins">{configs.cod?.name}</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Offline Physical Settlement</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle('cod', configs.cod.isActive)}
                                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${configs.cod.isActive ? 'bg-admin-green' : 'bg-[#ffffff1a]'}`}
                            >
                                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition duration-300 ease-in-out ${configs.cod.isActive ? 'translate-x-[1.5rem]' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* EasyKash */}
                    <div className={`bg-admin-card rounded-[2.5rem] shadow-admin border transition-all duration-500 overflow-hidden ${configs.easykash.isActive ? 'border-admin-accent/40 bg-[#ffffff05]' : 'border-[#ffffff0d]'}`}>
                        <div className="p-10 flex items-center justify-between border-b border-[#ffffff05]">
                            <div className="flex items-center gap-6">
                                <div className="bg-admin-accent/10 p-4 rounded-2xl text-admin-accent transition-transform group-hover:scale-110">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest poppins">{configs.easykash?.name}</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Digital Gateway Cluster (L.E)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle('easykash', configs.easykash.isActive)}
                                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${configs.easykash.isActive ? 'bg-admin-accent' : 'bg-[#ffffff1a]'}`}
                            >
                                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition duration-300 ease-in-out ${configs.easykash.isActive ? 'translate-x-[1.5rem]' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="p-10 space-y-10 relative">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Display Name (English)</label>
                                    <input
                                        type="text"
                                        value={configs.easykash.name}
                                        onChange={(e) => handleInputChange('easykash', 'name', e.target.value)}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all placeholder-gray-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Display Name (Arabic)</label>
                                    <input
                                        type="text"
                                        value={configs.easykash.nameAr || ''}
                                        onChange={(e) => handleInputChange('easykash', 'nameAr', e.target.value)}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all placeholder-gray-700 text-right"
                                        placeholder="الدفع عن طريق الفيزا و شركات التقسيط"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Network API Key</label>
                                <div className="relative">
                                    <input
                                        type={showKeys.easykash_apiKey ? "text" : "password"}
                                        value={configs.easykash.apiKey}
                                        onChange={(e) => handleInputChange('easykash', 'apiKey', e.target.value)}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-admin-accent outline-none pr-14 font-mono transition-all"
                                        placeholder="EYK_PUB_XXXXXXXX"
                                    />
                                    <button
                                        onClick={() => toggleShowKey('easykash', 'apiKey')}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors"
                                    >
                                        {showKeys.easykash_apiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Vault Secret Protocol</label>
                                <div className="relative">
                                    <input
                                        type={showKeys.easykash_secretKey ? "text" : "password"}
                                        value={configs.easykash.secretKey}
                                        onChange={(e) => handleInputChange('easykash', 'secretKey', e.target.value)}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-admin-accent outline-none pr-14 font-mono transition-all"
                                        placeholder="EYK_SEC_XXXXXXXX"
                                    />
                                    <button
                                        onClick={() => toggleShowKey('easykash', 'secretKey')}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors"
                                    >
                                        {showKeys.easykash_secretKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={() => handleSaveConfig('easykash')}
                                    disabled={saving}
                                    className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Synchronize Gateway
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Instapay */}
                    <div className={`bg-admin-card rounded-[2.5rem] shadow-admin border transition-all duration-500 overflow-hidden ${configs.instapay?.isActive ? 'border-[#663299]/40 bg-[#ffffff05]' : 'border-[#ffffff0d]'}`}>
                        <div className="p-10 flex items-center justify-between border-b border-[#ffffff05]">
                            <div className="flex items-center gap-6">
                                <div className="bg-[#663299]/10 p-4 rounded-2xl text-[#663299] transition-transform group-hover:scale-110">
                                    <Smartphone className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest poppins">{configs.instapay?.name}</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Instant Payment Network (QR/Link)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle('instapay', configs.instapay.isActive)}
                                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${configs.instapay?.isActive ? 'bg-[#663299]' : 'bg-[#ffffff1a]'}`}
                            >
                                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition duration-300 ease-in-out ${configs.instapay?.isActive ? 'translate-x-[1.5rem]' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {configs.instapay?.isActive && (
                            <div className="p-10 relative">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handleSaveConfig('instapay')}
                                        disabled={saving}
                                        className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save Configuration
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Electronic Wallets */}
                    <div className={`bg-admin-card rounded-[2.5rem] shadow-admin border transition-all duration-500 overflow-hidden ${configs.wallet?.isActive ? 'border-orange-500/40 bg-[#ffffff05]' : 'border-[#ffffff0d]'}`}>
                        <div className="p-10 flex items-center justify-between border-b border-[#ffffff05]">
                            <div className="flex items-center gap-6">
                                <div className="bg-orange-500/10 p-4 rounded-2xl text-orange-500 transition-transform group-hover:scale-110">
                                    <Smartphone className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest poppins">{configs.wallet?.name}</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Mobile e-Wallets (VF/Orange/Etisalat)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle('wallet', configs.wallet.isActive)}
                                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${configs.wallet?.isActive ? 'bg-orange-500' : 'bg-[#ffffff1a]'}`}
                            >
                                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition duration-300 ease-in-out ${configs.wallet?.isActive ? 'translate-x-[1.5rem]' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {configs.wallet?.isActive && (
                            <div className="p-10 relative space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Wallet Number</label>
                                    <input
                                        type="text"
                                        value={configs.wallet.number}
                                        onChange={(e) => handleInputChange('wallet', 'number', e.target.value)}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-700 font-mono"
                                        placeholder="010XXXXXXXX"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handleSaveConfig('wallet')}
                                        disabled={saving}
                                        className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save Configuration
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

};

export default PaymentMethods;

