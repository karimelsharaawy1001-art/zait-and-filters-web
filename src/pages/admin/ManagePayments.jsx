import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Shield, Eye, EyeOff, Save, Loader2, CreditCard, Banknote } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const ManagePayments = () => {
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
                const defaultEk = { name: 'Credit Card (EasyKash)', isActive: false, type: 'online', apiKey: '', secretKey: '' };
                await setDoc(ekRef, defaultEk);
                data.easykash = defaultEk;
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
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <AdminHeader title="Payment Gateway Manager" />

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 rounded-r-lg">
                <div className="flex">
                    <Shield className="h-5 w-5 text-blue-400 mr-3" />
                    <div>
                        <p className="text-sm text-blue-700 font-bold">Security Note</p>
                        <p className="text-xs text-blue-600 mt-1">
                            API keys and secrets are stored in Firestore.
                            <span className="font-black"> SECURITY WARNING:</span> Ideally, Secret Keys should be used in a Cloud Function, not Frontend. This is a direct integration for MVP purposes.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Cash on Delivery (COD) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 flex items-center justify-between border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-xl text-green-600">
                                <Banknote className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">{configs.cod?.name}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Offline Payment</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle('cod', configs.cod.isActive)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${configs.cod.isActive ? 'bg-orange-600' : 'bg-gray-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${configs.cod.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* EasyKash */}
                <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${configs.easykash.isActive ? 'border-orange-200 ring-4 ring-orange-50' : 'border-gray-100'}`}>
                    <div className="p-6 flex items-center justify-between border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">{configs.easykash?.name}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Online Gateway (Egypt)</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle('easykash', configs.easykash.isActive)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${configs.easykash.isActive ? 'bg-orange-600' : 'bg-gray-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${configs.easykash.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="p-6 bg-gray-50/50 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">EasyKash API Key</label>
                            <div className="relative">
                                <input
                                    type={showKeys.easykash_apiKey ? "text" : "password"}
                                    value={configs.easykash.apiKey}
                                    onChange={(e) => handleInputChange('easykash', 'apiKey', e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none pr-12 font-mono"
                                    placeholder="Enter your public API key..."
                                />
                                <button
                                    onClick={() => toggleShowKey('easykash', 'apiKey')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.easykash_apiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">EasyKash Secret Key</label>
                            <div className="relative">
                                <input
                                    type={showKeys.easykash_secretKey ? "text" : "password"}
                                    value={configs.easykash.secretKey}
                                    onChange={(e) => handleInputChange('easykash', 'secretKey', e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none pr-12 font-mono"
                                    placeholder="Enter your secret key..."
                                />
                                <button
                                    onClick={() => toggleShowKey('easykash', 'secretKey')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.easykash_secretKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => handleSaveConfig('easykash')}
                                disabled={saving}
                                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                Update Gateway Config
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagePayments;

