import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Download, Upload, FileSpreadsheet, Loader2, TrendingUp } from 'lucide-react';
import { parseYearRange } from '../../utils/productUtils';

const BulkOperations = ({ onSuccess, onExportFetch, staticProducts = [] }) => {
    const [uiLogs, setUiLogs] = useState([]);
    const btnRef = React.useRef(null);

    const log = (msg) => {
        console.log(`[REPAIR] ${msg}`);
        setUiLogs(prev => [msg, ...prev].slice(0, 5));
    };

    const runDataRepair = async () => {
        log("🚀 REPAIR INITIALIZED...");
        toast.success("REPAIR STARTED! Check the box below for logs.");

        if (!DATABASE_ID || !PRODUCTS_COLLECTION) {
            toast.error("Missing Appwrite credentials");
            return;
        }

        setLoading(true);
        const loadToast = toast.loading('Step 1: Fetching Catalog...', {
            style: { minWidth: '350px', border: '2px solid #f97316' }
        });

        try {
            let allDocs = [];
            let lastId = null;
            let hasMore = true;

            while (hasMore) {
                const queries = [Query.limit(100)];
                if (lastId) queries.push(Query.after(lastId));

                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                allDocs = [...allDocs, ...response.documents];

                if (response.documents.length < 100 || allDocs.length >= 30000) {
                    hasMore = false;
                } else {
                    lastId = response.documents[response.documents.length - 1].$id;
                    setImportStatus(`Loaded: ${allDocs.length}`);
                    toast.loading(`Syncing: ${allDocs.length} items...`, { id: loadToast });
                }
            }

            log(`✅ Catalog Fetched: ${allDocs.length} items.`);
            toast.loading(`Step 2: Repairing Metadata...`, { id: loadToast });

            let repairCount = 0;
            const refMap = new Map();
            if (Array.isArray(staticProducts)) {
                staticProducts.forEach(r => {
                    const sid = String(r?.id || r?.productID || r?.$id || '').trim();
                    if (sid) refMap.set(sid, r);
                });
            }

            for (let i = 0; i < allDocs.length; i++) {
                const doc = allDocs[i];
                const updates = {};
                const ref = refMap.get(String(doc.$id).trim());

                if (i % 50 === 0) {
                    setImportStatus(`Repairing: ${i + 1}/${allDocs.length}`);
                    toast.loading(`Scanning: ${i + 1}/${allDocs.length}...`, { id: loadToast });
                }

                if (ref) {
                    if (ref.yearStart && !doc.yearStart) updates.yearStart = Number(ref.yearStart);
                    if (ref.yearEnd && !doc.yearEnd) updates.yearEnd = Number(ref.yearEnd);
                    if (ref.yearRange && (!doc.yearRange || doc.yearRange === '-')) updates.yearRange = String(ref.yearRange);
                    if (ref.make && !doc.make) updates.make = String(ref.make).toUpperCase();
                    if (ref.model && !doc.model) updates.model = String(ref.model).toUpperCase();
                    if ((ref.brand || ref.partBrand) && !doc.brand) updates.brand = String(ref.brand || ref.partBrand);

                    if ((ref.make || ref.carMake) && (!doc.carMake || doc.carMake === '-')) updates.carMake = String(ref.make || ref.carMake).toUpperCase();
                    if ((ref.model || ref.carModel) && (!doc.carModel || doc.carModel === '-')) updates.carModel = String(ref.model || ref.carModel).toUpperCase();
                    if ((ref.yearRange || ref.carYear) && (!doc.carYear || doc.carYear === '-')) updates.carYear = String(ref.yearRange || ref.carYear);
                }

                if (doc.carMake && (!doc.make || doc.make === '-') && !updates.make) updates.make = doc.carMake.toUpperCase();
                if (doc.carModel && (!doc.model || doc.model === '-') && !updates.model) updates.model = doc.carModel.toUpperCase();
                if (doc.isActive === undefined || doc.isActive === null) updates.isActive = true;

                if (Object.keys(updates).length > 0) {
                    try {
                        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, doc.$id, updates);
                        repairCount++;
                        if (repairCount % 20 === 0) await new Promise(r => setTimeout(r, 10));
                    } catch (err) {
                        console.error(`Update failed: ${doc.$id}`, err);
                    }
                }
            }

            log(`🏆 SUCCESS! Fixed ${repairCount} entries.`);
            toast.success(`Complete! ${repairCount} fixes applied.`, { id: loadToast, duration: 10000 });
            if (onSuccess) onSuccess();
        } catch (error) {
            log(`❌ ERROR: ${error.message}`);
            toast.error(`Fatal: ${error.message}`, { id: loadToast });
        } finally {
            setLoading(false);
            setImportStatus('');
        }
    };

    // Nuclear Fallback: Direct DOM attachment
    React.useEffect(() => {
        const btn = btnRef.current;
        if (btn) {
            const fallbackHandler = () => {
                if (!loading) {
                    log("🎯 NUCLEAR FALLBACK TRIGGERED");
                    runDataRepair();
                }
            };
            btn.addEventListener('click', fallbackHandler);
            return () => btn.removeEventListener('click', fallbackHandler);
        }
    }, [loading, runDataRepair]);

    window.REPAIR_MATRIX = runDataRepair;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-2xl border-4 border-orange-500 mb-8 relative z-50">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 mr-6">
                    <div className="p-3 bg-orange-100 rounded-xl">
                        <TrendingUp className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Catalog Recovery Center</h3>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] mt-2">v5.1 | READY FOR DEEP SYNC</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button onClick={downloadTemplate} className="admin-btn-slim bg-slate-100 text-slate-700 hover:bg-slate-200 border-none px-4">
                        <Download size={14} /> Template
                    </button>

                    <button onClick={exportProducts} disabled={loading} className="admin-btn-slim bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-4">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={14} />} Export
                    </button>

                    <button
                        ref={btnRef}
                        disabled={loading}
                        id="master-repair-btn"
                        className={`px-10 py-5 bg-red-600 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 shadow-2xl transition-all duration-300 transform active:scale-90 flex items-center gap-4 cursor-pointer relative z-[100] ${loading ? 'opacity-50 grayscale' : 'animate-pulse'}`}
                    >
                        <TrendingUp size={24} /> 🚀 START MASTER REPAIR
                    </button>
                </div>

                {importStatus && (
                    <div className="ml-auto flex items-center gap-3 bg-red-50 px-5 py-3 rounded-2xl border-2 border-red-200 shadow-xl">
                        <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                        <span className="text-xs font-black text-red-600 uppercase tracking-tighter">{importStatus}</span>
                    </div>
                )}
            </div>

            {uiLogs.length > 0 && (
                <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-500 font-bold uppercase">System Telemetry</span>
                    </div>
                    {uiLogs.map((logMsg, i) => (
                        <div key={i} className="text-[10px] text-slate-300 py-1 border-b border-slate-800 last:border-0">
                            <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span> {logMsg}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span className="uppercase tracking-widest text-slate-300">Remote: {DATABASE_ID ? 'CONNECTED' : 'OFFLINE'} | Collection: {PRODUCTS_COLLECTION ? 'LOCKED' : 'ERROR'}</span>
                <span className="text-orange-500">FORCE: window.REPAIR_MATRIX()</span>
            </div>
        </div>
    );
};

export default BulkOperations;
