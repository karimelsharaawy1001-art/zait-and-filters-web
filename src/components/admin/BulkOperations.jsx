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
        setImportStatus('Initializing Import...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                let count = 0;
                for (const row of jsonData) {
                    count++;
                    setImportStatus(`Processing: ${count}/${jsonData.length}`);

                    const p = {
                        name: String(row.name || '').trim(),
                        category: String(row.category || '').trim(),
                        subcategory: String(row.subcategory || '').trim(),
                        make: String(row.carMake || '').toUpperCase().trim(),
                        model: String(row.carModel || '').toUpperCase().trim(),
                        yearRange: String(row.yearRange || '').trim(),
                        brand: String(row.partBrand || row.brand || '').trim(),
                        countryOfOrigin: String(row.countryOfOrigin || '').trim(),
                        costPrice: Number(row.costPrice) || 0,
                        price: Number(row.sellPrice || row.price) || 0,
                        salePrice: Number(row.salePrice) || 0,
                        warranty: String(row.warranty || '').trim(),
                        description: String(row.description || '').trim(),
                        images: String(row.imageUrl || '').trim(),
                        partNumber: String(row.partNumber || '').trim(),
                        compatibility: String(row.compatibility || '').trim(),
                        isActive: String(row.activeStatus).toLowerCase() !== 'false',
                        isGenuine: String(row.isGenuine).toLowerCase() === 'true'
                    };

                    try {
                        if (row.productID) {
                            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, String(row.productID).trim(), p);
                        } else {
                            await databases.createDocument(DATABASE_ID, PRODUCTS_COLLECTION, ID.unique(), p);
                        }
                    } catch (err) {
                        console.error(`Row ${count} failed:`, err);
                    }
                }
                toast.success(`Import Complete! Processed ${count} items.`);
                if (onSuccess) onSuccess();
            } catch (err) {
                console.error(err);
                toast.error("Import failure: Check file format.");
            }
            finally {
                setLoading(false);
                setImportStatus('');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const runDataRepair = async () => {
        log("🚀 GLOBAL RECOVERY STARTED...");
        toast.loading('Syncing Catalog...', { id: 'repair-toast' });

        try {
            setLoading(true);
            let allDocs = [];
            let lastId = null;
            let hasMore = true;

            log("🛰️ Fetching Remote Documents...");
            while (hasMore) {
                const queries = [Query.limit(100)];
                if (lastId) queries.push(Query.cursorAfter(lastId));
                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                allDocs = [...allDocs, ...response.documents];
                if (response.documents.length < 100 || allDocs.length >= 35000) {
                    hasMore = false;
                } else {
                    lastId = response.documents[response.documents.length - 1].$id;
                    setImportStatus(`Scanning: ${allDocs.length}`);
                }
            }

            log(`🛰️ Mapping ${allDocs.length} items...`);
            const refMap = new Map();
            if (Array.isArray(staticProducts)) {
                staticProducts.forEach(r => {
                    const sid = String(r?.id || r?.productID || r?.$id || '').trim();
                    if (sid) refMap.set(sid, r);
                });
            }

            let repairCount = 0;
            for (let i = 0; i < allDocs.length; i++) {
                const doc = allDocs[i];
                const updates = {};
                const ref = refMap.get(String(doc.$id).trim());

                if (i % 100 === 0) setImportStatus(`Repairing: ${i + 1}/${allDocs.length}`);

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
                        if (repairCount % 50 === 0) await new Promise(r => setTimeout(r, 5));
                    } catch (e) { }
                }
            }

            log(`🏆 SUCCESS: Fixed ${repairCount} items.`);
            toast.success(`Complete! Fixed ${repairCount} items.`, { id: 'repair-toast' });
        } catch (error) {
            log(`❌ ERROR: ${error.message}`);
            toast.error(error.message, { id: 'repair-toast' });
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

    window.REPAIR_MATRIX = runDataRepair;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-red-500 mb-8 relative z-[100] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-600 rounded-xl shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase text-slate-900 leading-none">Catalog Core</h3>
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">Recovery Protocol v5.4</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={downloadTemplate} className="admin-btn-slim bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200">
                        <Download size={14} /> Template
                    </button>

                    <div className="relative">
                        <input type="file" id="bulk-import-main" className="hidden" accept=".xlsx, .xls" onChange={handleImport} disabled={loading} />
                        <label htmlFor="bulk-import-main" className="admin-btn-slim bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 cursor-pointer">
                            <Upload size={14} /> Import Excel
                        </label>
                    </div>

                    <button
                        id="master-repair-btn"
                        disabled={loading}
                        className={`admin-btn-slim bg-red-600 text-white hover:bg-red-700 border-none px-6 ${loading ? 'opacity-50' : 'animate-pulse'}`}
                    >
                        <TrendingUp size={14} /> REPAIR MATRIX
                    </button>
                </div>
            </div>

            {importStatus && (
                <div className="mt-4 flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    <span className="uppercase tracking-wider">{importStatus}</span>
                </div>
            )}

            {uiLogs.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Logs</span>
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                        {uiLogs.map((logMsg, i) => (
                            <div key={i} className="text-[10px] text-slate-600 font-mono flex items-center gap-2">
                                <span className="text-slate-300">[{new Date().toLocaleTimeString()}]</span>
                                <span>{logMsg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkOperations;
