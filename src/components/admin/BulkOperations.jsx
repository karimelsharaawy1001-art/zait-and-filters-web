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
        setUiLogs(prev => [msg, ...prev].slice(0, 8));
    };

    const downloadTemplate = () => {
        const sampleData = [
            {
                name: "فلتر زيت",
                activeStatus: "TRUE",
                isGenuine: "TRUE",
                category: "Maintenance",
                subcategory: "Filters",
                carMake: "Toyota",
                carModel: "Corolla",
                yearRange: "2015-2023",
                partBrand: "Genuine",
                countryOfOrigin: "Japan",
                costPrice: 200,
                sellPrice: 350,
                salePrice: "",
                warranty: "None",
                description: "High quality oil filter",
                imageUrl: "https://example.com/filter.jpg",
                partNumber: "90915-YZZE1",
                compatibility: "1.6L Engine"
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products Template");
        XLSX.writeFile(workbook, "products_template_v2.xlsx");
    };

    const exportProducts = async () => {
        setLoading(true);
        try {
            let rawData = [];
            if (onExportFetch) {
                rawData = await onExportFetch();
            } else {
                toast('Exporting ALL products', { icon: 'ℹ️' });
                let allDocs = [];
                let lastId = null;
                let hasMore = true;

                while (hasMore) {
                    const queries = [Query.limit(100)];
                    if (lastId) queries.push(Query.after(lastId));
                    const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                    allDocs = [...allDocs, ...response.documents];
                    if (response.documents.length < 100) {
                        hasMore = false;
                    } else {
                        lastId = response.documents[response.documents.length - 1].$id;
                        setImportStatus(`Gathering export data: ${allDocs.length}...`);
                    }
                }
                rawData = allDocs.map(d => ({ id: d.$id, ...d }));
            }

            const products = rawData.map(data => ({
                productID: data.id || data.$id,
                name: data.name || '',
                activeStatus: data.isActive ? 'TRUE' : 'FALSE',
                isGenuine: data.isGenuine ? 'TRUE' : 'FALSE',
                category: data.category || '',
                subcategory: data.subcategory || data.subCategory || '',
                carMake: data.make || '',
                carModel: data.model || '',
                yearRange: data.yearRange || (data.yearStart && data.yearEnd ? `${data.yearStart}-${data.yearEnd}` : ''),
                partBrand: data.partBrand || data.brand || '',
                countryOfOrigin: data.countryOfOrigin || data.country || '',
                costPrice: data.costPrice || 0,
                sellPrice: data.price || 0,
                salePrice: data.salePrice || '',
                warranty: data.warranty || (data.warranty_months ? `${data.warranty_months} Months` : ''),
                description: data.description || '',
                imageUrl: data.image || data.images || '',
                partNumber: data.partNumber || '',
                compatibility: data.compatibility || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(products, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
            XLSX.writeFile(workbook, `products_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Export failed");
        } finally {
            setLoading(false);
            setImportStatus('');
        }
    };

    const parseBoolean = (val) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
            return val.toUpperCase() === 'TRUE' || val === '1' || val.toLowerCase() === 'yes';
        }
        return !!val;
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        setImportStatus('Reading file...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (jsonData.length === 0) {
                    toast.error("The file is empty");
                    setLoading(false);
                    return;
                }
                setImportStatus(`Syncing ${jsonData.length} products...`);
                let successCount = 0;
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    try {
                        const dataToUpdate = {
                            name: String(row.name || '').trim(),
                            category: String(row.category || 'Uncategorized').trim(),
                            subcategory: String(row.subcategory || '').trim(),
                            make: String(row.carMake || '').toUpperCase().trim(),
                            model: String(row.carModel || '').toUpperCase().trim(),
                            partBrand: String(row.partBrand || '').trim(),
                            brand: String(row.partBrand || '').trim(),
                            countryOfOrigin: String(row.countryOfOrigin || '').trim(),
                            costPrice: Number(row.costPrice) || 0,
                            price: Number(row.sellPrice) || 0,
                            description: String(row.description || '').trim(),
                            image: String(row.imageUrl || '').trim(),
                            partNumber: String(row.partNumber || '').trim(),
                            compatibility: String(row.compatibility || '').trim(),
                            isActive: parseBoolean(row.activeStatus),
                            isGenuine: parseBoolean(row.isGenuine)
                        };
                        if (row.yearRange) {
                            dataToUpdate.yearRange = String(row.yearRange).trim();
                            const { yearStart, yearEnd } = parseYearRange(row.yearRange);
                            if (yearStart) dataToUpdate.yearStart = yearStart;
                            if (yearEnd) dataToUpdate.yearEnd = yearEnd;
                        }
                        if (row.productID) {
                            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, String(row.productID).trim(), dataToUpdate);
                        } else {
                            await databases.createDocument(DATABASE_ID, PRODUCTS_COLLECTION, ID.unique(), dataToUpdate);
                        }
                        successCount++;
                    } catch (err) { console.error(err); }
                    if (i % 10 === 0) setImportStatus(`Progress: ${i + 1}/${jsonData.length}`);
                }
                toast.success(`Synced ${successCount} items!`);
                if (onSuccess) onSuccess();
            } catch (error) { toast.error("Import failure"); }
            finally { setLoading(false); setImportStatus(''); }
        };
        reader.readAsArrayBuffer(file);
    };

    const runDataRepair = async () => {
        log("🚀 STARTING GLOBAL RECOVERY...");
        toast.loading('Initializing Catalog Scan...', { id: 'repair-toast' });

        try {
            setLoading(true);
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
                    setImportStatus(`Syncing: ${allDocs.length}`);
                    toast.loading(`Gathering Catalog: ${allDocs.length} items...`, { id: 'repair-toast' });
                }
            }

            log(`🛰️ Fetched ${allDocs.length} records.`);
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

                if (i % 50 === 0) {
                    setImportStatus(`Fixing: ${i + 1}/${allDocs.length}`);
                    toast.loading(`Repairing: ${i + 1}/${allDocs.length}...`, { id: 'repair-toast' });
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

                if (doc.carMake && !doc.make) updates.make = doc.carMake.toUpperCase();
                if (doc.carModel && !doc.model) updates.model = doc.carModel.toUpperCase();
                if (doc.isActive === undefined || doc.isActive === null) updates.isActive = true;

                if (Object.keys(updates).length > 0) {
                    try {
                        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, doc.$id, updates);
                        repairCount++;
                        if (repairCount % 20 === 0) await new Promise(r => setTimeout(r, 10));
                    } catch (e) { console.error(e); }
                }
            }

            log(`🏆 SUCCESS: ${repairCount} fixes.`);
            toast.success(`Repair Complete! Fixed ${repairCount} items.`, { id: 'repair-toast', duration: 8000 });
        } catch (error) {
            log(`❌ FATAL: ${error.message}`);
            toast.error(`Error: ${error.message}`, { id: 'repair-toast' });
        } finally {
            setLoading(false);
            setImportStatus('');
        }
    };

    useEffect(() => {
        const btn = btnRef.current;
        if (btn) {
            const clickHandler = () => {
                if (!loading) {
                    log("🎯 CLICK DETECTED (DOM LEVEL)");
                    runDataRepair();
                }
            };
            btn.addEventListener('click', clickHandler);
            return () => btn.removeEventListener('click', clickHandler);
        }
    }, [loading]);

    window.REPAIR_MATRIX = runDataRepair;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-orange-500 mb-10 relative z-50 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full -mr-16 -mt-16 opacity-50" />

            <div className="flex flex-wrap items-center gap-6 relative z-10">
                <div className="flex items-center gap-4 mr-4">
                    <div className="p-4 bg-orange-600 rounded-2xl shadow-xl shadow-orange-600/20">
                        <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Catalog Recovery Center</h3>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-2">Protocol v5.2 | Full Recovery Mode</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button onClick={downloadTemplate} className="admin-btn-slim bg-slate-100 text-slate-700 hover:bg-slate-200 border-none px-5 py-2.5">
                        <Download size={14} /> Template
                    </button>

                    <button onClick={exportProducts} disabled={loading} className="admin-btn-slim bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-5 py-2.5">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={14} />} Export All
                    </button>

                    <div className="relative">
                        <input type="file" id="bulk-import-restore" className="hidden" accept=".xlsx, .xls" onChange={handleImport} disabled={loading} />
                        <label htmlFor="bulk-import-restore" className="admin-btn-slim bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 cursor-pointer px-5 py-2.5">
                            <Upload size={14} /> Import Excel
                        </label>
                    </div>

                    <button
                        ref={btnRef}
                        disabled={loading}
                        className={`px-12 py-5 bg-red-600 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 shadow-2xl transition-all duration-300 transform active:scale-95 flex items-center gap-4 cursor-pointer relative z-[100] ${loading ? 'opacity-50' : 'animate-pulse'}`}
                    >
                        <TrendingUp size={24} /> 🚀 START MASTER REPAIR
                    </button>
                </div>

                {importStatus && (
                    <div className="ml-auto flex items-center gap-4 bg-red-50 px-6 py-4 rounded-3xl border-2 border-red-200 shadow-2xl">
                        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                        <span className="text-sm font-black text-red-600 uppercase tracking-tighter">{importStatus}</span>
                    </div>
                )}
            </div>

            {uiLogs.length > 0 && (
                <div className="mt-8 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live Telemetry</span>
                    </div>
                    {uiLogs.map((logMsg, i) => (
                        <div key={i} className="text-[11px] text-slate-300 py-1.5 border-b border-white/5 last:border-0 font-mono">
                            <span className="text-slate-500 mr-3">[{new Date().toLocaleTimeString()}]</span> {logMsg}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400">
                <div className="flex gap-4">
                    <span className="uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded">Remote: {DATABASE_ID ? 'CONNECTED' : 'OFFLINE'}</span>
                    <span className="uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded">Matrix: {staticProducts?.length || 0} ITEMS</span>
                </div>
                <span className="text-orange-500 font-black">CONSOLE: window.REPAIR_MATRIX()</span>
            </div>
        </div>
    );
};

export default BulkOperations;
