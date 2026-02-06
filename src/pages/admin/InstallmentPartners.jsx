import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { ChevronLeft, Save, CreditCard, CheckCircle2, AlertCircle, Zap, Activity, ShieldCheck, Eye, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import AdminHeader from '../../components/AdminHeader';
import InstallmentBar from '../../components/InstallmentBar';

const PARTNERS = [
    { id: 'valu', name: 'Valu', logo: 'https://v-valu.com/assets/images/valu-logo.png' },
    { id: 'aman', name: 'Aman', logo: 'https://www.amancontent.com/uploads/aman_logo_89d38c6416.png' },
    { id: 'souhoola', name: 'Souhoola', logo: 'https://www.souhoola.com/assets/img/logo.png' },
    { id: 'takkah', name: 'Takkah', logo: 'https://takkah.com.eg/static/media/logo.2e66699a.svg' },
    { id: 'lucky', name: 'Lucky', logo: 'https://lucky.app/static/media/lucky-logo.e7e7e7e7.png' }
];

const InstallmentPartners = () => {
    const [enabledPartners, setEnabledPartners] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const SETTINGS_COLLECTION = import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';

    const fetchSettings = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const doc = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, 'integrations').catch(() => null);
            if (doc) setEnabledPartners(doc.installmentPartners || {});
        } catch (error) { toast.error("Fintech settings unreachable"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSettings(); }, [DATABASE_ID]);

    const handleToggle = (id) => {
        setEnabledPartners(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = { installmentPartners: enabledPartners };
            try { await databases.updateDocument(DATABASE_ID, SETTINGS_COLLECTION, 'integrations', data); }
            catch (err) { await databases.createDocument(DATABASE_ID, SETTINGS_COLLECTION, 'integrations', data); }
            toast.success("Fintech configuration updated");
        } catch (error) { toast.error("Deployment failure"); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Fintech Intelligence" />
            <main className="max-w-6xl mx-auto py-8 px-4">
                <NavLink to="/admin/integrations" className="inline-flex items-center gap-3 text-[10px] font-black uppercase text-gray-400 hover:text-black mb-10 transition-all group italic"><ChevronLeft size={16} className="group-hover:-translate-x-1 transition-all" /> Return to Connectivity Hub</NavLink>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl transition-all hover:rotate-6"><CreditCard size={32} /></div>
                        <div><h2 className="text-3xl font-black uppercase italic">Fintech Matrix</h2><p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {PARTNERS.length} Strategic Consumption Bridges</p></div>
                    </div>
                    <button onClick={handleSave} disabled={saving} className="bg-black text-white px-10 py-5 rounded-[2rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3">{saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Commit Configuration</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Zap size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Velocity</p><h3 className="text-2xl font-black italic">Active</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Trust</p><h3 className="text-2xl font-black italic">High</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Conversion</p><h3 className="text-2xl font-black italic">Fluid</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Eye size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Exposure</p><h3 className="text-2xl font-black italic">Full</h3></div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        <section className="bg-white rounded-[3.5rem] p-10 border shadow-sm space-y-8">
                            <h3 className="text-xl font-black uppercase italic tracking-widest pl-2">Authorized Provider Registry</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {PARTNERS.map((partner) => (
                                    <div key={partner.id} onClick={() => handleToggle(partner.id)} className={`flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group hover:scale-[1.02] ${enabledPartners[partner.id] ? 'border-black bg-black text-white shadow-2xl shadow-black/10' : 'border-gray-100 bg-gray-50/50 opacity-70'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-inner"><img src={partner.logo} alt={partner.name} className={`max-h-full max-w-full object-contain ${enabledPartners[partner.id] ? '' : 'filter grayscale'}`} /></div>
                                            <span className="font-black uppercase italic tracking-widest text-sm">{partner.name}</span>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-all ${enabledPartners[partner.id] ? 'bg-white' : 'bg-gray-200'}`}><div className={`w-4 h-4 rounded-full transition-all ${enabledPartners[partner.id] ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'}`} /></div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white rounded-[3.5rem] p-10 border shadow-sm space-y-8">
                            <div className="flex items-center justify-between pl-2"><h3 className="text-xl font-black uppercase italic tracking-widest">Real-time Visual Feedback</h3><span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${Object.values(enabledPartners).some(v => v) ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{Object.values(enabledPartners).some(v => v) ? 'Live Broadcast' : 'Standby'}</span></div>
                            <div className="p-10 bg-gray-50/50 rounded-[3rem] border-2 border-dashed relative group overflow-hidden"><InstallmentBar forceActive={enabledPartners} /><div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none flex items-center justify-center font-black uppercase italic text-[10px] tracking-widest">Live Preview Node</div></div>
                        </section>
                    </div>

                    <div className="space-y-8">
                        <section className="bg-black text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group"><h3 className="text-lg font-black uppercase italic mb-6">Execution Manifest</h3><ul className="space-y-5">{["Global Footer Presence", "Checkout Intelligence", "High-Resolution Branding", "Zero Latency UI"].map((item, i) => <li key={i} className="flex items-center gap-4 text-xs font-black uppercase italic opacity-80 group-hover:opacity-100 transition-all"><CheckCircle2 size={18} className="text-white" /> {item}</li>)}</ul><CreditCard className="absolute -right-6 -bottom-6 opacity-5" size={140} /></section>
                        <section className="bg-white p-10 rounded-[3rem] border shadow-sm"><h3 className="text-sm font-black uppercase italic mb-4 flex items-center gap-3 text-red-600"><AlertCircle size={20} /> Deployment Guard</h3><p className="text-[10px] font-bold text-gray-400 uppercase italic leading-relaxed">The fintech gateway will automatically de-initialize from the frontend if no partners are active in the primary registry. At least one node must be authorized for broadcast.</p></section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default InstallmentPartners;
