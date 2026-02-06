import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, Save, ExternalLink, Info, Search, AlertCircle, PlayCircle, FileCode, Copy } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const GoogleMerchantCenter = () => {
    const [merchantId, setMerchantId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const feedUrl = `${window.location.origin}/api/products?action=generateFeed`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const docRef = doc(db, 'settings', 'integrations');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setMerchantId(docSnap.data().googleMerchantId || '');
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
                googleMerchantId: merchantId
            }, { merge: true });
            toast.success('Google Merchant ID saved!');
        } catch (error) {
            console.error("Error saving GMC ID:", error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Feed URL copied to clipboard!');
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
                    <div className="w-16 h-16 bg-[#4285F4] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                        <Search className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Google Merchant Center</h1>
                        <p className="text-gray-500 text-sm font-medium">Sync your products with Google Shopping</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#008a40] hover:bg-[#007a38] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-[#008a40]/20 disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            Basic Setup
                        </h3>
                        <div className="space-y-4">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">
                                Merchant Center ID
                            </label>
                            <input
                                type="text"
                                value={merchantId}
                                onChange={(e) => setMerchantId(e.target.value)}
                                placeholder='Example: 123456789'
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#008a40] focus:bg-white rounded-2xl outline-none transition-all font-mono text-sm"
                            />
                        </div>
                    </section>

                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <FileCode className="w-5 h-5 text-[#4285F4]" />
                            Product Feed (XML)
                        </h3>
                        <div className="space-y-6">
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Use the URL below in your Google Merchant Center account. This feed is generated dynamically and contains all active products in your store.
                            </p>

                            <div className="group relative">
                                <input
                                    type="text"
                                    readOnly
                                    value={feedUrl}
                                    className="w-full px-6 py-4 bg-gray-900 text-blue-400 rounded-2xl pr-20 font-mono text-xs overflow-hidden text-ellipsis border-2 border-transparent"
                                />
                                <button
                                    onClick={() => copyToClipboard(feedUrl)}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Copy URL
                                </button>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-2xl flex gap-3 border border-blue-100">
                                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Automatic Refresh</strong>: Google will fetch this URL at the interval you specify (recommended: daily) to keep your prices and availability in sync.
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
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#4285F4] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">1</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Create GMC Account</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Login to Google Merchant Center and complete the initial business setup.
                                    </p>
                                    <a href="https://merchants.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
                                        Open Merchant Center <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#4285F4] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">2</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Verify Your Domain</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Use the <strong>Google Search Console</strong> integration to verify ownership of your website. Google will prompt you for this during setup.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#4285F4] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">3</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Setup Product Feed</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Go to <strong>Products</strong> → <strong>Feeds</strong> → <strong>Add Feed</strong>. Choose "Scheduled fetch" and paste the XML Feed URL from above.
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
                                "Verified domain via Search Console",
                                "Accurate Pricing & Stock",
                                "High-quality Product Images",
                                "Clear Shipping & Return Policies"
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
                            Data Accuracy
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            Google regularly crawls your site. Ensure the price and availability in the feed exactly match what is displayed on your product pages to avoid account suspension.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleMerchantCenter;
