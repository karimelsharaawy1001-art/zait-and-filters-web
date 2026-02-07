import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, Save, ExternalLink, Info, Facebook, AlertCircle, PlayCircle } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { databases } from '../../appwrite';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const FacebookPixel = () => {
    const [pixelId, setPixelId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testStatus, setTestStatus] = useState('untested'); // untested, checking, found, mismatch, not_found, error
    const [lastChecked, setLastChecked] = useState(null);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const SETTINGS_COLLECTION = import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';
    const DOC_ID = 'integrations';

    useEffect(() => {
        const fetchData = async () => {
            if (!DATABASE_ID) return;
            try {
                const docSnap = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, DOC_ID);
                setPixelId(docSnap.facebookPixelId || '');
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
                facebookPixelId: pixelId
            });
            toast.success('Facebook Pixel ID saved!');
            setTestStatus('untested');
        } catch (error) {
            console.error("Error saving Pixel ID:", error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!pixelId) {
            toast.error('Please enter a Pixel ID first');
            return;
        }

        setTestStatus('checking');
        try {
            const response = await axios.post('/api/products?action=check-seo', {
                targetUrl: window.location.origin,
                tagName: 'facebook-pixel', // Special flag for our API to check scripts
                expectedValue: pixelId
            });

            setTestStatus(response.data.status);
            setLastChecked(new Date());

            if (response.data.status === 'found') {
                toast.success('Pixel verification successful! Script is active.');
            } else if (response.data.status === 'not_found') {
                toast.error('Pixel script not found on your homepage.');
            } else if (response.data.status === 'mismatch') {
                toast.error('Pixel ID found but it does not match your saved ID.');
            }
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
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Facebook className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Facebook Pixel</h1>
                        <p className="text-gray-500 text-sm font-medium">Track conversions and optimize ad performance</p>
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
                testStatus === 'not_found' || testStatus === 'mismatch' ? 'bg-red-50 border-red-100 text-red-700' :
                    testStatus === 'error' ? 'bg-orange-50 border-orange-100 text-orange-700' :
                        'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${testStatus === 'found' ? 'bg-green-500' :
                        testStatus === 'not_found' || testStatus === 'mismatch' ? 'bg-red-500' :
                            testStatus === 'error' ? 'bg-orange-500' :
                                'bg-gray-400'
                        }`} />
                    <span className="text-sm font-black uppercase tracking-widest">
                        Live Status: {
                            testStatus === 'found' ? 'Pixel Active & Optimized' :
                                testStatus === 'not_found' ? 'Script Not Detected' :
                                    testStatus === 'mismatch' ? 'ID Mismatch Detected' :
                                        testStatus === 'error' ? 'Connection Error' :
                                            testStatus === 'checking' ? 'Verifying Script...' : 'Not Tested'
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
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            Configuration
                        </h3>
                        <div className="space-y-4">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">
                                Facebook Pixel ID
                            </label>
                            <input
                                type="text"
                                value={pixelId}
                                onChange={(e) => setPixelId(e.target.value)}
                                placeholder='Example: 123456789012345'
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#008a40] focus:bg-white rounded-2xl outline-none transition-all font-mono text-sm"
                            />
                            <div className="p-4 bg-indigo-50 rounded-2xl flex gap-3 border border-indigo-100">
                                <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                                <p className="text-xs text-indigo-800 leading-relaxed">
                                    Only enter the 15-16 digit <strong>Pixel ID</strong> number. Our system handles the complex tracking scripts and event firing automatically for you.
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
                                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">1</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Open Meta Events Manager</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Navigate to your Facebook Business Suite and open the <strong>Events Manager</strong>. Ensure you have the correct Business Account selected.
                                    </p>
                                    <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
                                        Open Events Manager <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">2</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Select Your Data Source</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Select the <strong>Pixel or Data Source</strong> you want to use. If you haven't created one, click the "+" green button to "Connect Data Sources" and choose "Web".
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">3</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Copy the Pixel ID</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Go to the <strong>"Settings"</strong> tab of your selected Pixel. Look for the "Pixel ID" section (usually under Basic Information). Copy that long number.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">4</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Paste and Verify</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Paste the ID into the configuration box above and click <strong>"Save Configuration"</strong>. Then, use the <strong>"Test Connection"</strong> button to ensure it's live.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Requirements & Status */}
                <div className="space-y-6">
                    <div className="bg-[#008a40] rounded-3xl p-8 text-white shadow-xl shadow-[#008a40]/20">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            Requirements
                        </h3>
                        <ul className="space-y-4">
                            {[
                                "Facebook Business Account",
                                "Active Pixel Data Source",
                                "Admin access to Events Manager",
                                "Public website URL"
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
                            Tracking Warning
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Some browsers or ad-blocks may prevent the Pixel from loading. For a clean test, ensure you are not using an ad-blocker on your store.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacebookPixel;
