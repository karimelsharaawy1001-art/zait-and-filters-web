import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Mail, CheckCircle2, AlertCircle, Info, ExternalLink, Send } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const SendGridSettings = () => {
    const [settings, setSettings] = useState({
        apiKey: '',
        senderEmail: '',
        senderName: 'ZAIT & FILTERS'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'integrations');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data().sendgrid || {};
                    setSettings({
                        apiKey: data.apiKey || '',
                        senderEmail: data.senderEmail || '',
                        senderName: data.senderName || 'ZAIT & FILTERS'
                    });
                }
            } catch (error) {
                console.error("Error fetching SendGrid settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'integrations'), {
                sendgrid: settings
            }, { merge: true });
            toast.success('SendGrid settings saved!');
        } catch (error) {
            console.error("Error saving SendGrid settings:", error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!settings.apiKey || !settings.senderEmail) {
            toast.error("Please save your API Key and Sender Email first.");
            return;
        }

        setTesting(true);
        try {
            const response = await axios.post('/api/send-order-email', {
                isTest: true,
                testEmail: settings.senderEmail, // Send to self
                ...settings
            });

            if (response.data.success) {
                toast.success('Test email sent! Please check your inbox.');
            } else {
                throw new Error(response.data.error || 'Failed to send test email');
            }
        } catch (error) {
            console.error("Error sending test email:", error);
            toast.error(error.response?.data?.error || error.message || 'Error sending test email');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-admin-bg flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing messaging node...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-admin-bg font-sans pb-20 p-4 md:p-8">
            <div className="max-w-5xl mx-auto mt-6">
                <NavLink
                    to="/admin/integrations"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white mb-10 transition-colors group bg-[#ffffff05] px-6 py-3 rounded-xl border border-admin-border"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Hub
                </NavLink>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-[#00B3E3] rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900/20 group hover:scale-105 transition-transform duration-500">
                            <Mail className="w-10 h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase poppins">SendGrid</h1>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Transactional Communication Cluster</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleSendTest}
                            disabled={testing || saving}
                            className="flex items-center justify-center gap-3 px-8 py-5 bg-[#ffffff05] hover:bg-[#ffffff0a] text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-admin-border transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Send className={`w-4 h-4 text-admin-accent ${testing ? 'animate-bounce' : ''}`} />
                            {testing ? 'Transmitting...' : 'Ping Node'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center justify-center gap-3 px-10 py-5 bg-admin-red hover:bg-admin-red-dark text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-admin-red/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Synchronizing...' : 'Update Cluster'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        <section className="bg-admin-card rounded-[2.5rem] p-10 border border-admin-border shadow-admin relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Send className="h-32 w-32 text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 poppins relative">
                                <div className="p-2 bg-admin-accent/10 rounded-xl">
                                    <Mail className="h-5 w-5 text-admin-accent" />
                                </div>
                                API Configuration
                            </h3>
                            <div className="space-y-8 relative">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Access Protocol (API Key)</label>
                                    <input
                                        type="password"
                                        name="apiKey"
                                        value={settings.apiKey}
                                        onChange={handleChange}
                                        placeholder='SG.xxxxxxxx'
                                        className="w-full px-6 py-4 bg-[#ffffff05] border border-admin-border focus:border-admin-accent rounded-2xl outline-none transition-all font-mono text-white text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Verified Sender Identity</label>
                                        <input
                                            type="email"
                                            name="senderEmail"
                                            value={settings.senderEmail}
                                            onChange={handleChange}
                                            placeholder='ops@zaitandfilters.com'
                                            className="w-full px-6 py-4 bg-[#ffffff05] border border-admin-border focus:border-admin-accent rounded-2xl outline-none transition-all text-white text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Display Alias</label>
                                        <input
                                            type="text"
                                            name="senderName"
                                            value={settings.senderName}
                                            onChange={handleChange}
                                            placeholder='ZAIT & FILTERS'
                                            className="w-full px-6 py-4 bg-[#ffffff05] border border-admin-border focus:border-admin-accent rounded-2xl outline-none transition-all text-white text-sm font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-admin-card rounded-[2.5rem] p-10 border border-admin-border shadow-admin relative overflow-hidden group">
                            <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 poppins relative">
                                <div className="p-2 bg-admin-accent/10 rounded-xl">
                                    <ExternalLink className="h-5 w-5 text-admin-accent" />
                                </div>
                                Deliverability Protocols
                            </h3>
                            <div className="space-y-8 relative">
                                <div className="flex gap-6 group/item">
                                    <div className="w-10 h-10 rounded-2xl bg-[#ffffff05] border border-admin-border text-admin-accent flex items-center justify-center font-black text-xs flex-shrink-0 group-hover/item:bg-admin-accent group-hover/item:text-white transition-all">01</div>
                                    <div className="text-[11px] text-admin-text-secondary font-bold uppercase tracking-widest leading-relaxed">
                                        Execute <strong className="text-white">Sender Authentication</strong> via DNS (DKIM/SPF) to bypass spam-detection clusters.
                                    </div>
                                </div>
                                <div className="flex gap-6 group/item">
                                    <div className="w-10 h-10 rounded-2xl bg-[#ffffff05] border border-admin-border text-admin-accent flex items-center justify-center font-black text-xs flex-shrink-0 group-hover/item:bg-admin-accent group-hover/item:text-white transition-all">02</div>
                                    <div className="text-[11px] text-admin-text-secondary font-bold uppercase tracking-widest leading-relaxed">
                                        Finalize <strong className="text-white">Single Sender Verification</strong> if domain-level DNS integration is pending.
                                    </div>
                                </div>
                                <div className="flex gap-6 group/item">
                                    <div className="w-10 h-10 rounded-2xl bg-[#ffffff05] border border-admin-border text-admin-accent flex items-center justify-center font-black text-xs flex-shrink-0 group-hover/item:bg-admin-accent group-hover/item:text-white transition-all">03</div>
                                    <div className="text-[11px] text-admin-text-secondary font-bold uppercase tracking-widest leading-relaxed">
                                        Monitor <strong className="text-white">Reputation Metrics</strong> in the SendGrid Insights module to ensure 99%+ delivery rate.
                                    </div>
                                </div>
                                <a
                                    href="https://app.sendgrid.com/settings/sender_auth"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-admin-accent hover:text-white transition-colors bg-admin-accent/10 px-6 py-3 rounded-xl border border-admin-accent/20"
                                >
                                    Access SendGrid Dashboard <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-8">
                            <div className="bg-admin-card rounded-[2.5rem] p-10 border border-admin-border shadow-admin group relative overflow-hidden">
                                <div className="absolute -right-10 -bottom-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Mail className="h-40 w-40 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 poppins">
                                    Node Clusters
                                </h3>
                                <ul className="space-y-6">
                                    {[
                                        "Order Validation Protocol",
                                        "Logistics Update Stream",
                                        "C-JSON HTML Templating",
                                        "Dynamic Feedback Loops"
                                    ].map((req, idx) => (
                                        <li key={idx} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-admin-text-secondary">
                                            <div className="w-5 h-5 rounded-lg bg-admin-green/20 flex items-center justify-center text-admin-green">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-8 bg-admin-accent/10 rounded-[2.5rem] border border-admin-accent/20">
                                <h3 className="text-admin-accent font-black uppercase tracking-widest mb-4 flex items-center gap-3 text-xs poppins">
                                    <Info className="w-5 h-5" />
                                    Vault Protocol
                                </h3>
                                <p className="text-[10px] text-white/50 leading-relaxed font-black uppercase tracking-widest">
                                    API Access Tokens are isolated in encrypted Firestore cells. Mission-critical functions execute only within <code className="text-admin-accent">server-isolated</code> environments.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendGridSettings;
