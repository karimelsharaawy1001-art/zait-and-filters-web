import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import InstallmentBar from '../../components/InstallmentBar';

const PARTNERS = [
    { id: 'valu', name: 'Valu', logo: 'https://v-valu.com/assets/images/valu-logo.png' },
    { id: 'aman', name: 'Aman', logo: 'https://www.amancontent.com/uploads/aman_logo_89d38c6416.png' },
    { id: 'souhoola', name: 'Souhoola', logo: 'https://www.souhoola.com/assets/img/logo.png' },
    { id: 'takkah', name: 'Takkah', logo: 'https://takkah.com.eg/static/media/logo.2e66699a.svg' },
    { id: 'lucky', name: 'Lucky', logo: 'https://lucky.app/static/media/lucky-logo.e7e7e7e7.png' } // Real logos would be placed here
];

const InstallmentPartners = () => {
    const [enabledPartners, setEnabledPartners] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'integrations');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEnabledPartners(docSnap.data().installmentPartners || {});
                }
            } catch (error) {
                console.error("Error fetching installment settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleToggle = (id) => {
        setEnabledPartners(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'integrations'), {
                installmentPartners: enabledPartners
            }, { merge: true });
            toast.success('Installment partners updated!');
        } catch (error) {
            console.error("Error saving installment settings:", error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto">
            <NavLink
                to="/admin/integrations"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 transition-colors group"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Integrations
            </NavLink>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-admin-red rounded-2xl flex items-center justify-center shadow-lg shadow-admin-red/20">
                        <CreditCard className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Installment Partners</h1>
                        <p className="text-gray-500 text-sm font-medium">Choose which logos to display on your site</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-admin-red hover:bg-admin-red-dark text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-admin-red/20 disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Manage Partners</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {PARTNERS.map((partner) => (
                                <div
                                    key={partner.id}
                                    onClick={() => handleToggle(partner.id)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${enabledPartners[partner.id]
                                        ? 'border-admin-red bg-red-50'
                                        : 'border-gray-100 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm">
                                            <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain grayscale" onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }} />
                                            <div style={{ display: 'none' }} className="font-black text-[10px] text-admin-text-secondary uppercase">{partner.name}</div>
                                        </div>
                                        <span className={`font-bold ${enabledPartners[partner.id] ? 'text-admin-red' : 'text-gray-500'}`}>
                                            {partner.name}
                                        </span>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${enabledPartners[partner.id] ? 'bg-admin-red' : 'bg-gray-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enabledPartners[partner.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            Live Preview
                        </h3>
                        <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <InstallmentBar forceActive={enabledPartners} />
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="bg-admin-red rounded-3xl p-8 text-white shadow-xl shadow-admin-red/20">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            Functionality
                        </h3>
                        <ul className="space-y-4">
                            {[
                                "Displayed globally in Footer",
                                "Displayed on Product Page",
                                "Installment monthly calculator",
                                "High-quality vector logos"
                            ].map((req, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                                    <div className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                    {req}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <h3 className="text-blue-900 font-bold mb-3 flex items-center gap-2 text-sm">
                            <AlertCircle className="w-5 h-5" />
                            Display Logic
                        </h3>
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            The installment bar will automatically hide itself if <strong>no partners</strong> are enabled above. Enable at least one partner to see it live.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallmentPartners;
