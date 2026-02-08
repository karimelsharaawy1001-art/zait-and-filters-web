import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Download, Upload, Loader2, TrendingUp, AlertCircle, RefreshCcw } from 'lucide-react';

/*
- [ ] Sync Protocol v6.2: Final Manual Schema (Strict)
    - [x] Strip updatedAt/createdAt (Appwrite system manages these)
    - [x] Stick ONLY to verified custom attributes
    - [ ] Final verification of 4,000+ item sync success
*/

const BulkOperations = ({ onSuccess, onExportFetch, staticProducts = [] }) => {
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [uiLogs, setUiLogs] = useState([]);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const headers = [
        'productID', 'name', 'activeStatus', 'isGenuine', 'category', 'subcategory', 'carMake', 'carModel',
        'carYear', 'partBrand', 'sellPrice', 'salePrice', 'description', 'imageUrl', 'stock'
    ];

    const log = (msg) => {
        console.log(`[BULK] ${msg}`);
        setUiLogs(prev => [msg, ...prev].slice(0, 15));
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const downloadTemplate = () => {
        try {
            const sampleData = [{
                name: "Product Name / اسم المنتج",
                activeStatus: "TRUE",
                category: "Category Name",
                carMake: "Vehicle Brand",
                carModel: "Vehicle Model",
                carYear: "2015-2023",
                sellPrice: 1000,
                stock: 10
            }];
            const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");
            XLSX.writeFile(wb, "products_template_v6.2.xlsx");
            log("✅ Template v6.2 downloaded.");
        } catch (e) {
            log(`❌ Template error: ${e.message}`);
        }
    };

    const handleImport = async (e) => {
        if (loading) return;
        e.preventDefault();
        e.stopPropagation();

        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        log(`📂 Loading File: ${file.name}`);
        setImportStatus('Initializing Sync v6.2...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                log(`📊 Analysis Complete: ${jsonData.length} rows found.`);
                let success = 0;
                let fail = 0;

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const count = i + 1;

                    let retryCount = 0;
                    let committed = false;

                    while (!committed && retryCount < 5) {
                        try {
                            setImportStatus(`Clean-Sync v6.2: ${count}/${jsonData.length}`);

                            // 🏁 Verified Attributes ONLY (Directly Audit Matched)
                            // Stripped: updatedAt, createdAt (Unknown Attributes)
                            const p = {
                                name: String(row.name || '').trim(),
                                nameAr: String(row.name || '').trim(),
                                description: String(row.description || '').trim(),
                                descriptionAr: String(row.description || '').trim(),
                                price: Number(row.sellPrice || row.price || 0),
                                salePrice: row.salePrice ? Number(row.salePrice) : null,
                                category: String(row.category || '').trim(),
                                subcategory: String(row.subcategory || '').trim(),
                                brand: String(row.partBrand || row.brand || '').trim(),
                                partBrand: String(row.partBrand || row.brand || '').trim(),
                                images: String(row.imageUrl || row.images || row.image || '').trim(),
                                stock: Number(row.stock || row.stockQuantity || 0),
                                stockQuantity: Number(row.stock || row.stockQuantity || 0),
                                carMake: String(row.carMake || row.make || '').toUpperCase().trim(),
                                carModel: String(row.carModel || row.model || '').toUpperCase().trim(),
                                carYear: row.carYear ? String(row.carYear) : (row.yearStart ? `${row.yearStart}-${row.yearEnd || 'Cur'}` : null),
                                featured: false,
                                isActive: String(row.activeStatus).toLowerCase() !== 'false'
                            };

                            if (!p.name) throw new Error("Row Missing Name");

                            if (row.productID && String(row.productID).length > 5) {
                                await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, String(row.productID).trim(), p);
                            } else {
                                await databases.createDocument(DATABASE_ID, PRODUCTS_COLLECTION, ID.unique(), p);
                            }

                            success++;
                            committed = true;
                            if (success % 10 === 0) log(`🔹 Synchronized ${success} items...`);

                            await sleep(500);

                        } catch (err) {
                            const errorMsg = err.message || '';
                            if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.includes('429')) {
                                retryCount++;
                                log(`🚦 Rate Limit Hit (Row ${count}). Cooling down 10s...`);
                                setImportStatus(`🚦 COOLING DOWN: ${count}/${jsonData.length}`);
                                await sleep(10000);
                            } else {
                                fail++;
                                log(`🚨 Row ${count} Rejected: ${errorMsg}`);
                                committed = true;
                            }
                        }
                    }
                }

                log(`🏆 FINAL SYNC: ${success} SUCCESS | ${fail} FAILURES`);
                toast.success(`Sync Complete. ${success} items updated.`, { duration: 5000 });

                e.target.value = '';
                if (onSuccess) onSuccess();
            } catch (err) {
                log(`❌ FATAL SYNC ERROR: ${err.message}`);
            }
            finally {
                setLoading(false);
                setImportStatus('');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const runDataRepair = async () => {
        log("🚀 REPAIR PROTOCOL ACTIVATED...");
        toast.loading('Deep Scanning...', { id: 'repair-toast' });
        try {
            setLoading(true);
            let allDocs = [];
            let lastId = null;
            let hasMore = true;

            while (hasMore) {
                const queries = [Query.limit(100)];
                if (lastId) queries.push(Query.cursorAfter(lastId));
                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                allDocs = [...allDocs, ...response.documents];
                if (response.documents.length < 100 || allDocs.length >= 40000) hasMore = false;
                else {
                    lastId = response.documents[response.documents.length - 1].$id;
                    setImportStatus(`Scanning: ${allDocs.length}`);
                }
            }

            const refMap = new Map();
            if (Array.isArray(staticProducts)) {
                staticProducts.forEach(r => {
                    const sid = String(r?.id || r?.productID || r?.$id || '').trim();
                    if (sid) refMap.set(sid, r);
                });
            }

            let repairs = 0;
            for (let i = 0; i < allDocs.length; i++) {
                const doc = allDocs[i];
                const ref = refMap.get(String(doc.$id).trim());
                const updates = {};

                if (i % 50 === 0) setImportStatus(`Auditing Registry: ${i + 1}/${allDocs.length}`);

                if (ref) {
                    if (ref.make && !doc.carMake) updates.carMake = String(ref.make).toUpperCase();
                    if (ref.model && !doc.carModel) updates.carModel = String(ref.model).toUpperCase();
                }

                if (!doc.nameAr && doc.name) updates.nameAr = doc.name;
                if (!doc.descriptionAr && doc.description) updates.descriptionAr = doc.description;
                if (doc.isActive === undefined) updates.isActive = true;

                if (Object.keys(updates).length > 0) {
                    try {
                        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, doc.$id, updates);
                        repairs++;
                        await sleep(400);
                    } catch (e) {
                        if (e.message.includes('rate limit')) await sleep(8000);
                    }
                }
            }
            log(`✅ AUDIT COMPLETE. Recalibrated ${repairs} entries.`);
            toast.success(`Audit Complete. Fixed ${repairs} items.`, { id: 'repair-toast' });
        } catch (error) {
            log(`❌ REPAIR ERROR: ${error.message}`);
        } finally {
            setLoading(false);
            setImportStatus('');
            if (onSuccess) onSuccess();
        }
    };

    useEffect(() => {
        const globalHandler = (e) => {
            if (e.target && (e.target.id === 'master-repair-btn' || e.target.closest('#master-repair-btn'))) {
                if (!loading) runDataRepair();
            }
        };
        window.addEventListener('click', globalHandler, true);
        return () => window.removeEventListener('click', globalHandler, true);
    }, [loading]);

    return (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-100 mb-8 relative z-[100]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">Management Hub</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry v6.2 | Strict Clean-Sync Mode</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                    >
                        <Download size={14} /> Template v6.2
                    </button>

                    <div className="relative">
                        <input
                            type="file"
                            id="bulk-import-final"
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleImport}
                            disabled={loading}
                        />
                        <label
                            htmlFor="bulk-import-final"
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-xs cursor-pointer shadow-lg shadow-emerald-600/20"
                        >
                            <Upload size={14} /> Import Excel
                        </label>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all text-xs shadow-lg"
                    >
                        <RefreshCcw size={14} /> Refresh Registry
                    </button>

                    <button
                        id="master-repair-btn"
                        disabled={loading}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all text-xs shadow-lg shadow-red-600/20 ${loading ? 'opacity-50' : 'animate-pulse'}`}
                    >
                        <TrendingUp size={14} /> REPAIR MATRIX
                    </button>
                </div>
            </div>

            {importStatus && (
                <div className={`mt-4 flex items-center gap-3 bg-slate-900 text-white p-3 rounded-2xl text-[11px] font-black uppercase tracking-widest animate-pulse border-l-4 ${importStatus.includes('COOLING') ? 'border-orange-500' : 'border-emerald-500'}`}>
                    <Loader2 className={`h-4 w-4 animate-spin ${importStatus.includes('COOLING') ? 'text-orange-500' : 'text-emerald-500'}`} />
                    {importStatus}
                </div>
            )}

            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={10} className="text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registry Activity Telemetry</span>
                    </div>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {uiLogs.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">SyncProtocol v6.2 (Strict Attributes) Active...</p>
                    ) : (
                        uiLogs.map((logMsg, i) => (
                            <div key={i} className="text-[10px] text-slate-600 font-mono flex items-start gap-4 hover:bg-white rounded py-0.5 px-1 border-b border-slate-100 last:border-0">
                                <span className="text-slate-300 flex-shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                <span className={logMsg.includes('🚨') || logMsg.includes('❌') ? 'text-red-500 font-bold' : logMsg.includes('🏆') || logMsg.includes('✅') ? 'text-emerald-600 font-bold' : logMsg.includes('🚦') ? 'text-orange-500 font-bold' : ''}>{logMsg}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkOperations;
