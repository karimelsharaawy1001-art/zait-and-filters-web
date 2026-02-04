import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, Save, ExternalLink, Info, Facebook, AlertCircle, PlayCircle, FileCode, Copy } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const FacebookInstagramShopping = () => {
    const feedUrl = `${window.location.origin}/api/products?action=generateFeed&platform=facebook`;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Feed URL copied to clipboard!');
    };

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
                    <div className="w-16 h-16 bg-[#0064E0] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                        <Facebook className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">FB & Instagram Shop</h1>
                        <p className="text-gray-500 text-sm font-medium">Sell your products across Meta platforms</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <FileCode className="w-5 h-5 text-[#0064E0]" />
                            Meta Catalog Feed (XML)
                        </h3>
                        <div className="space-y-6">
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Use the URL below in Meta Commerce Manager under "Data Sources". This feed is generated dynamically and follows the Meta Catalog specifications.
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
                                    <strong>Real-Time Sync</strong>: Meta will fetch this feed periodically to ensure your prices and stock status are always up to date on Facebook and Instagram.
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
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0064E0] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">1</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Open Commerce Manager</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Login to Meta Business Suite and navigate to <strong>Commerce Manager</strong>. Choose or create your Catalog.
                                    </p>
                                    <a href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
                                        Open Commerce <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0064E0] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">2</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Add Data Source</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Go to <strong>Catalog</strong> → <strong>Data Sources</strong> → <strong>Add Items</strong>. Choose "Data Feed" and "Scheduled Feed".
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0064E0] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">3</div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1 text-lg">Paste Feed URL</p>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                        Paste the Feed URL from this page and set the schedule (recommended: hourly or daily).
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
                                "Facebook Business Manager account",
                                "Verified domain on Meta Suite",
                                "Facebook Pixel installed & active",
                                "Publicly accessible images"
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
                            Pixel Dependency
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            To enable dynamic ads and retargeting, ensure you have already configured the **Facebook Pixel** tab in the Integrations Hub.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacebookInstagramShopping;
