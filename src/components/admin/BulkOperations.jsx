import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../../firebase';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Download, Upload, Loader2, TrendingUp, AlertCircle, RefreshCcw } from 'lucide-react';

/*
    🔥 MIGRATION: Firestore Batch Import (High Performance)
    - Replaces "Slow-Sync" with Firestore Batches (500 ops/commit).
    - Removes schema restrictions (Schemaless freedom).
    - Maintains UI feedback loop.
*/

const BulkOperations = ({ onSuccess, onExportFetch, staticProducts = [] }) => {
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [uiLogs, setUiLogs] = useState([]);

    // Firestore Collection Reference
    const PRODUCTS_COLLECTION = 'products';

    const headers = [
        'productID', 'name', 'activeStatus', 'isGenuine', 'category', 'subcategory', 'carMake', 'carModel',
        'carYear', 'partBrand', 'sellPrice', 'salePrice', 'description', 'imageUrl', 'stock', 'countryOfOrigin', 'compatibility', 'warranty_months'
    ];

    const log = (msg) => {
        console.log(`[BULK] ${msg}`);
        setUiLogs(prev => [msg, ...prev].slice(0, 15));
    };

    const downloadTemplate = () => {
        try {
            const sampleData = [{
                name: "Product Name / اسم المنتج",
                activeStatus: "TRUE",
                category: "Category",
                carMake: "Vehicle Brand",
                carModel: "Vehicle Model",
                carYear: "2015-2023",
                sellPrice: 1000,
                stock: 10,
                countryOfOrigin: "Japan",
                warranty_months: 12
            }];
            const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");
            XLSX.writeFile(wb, "firestore_products_template.xlsx");
            log("✅ Template downloaded.");
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
        setImportStatus('Initializing Firestore Batch Import...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                log(`📊 Analysis Complete: ${jsonData.length} rows found.`);

                // Chunk data for Batches (Max 500 ops per batch)
                const chunkSize = 450;
                const chunks = [];
                for (let i = 0; i < jsonData.length; i += chunkSize) {
                    chunks.push(jsonData.slice(i, i + chunkSize));
                }

                let totalProcessed = 0;
                let batchCount = 0;

                for (const chunk of chunks) {
                    batchCount++;
                    setImportStatus(`Batching: ${batchCount}/${chunks.length} | Items: ${totalProcessed}/${jsonData.length}`);

                    const batch = writeBatch(db);
                    let opsInBatch = 0;

                    for (const row of chunk) {
                        try {
                            const p = {
                                name: String(row.name || '').trim(),
                                nameAr: String(row.nameAr || row.name || '').trim(),
                                description: String(row.description || '').trim(),
                                descriptionAr: String(row.descriptionAr || row.description || '').trim(),
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
                                isActive: String(row.activeStatus).toLowerCase() !== 'false',
                                // 🎉 Firestore Freedom: We can add these back!
                                countryOfOrigin: String(row.countryOfOrigin || '').trim(),
                                warranty_months: Number(row.warranty_months || 0),
                                partNumber: String(row.partNumber || '').trim(),
                                updatedAt: serverTimestamp()
                            };

                            if (!p.name) continue;

                            const docId = (row.productID && String(row.productID).length > 5)
                                ? String(row.productID).trim()
                                : doc(db, PRODUCTS_COLLECTION).id; // Generate new ID locally

                            const docRef = doc(db, PRODUCTS_COLLECTION, docId);
                            batch.set(docRef, p, { merge: true });
                            opsInBatch++;
                        } catch (err) {
                            console.warn("Skipping row:", row, err);
                        }
                    }

                    if (opsInBatch > 0) {
                        await batch.commit();
                        totalProcessed += opsInBatch;
                        log(`🔹 Committed Batch ${batchCount} (${opsInBatch} items)`);
                    }
                }

                log(`🏆 FIREBASE MIGRATION SUCCESS: ${totalProcessed} items imported.`);
                toast.success(`Import Complete. ${totalProcessed} items synced to Firestore.`, { duration: 5000 });

                e.target.value = '';
                if (onSuccess) onSuccess();
            } catch (err) {
                log(`❌ FATAL BATCH ERROR: ${err.message}`);
            }
            finally {
                setLoading(false);
                setImportStatus('');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-100 mb-8 relative z-[100]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">Management Hub</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry v7.0 | Firestore Batch Mode 🔥</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                    >
                        <Download size={14} /> Template v7.0
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
                </div>
            </div>

            {importStatus && (
                <div className="mt-4 flex items-center gap-3 bg-slate-900 text-white p-3 rounded-2xl text-[11px] font-black uppercase tracking-widest animate-pulse border-l-4 border-indigo-500">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
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
                        <p className="text-[10px] text-slate-400 italic">Firestore Batch Engine Ready...</p>
                    ) : (
                        uiLogs.map((logMsg, i) => (
                            <div key={i} className="text-[10px] text-slate-600 font-mono flex items-start gap-4 hover:bg-white rounded py-0.5 px-1 border-b border-slate-100 last:border-0">
                                <span className="text-slate-300 flex-shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                <span className={logMsg.includes('🚨') || logMsg.includes('❌') ? 'text-red-500 font-bold' : logMsg.includes('🏆') || logMsg.includes('✅') ? 'text-emerald-600 font-bold' : ''}>{logMsg}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkOperations;
