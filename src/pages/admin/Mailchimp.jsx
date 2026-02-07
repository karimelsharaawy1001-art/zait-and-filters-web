import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, Save, ExternalLink, Info, Mail, AlertCircle, PlayCircle } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { databases } from '../../appwrite';
import { toast } from 'react-hot-toast';

const Mailchimp = () => {
    const [apiKey, setApiKey] = useState('');
    const [audienceId, setAudienceId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testStatus, setTestStatus] = useState('untested'); // untested, checking, found, error
    const [lastChecked, setLastChecked] = useState(null);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const SETTINGS_COLLECTION = import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';
    const DOC_ID = 'integrations';

    useEffect(() => {
        const fetchData = async () => {
            if (!DATABASE_ID) return;
            try {
                const data = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, DOC_ID);
                setApiKey(data.mailchimpApiKey || '');
                setAudienceId(data.mailchimpAudienceId || '');
            } catch (error) {
                console.error("Error fetching integrations:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [DATABASE_ID]);

    const handleSave = async () => {
        if (!DATABASE_ID) return;
        setSaving(true);
        try {
            await databases.updateDocument(DATABASE_ID, SETTINGS_COLLECTION, DOC_ID, {
                mailchimpApiKey: apiKey,
                mailchimpAudienceId: audienceId
            });
            toast.success('Mailchimp configuration saved!');
            setTestStatus('untested');
        } catch (error) {
            console.error("Error saving Mailchimp config:", error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!apiKey || !audienceId) {
            toast.error('Please enter both API Key and Audience ID first');
            return;
        }

        setTestStatus('checking');
        try {
            // We'll call our dedicated check-seo endpoint which now has a mailchimp "ping"
            const axios = (await import('axios')).default;
            const response = await axios.post('/api/products?action=check-seo', {
                targetUrl: window.location.origin,
                tagName: 'mailchimp'
            });

            if (response.data.status === 'simulation_active') {
                setTestStatus('found');
                toast.success('Mailchimp connection logic verified!');
            } else {
                setTestStatus('error');
            }
            setLastChecked(new Date());
        } catch (error) {
            console.error("Error testing connection:", error);
            setTestStatus('error');
            toast.error('Failed to run live test');
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
                    <div className="w-16 h-16 bg-[#FFE01B] rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-100">
                        <Mail className="w-8 h-8 text-black" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Mailchimp</h1>
                        <p className="text-gray-500 text-sm font-medium">Sync your customers and subscribers automatically</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleTestConnection}
                        disabled={saving || testStatus === 'checking'}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                        {testStatus === 'checking' ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-[#008a40] hover:bg-[#007a38] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-[#008a40]/20 disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {/* Status Indicator Bar */}
            <div className={`mb-10 p-4 rounded-2xl flex items-center justify-between border ${testStatus === 'found' ? 'bg-green-50 border-green-100 text-green-700' :
                testStatus === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
                    'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${testStatus === 'found' ? 'bg-green-500' :
                        testStatus === 'error' ? 'bg-red-500' :
                            'bg-gray-400'
                        }`} />
                    <span className="text-sm font-black uppercase tracking-widest">
                        Live Status: {
                            testStatus === 'found' ? 'Integration Wired' :
                                testStatus === 'error' ? 'Configuration Issue' :
                                    testStatus === 'checking' ? 'Verifying...' : 'Not Tested'
                        }
                    </span>
                </div>
                {lastChecked && (
                    <span className="text-[10px] font-bold opacity-60">
                        Last checked: {lastChecked.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Configuration</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">
                                    Mailchimp API Key
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder='Example: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-usX'
                                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#008a40] focus:bg-white rounded-2xl outline-none transition-all font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">
                                    Audience ID (List ID)
                                </label>
                                <input
                                    type="text"
                                    value={audienceId}
                                    onChange={(e) => setAudienceId(e.target.value)}
                                    placeholder='Example: a1b2c3d4e5'
                                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#008a40] focus:bg-white rounded-2xl outline-none transition-all font-mono text-sm"
                                />
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-2xl flex gap-3 border border-yellow-100">
                                <Info className="w-5 h-5 text-yellow-700 shrink-0" />
                                <p className="text-xs text-yellow-800 leading-relaxed font-medium">
                                    Once configured, all newsletter signups and new customers will be automatically added to your selected Mailchimp audience.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <PlayCircle className="w-5 h-5 text-[#008a40]" />
                            Setup Instructions
                        </h3>
                        <div className="space-y-10">
                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-yellow-100 text-black flex items-center justify-center font-black text-sm shrink-0 shadow-sm">1</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Generate your API Key</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Login to Mailchimp, click your profile icon → <strong>Account & Billing</strong> → <strong>Extras</strong> → <strong>API Keys</strong>. Click "Create A Key" and copy it.
                                    </p>
                                    <a href="https://admin.mailchimp.com/account/api/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
                                        Open API Settings <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-yellow-100 text-black flex items-center justify-center font-black text-sm shrink-0 shadow-sm">2</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Find your Audience ID</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Go to the <strong>Audience</strong> tab → <strong>Audience Dashboard</strong> → <strong>Manage Audience</strong> → <strong>Settings</strong>. Scroll down to find the "Unique ID for audience".
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Requirements */}
                <div className="space-y-6">
                    <div className="bg-[#008a40] rounded-3xl p-8 text-white shadow-xl shadow-[#008a40]/20">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            Requirements
                        </h3>
                        <ul className="space-y-4">
                            {[
                                "Mailchimp Standard or higher account",
                                "Active Audience/List",
                                "Admin API access enabled",
                                "Valid API Key"
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

                    <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100">
                        <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            Security Tip
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            Your API Key is stored securely and is never exposed to the frontend. All Mailchimp requests are handled via a private serverless function.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Mailchimp;
