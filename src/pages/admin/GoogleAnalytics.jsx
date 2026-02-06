import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, Save, ExternalLink, Info, BarChart, AlertCircle, PlayCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const GoogleAnalytics = () => {
    const [measurementId, setMeasurementId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testStatus, setTestStatus] = useState('untested'); // untested, checking, found, mismatch, not_found, error
    const [lastChecked, setLastChecked] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const docRef = doc(db, 'settings', 'integrations');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setMeasurementId(docSnap.data().googleAnalyticsId || '');
                }
            } catch (error) {
                console.error("Error fetching integrations:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'integrations'), {
                googleAnalyticsId: measurementId
            }, { merge: true });
            toast.success('Google Analytics Measurement ID saved!');
            setTestStatus('untested');
        } catch (error) {
            console.error("Error saving GA4 ID:", error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!measurementId) {
            toast.error('Please enter a Measurement ID first');
            return;
        }

        setTestStatus('checking');
        try {
            const response = await axios.post('/api/products?action=check-seo', {
                targetUrl: window.location.origin,
                tagName: 'google-analytics', // Special flag for our API
                expectedValue: measurementId
            });

            setTestStatus(response.data.status);
            setLastChecked(new Date());

            if (response.data.status === 'found') {
                toast.success('Analytics verification successful! Gtag is active.');
            } else if (response.data.status === 'not_found') {
                toast.error('Analytics script not found on your homepage.');
            } else if (response.data.status === 'mismatch') {
                toast.error('Measurement ID found but it does not match your saved ID.');
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
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                        <BarChart className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Google Analytics</h1>
                        <p className="text-gray-500 text-sm font-medium">Track your website traffic and user behavior</p>
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
                            testStatus === 'found' ? 'GA4 Active & Tracking' :
                                testStatus === 'not_found' ? 'gtag.js Not Detected' :
                                    testStatus === 'mismatch' ? 'ID Mismatch Detected' :
                                        testStatus === 'error' ? 'Connection Error' :
                                            testStatus === 'checking' ? 'Scanning for gtag...' : 'Not Tested'
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
                                GA4 Measurement ID
                            </label>
                            <input
                                type="text"
                                value={measurementId}
                                onChange={(e) => setMeasurementId(e.target.value)}
                                placeholder='Example: G-XXXXXXXXXX'
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#008a40] focus:bg-white rounded-2xl outline-none transition-all font-mono text-sm"
                            />
                            <div className="p-4 bg-orange-50 rounded-2xl flex gap-3 border border-orange-100">
                                <Info className="w-5 h-5 text-orange-600 shrink-0" />
                                <p className="text-xs text-orange-800 leading-relaxed">
                                    Enter your <strong>Measurement ID</strong> (starting with G-). Our system will automatically inject the Google tag (gtag.js) and start tracking page views.
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
                                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">1</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Open Google Analytics</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Login to your Google Analytics account and select the <strong>GA4 Property</strong> for your website.
                                    </p>
                                    <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
                                        Open Analytics <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">2</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Go to Data Streams</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Click on <strong>Admin</strong> (gear icon) → <strong>Data Streams</strong> (under Property settings) and select your web stream.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">3</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Copy Measurement ID</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        You will see a <strong>Measurement ID</strong> in the top right corner (e.g., G-26L99XXX). Copy this ID.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">4</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Paste and Save</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Paste the ID into the box above and click <strong>"Save Configuration"</strong>. Use the <strong>"Test Connection"</strong> button to verify.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            How to Verify Integration
                        </h3>
                        <div className="space-y-6">
                            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="font-bold text-blue-900 mb-2">Method 1: Google Real-time Report</p>
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    Open your website in a separate tab or on your phone. In your Google Analytics dashboard, go to <strong>Reports → Real-time</strong>. You should see yourself as an active user within 30-60 seconds.
                                </p>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="font-bold text-gray-900 mb-2">Method 2: Browser Console (Advanced)</p>
                                <p className="text-sm text-gray-600 leading-relaxed font-mono">
                                    1. Open your website.<br />
                                    2. Press F12 (Developer Tools).<br />
                                    3. Go to the <strong>Console</strong> tab.<br />
                                    4. Type <code>window.dataLayer</code> and press Enter.<br />
                                    5. You should see an array containing your Measurement ID.
                                </p>
                            </div>

                            <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                                <p className="font-bold text-green-900 mb-2">Method 3: Google Tag Assistant</p>
                                <p className="text-sm text-green-800 leading-relaxed">
                                    Install the <strong>Google Tag Assistant</strong> Chrome extension. It will show a green or blue tag icon if the tracking is installed correctly.
                                </p>
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
                                "Google Account",
                                "GA4 Property Created",
                                "Web Data Stream Setup",
                                "Admin level permissions"
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

                    <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100">
                        <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-600" />
                            Data Delay
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            It can take up to 24-48 hours for data to start appearing in your Google Analytics dashboard reports, although Real-Time reports should work within minutes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleAnalytics;
