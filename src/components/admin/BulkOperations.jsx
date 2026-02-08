import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Download, Upload, FileSpreadsheet, Loader2, TrendingUp } from 'lucide-react';
import { parseYearRange } from '../../utils/productUtils';

const BulkOperations = ({ onSuccess, onExportFetch, staticProducts = [] }) => {
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [uiLogs, setUiLogs] = useState([]);
    const btnRef = useRef(null);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const headers = [
        'productID', 'name', 'activeStatus', 'isGenuine', 'category', 'subcategory', 'carMake', 'carModel',
        'yearRange', 'partBrand', 'countryOfOrigin', 'costPrice', 'sellPrice',
        'salePrice', 'warranty', 'description', 'imageUrl', 'partNumber', 'compatibility'
    ];

    const log = (msg) => {
        console.log(`[REPAIR] ${msg}`);
        setUiLogs(prev => [msg, ...prev].slice(0, 10));
    };

    const downloadTemplate = () => {
        const sampleData = [{
            name: "فلتر زيت",
            activeStatus: "TRUE",
            category: "Maintenance",
            carMake: "Toyota",
            carModel: "Corolla",
            yearRange: "2015-2023"
        }];
        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "products_template.xlsx");
    };

    const exportProducts = async () => {
        setLoading(true);
        try {
            let allDocs = [];
            let lastId = null;
            let hasMore = true;
            while (hasMore) {
                const queries = [Query.limit(100)];
                if (lastId) queries.push(Query.cursorAfter(lastId));
                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                allDocs = [...allDocs, ...response.documents];
                if (response.documents.length < 100) hasMore = false;
                else lastId = response.documents[response.documents.length - 1].$id;
            }
            const ws = XLSX.utils.json_to_sheet(allDocs.map(d => ({ productID: d.$id, ...d })), { header: headers });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Products");
            XLSX.writeFile(wb, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) { toast.error("Export failed"); }
        finally { setLoading(false); }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                for (const row of jsonData) {
                    const dataToUpdate = {
                        name: String(row.name || '').trim(),
                        category: String(row.category || '').trim(),
                        make: String(row.carMake || '').toUpperCase().trim(),
                        model: String(row.carModel || '').toUpperCase().trim(),
                        isActive: true
                    };
                    if (row.productID) {
                        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, String(row.productID).trim(), dataToUpdate);
                    }
                }
                toast.success("Import Complete");
            } catch (err) { toast.error("Import failure"); }
            finally { setLoading(false); }
        };
        reader.readAsArrayBuffer(file);
    };

    const runDataRepair = async () => {
        log("🚀 GLOBAL RECOVERY STARTED (NUCLEAR MODE)...");
        toast.loading('Force Syncing 20,000 items...', { id: 'repair-toast' });

        try {
            setLoading(true);
            let allDocs = [];
            let lastId = null;
            let hasMore = true;

            log("🛰️ Phase 1: Exhaustive Catalog Fetch...");
            while (hasMore) {
                const queries = [Query.limit(100)];
                if (lastId) queries.push(Query.cursorAfter(lastId));
                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                allDocs = [...allDocs, ...response.documents];
                if (response.documents.length < 100 || allDocs.length >= 35000) {
                    hasMore = false;
                } else {
                    lastId = response.documents[response.documents.length - 1].$id;
                    setImportStatus(`Gathering: ${allDocs.length}`);
                }
            }

            log(`🛰️ Fetched ${allDocs.length} records. Building Reference Matrix...`);
            const refMap = new Map();
            if (Array.isArray(staticProducts)) {
                staticProducts.forEach(r => {
                    const sid = String(r?.id || r?.productID || r?.$id || '').trim();
                    if (sid) refMap.set(sid, r);
                });
            }

            let repairCount = 0;
            log("🔨 Phase 2: Repairing Metadata In-Place...");
            for (let i = 0; i < allDocs.length; i++) {
                const doc = allDocs[i];
                const updates = {};
                const ref = refMap.get(String(doc.$id).trim());

                if (i % 50 === 0) setImportStatus(`Repairs: ${repairCount} | Progress: ${i + 1}/${allDocs.length}`);

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

                if (doc.carMake && !doc.make) updates.make = doc.carMake.toUpperCase();
                if (doc.carModel && !doc.model) updates.model = doc.carModel.toUpperCase();
                if (doc.isActive === undefined || doc.isActive === null) updates.isActive = true;

                if (Object.keys(updates).length > 0) {
                    try {
                        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, doc.$id, updates);
                        repairCount++;
                        if (repairCount % 20 === 0) await new Promise(r => setTimeout(r, 10));
                    } catch (e) { }
                }
            }

            log(`🏆 SUCCESS: Applied ${repairCount} fixes to ${allDocs.length} items.`);
            toast.success(`Complete! Fixed ${repairCount} items.`, { id: 'repair-toast', duration: 10000 });
        } catch (error) {
            log(`❌ FATAL ERROR: ${error.message}`);
            toast.error(`System Failure: ${error.message}`, { id: 'repair-toast' });
        } finally {
            setLoading(false);
            setImportStatus('');
            if (onSuccess) onSuccess();
        }
    };

    useEffect(() => {
        const globalHandler = (e) => {
            if (e.target && (e.target.id === 'master-repair-btn' || e.target.closest('#master-repair-btn'))) {
                log("🎯 GLOBAL INTERCEPT TRIGGERED!");
                if (!loading) runDataRepair();
                else log("⚠️ Action ignored: Sync currently running.");
            }
        };
        window.addEventListener('click', globalHandler, true);
        return () => window.removeEventListener('click', globalHandler, true);
    }, [loading]);

    window.REPAIR_MATRIX = runDataRepair;

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(220,38,38,0.2)] border-8 border-red-600 mb-12 relative z-[9999] overflow-hidden transform-gpu">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full -mr-32 -mt-32 blur-3xl" />

            <div className="flex flex-wrap items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-red-600 rounded-[2rem] shadow-2xl shadow-red-600/40 animate-pulse">
                        <TrendingUp className="h-10 w-10 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Catalog Recovery Node</h3>
                        <p className="text-xs font-bold text-red-600 uppercase tracking-[0.3em] mt-3">EMERGENCY PROTOCOL v5.3 | ACTIVE</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <button onClick={downloadTemplate} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                        Template
                    </button>

                    <button
                        id="master-repair-btn"
                        disabled={loading}
                        className={`px-14 py-8 bg-red-600 text-white font-black text-lg uppercase tracking-[0.25em] rounded-3xl hover:bg-red-700 shadow-[0_20px_40px_-10px_rgba(220,38,38,0.5)] transition-all duration-300 transform active:scale-90 flex items-center gap-6 cursor-pointer relative z-[100] ${loading ? 'opacity-50 grayscale' : 'animate-bounce'}`}
                    >
                        <TrendingUp size={32} /> START MASTER REPAIR
                    </button>
                </div>
            </div>

            {importStatus && (
                <div className="mt-8 flex items-center gap-4 bg-red-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-lg font-black uppercase tracking-tighter">{importStatus}</span>
                </div>
            )}

            <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl shadow-inner overflow-hidden">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                        <span className="text-xs text-red-500 font-black uppercase tracking-widest">System Telemetry Log</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono italic">zait-os core diagnostics active</span>
                </div>
                <div className="space-y-2">
                    {uiLogs.length === 0 ? (
                        <div className="text-[11px] text-slate-600 font-mono py-2 italic px-2">Waiting for trigger command...</div>
                    ) : (
                        uiLogs.map((logMsg, i) => (
                            <div key={i} className="text-[11px] text-slate-300 py-2 border-b border-white/5 last:border-0 font-mono flex items-start gap-4 hover:bg-white/5 rounded px-2 transition-colors">
                                <span className="text-slate-600 flex-shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                <span className={`${logMsg.includes('❌') ? 'text-red-400' : logMsg.includes('🏆') ? 'text-emerald-400' : ''}`}>{logMsg}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400">
                <div className="flex gap-6 uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Remote: {DATABASE_ID ? 'CONNECTED' : 'OFFLINE'}</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Catalog: {staticProducts?.length || 0} ITEMS</span>
                </div>
                <div className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full shadow-sm hover:bg-orange-100 transition-colors">
                    EMERGENCY OVERRIDE: window.REPAIR_MATRIX()
                </div>
            </div>
        </div>
    );
};

export default BulkOperations;
