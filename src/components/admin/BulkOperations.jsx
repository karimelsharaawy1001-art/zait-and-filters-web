import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Download, Upload, Loader2, TrendingUp, AlertCircle } from 'lucide-react';

const BulkOperations = ({ onSuccess, onExportFetch, staticProducts = [] }) => {
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [uiLogs, setUiLogs] = useState([]);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const headers = [
        'productID', 'name', 'activeStatus', 'isGenuine', 'category', 'subcategory', 'carMake', 'carModel',
        'yearStart', 'yearEnd', 'partBrand', 'countryOfOrigin', 'costPrice', 'sellPrice',
        'salePrice', 'warranty', 'description', 'imageUrl', 'partNumber', 'compatibility'
    ];

    const log = (msg) => {
        console.log(`[BULK] ${msg}`);
        setUiLogs(prev => [msg, ...prev].slice(0, 10));
    };

    const downloadTemplate = () => {
        try {
            const sampleData = [{
                name: "فلتر زيت",
                activeStatus: "TRUE",
                category: "Maintenance",
                carMake: "Toyota",
                carModel: "Corolla",
                yearStart: 2015,
                yearEnd: 2023
            }];
            const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");
            XLSX.writeFile(wb, "products_template.xlsx");
            log("✅ Template downloaded successfully.");
        } catch (e) {
            log(`❌ Template error: ${e.message}`);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        log(`📂 Starting Import: ${file.name}`);
        setImportStatus('Initializing Matrix...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                log(`📊 Found ${jsonData.length} records in Excel.`);
                let success = 0;
                let fail = 0;

                for (const row of jsonData) {
                    try {
                        const count = success + fail + 1;
                        setImportStatus(`Processing: ${count}/${jsonData.length}`);

                        const p = {
                            name: String(row.name || '').trim(),
                            category: String(row.category || '').trim(),
                            subcategory: String(row.subcategory || '').trim(),
                            make: String(row.carMake || '').toUpperCase().trim(),
                            model: String(row.carModel || '').toUpperCase().trim(),
                            yearStart: row.yearStart ? parseInt(row.yearStart) : null,
                            yearEnd: row.yearEnd ? parseInt(row.yearEnd) : null,
                            yearRange: row.yearRange ? String(row.yearRange) : null,
                            partBrand: String(row.partBrand || row.brand || '').trim(),
                            countryOfOrigin: String(row.countryOfOrigin || '').trim(),
                            costPrice: Number(row.costPrice) || 0,
                            price: Number(row.sellPrice || row.price) || 0,
                            salePrice: row.salePrice ? Number(row.salePrice) : null,
                            warranty_months: row.warranty ? parseInt(row.warranty) : null,
                            description: String(row.description || '').trim(),
                            image: String(row.imageUrl || '').trim(),
                            images: String(row.imageUrl || '').trim(),
                            partNumber: String(row.partNumber || '').trim(),
                            compatibility: String(row.compatibility || '').trim(),
                            isActive: String(row.activeStatus).toLowerCase() !== 'false',
                            isGenuine: String(row.isGenuine).toLowerCase() === 'true',
                            updatedAt: new Date().toISOString()
                        };

                        if (row.productID) {
                            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, String(row.productID).trim(), p);
                        } else {
                            p.createdAt = new Date().toISOString();
                            await databases.createDocument(DATABASE_ID, PRODUCTS_COLLECTION, ID.unique(), p);
                        }
                        success++;
                    } catch (err) {
                        fail++;
                        console.error(`Row fail:`, err);
                    }
                }

                log(`🏆 Import Results: ${success} success, ${fail} failed.`);
                toast.success(`Imported ${success} products!`);
                if (onSuccess) onSuccess();
            } catch (err) {
                log(`❌ Fatal Import Error: ${err.message}`);
                toast.error("Critical Failure: Check console.");
            }
            finally {
                setLoading(false);
                setImportStatus('');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const runDataRepair = async () => {
        log("🚀 REPAIR MODE ACTIVATED...");
        toast.loading('Force Syncing...', { id: 'repair-toast' });
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
                if (response.documents.length < 100 || allDocs.length >= 35000) hasMore = false;
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

                if (i % 100 === 0) setImportStatus(`Fixing: ${i + 1}/${allDocs.length}`);

                if (ref) {
                    if (ref.yearStart && !doc.yearStart) updates.yearStart = Number(ref.yearStart);
                    if (ref.yearEnd && !doc.yearEnd) updates.yearEnd = Number(ref.yearEnd);
                    if (ref.make && !doc.make) updates.make = String(ref.make).toUpperCase();
                    if (ref.model && !doc.model) updates.model = String(ref.model).toUpperCase();
                    if ((ref.brand || ref.partBrand) && !doc.brand) updates.brand = String(ref.brand || ref.partBrand);
                    if ((ref.make || ref.carMake) && (!doc.carMake || doc.carMake === '-')) updates.carMake = String(ref.make || ref.carMake).toUpperCase();
                }

                if (doc.carMake && !doc.make) updates.make = doc.carMake.toUpperCase();
                if (doc.isActive === undefined) updates.isActive = true;

                if (Object.keys(updates).length > 0) {
                    await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, doc.$id, updates);
                    repairs++;
                }
            }
            log(`✅ Repair complete. Fixed ${repairs} resources.`);
            toast.success(`Success! Fixed ${repairs} items.`, { id: 'repair-toast' });
        } catch (error) {
            log(`❌ Repair error: ${error.message}`);
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
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">Bulk Operations</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management Node v5.5</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                    >
                        <Download size={14} /> Template
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
                        id="master-repair-btn"
                        disabled={loading}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all text-xs shadow-lg shadow-red-600/20 ${loading ? 'opacity-50' : 'animate-pulse'}`}
                    >
                        <TrendingUp size={14} /> REPAIR MATRIX
                    </button>
                </div>
            </div>

            {importStatus && (
                <div className="mt-4 flex items-center gap-3 bg-slate-900 text-white p-3 rounded-2xl text-[11px] font-black uppercase tracking-widest animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    {importStatus}
                </div>
            )}

            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={10} className="text-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">System Activity Log</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {uiLogs.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">Ready for commands...</p>
                    ) : (
                        uiLogs.map((logMsg, i) => (
                            <div key={i} className="text-[10px] text-slate-600 font-mono flex items-start gap-4 hover:bg-white/50 rounded py-0.5 px-1">
                                <span className="text-slate-300 flex-shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                <span>{logMsg}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkOperations;
