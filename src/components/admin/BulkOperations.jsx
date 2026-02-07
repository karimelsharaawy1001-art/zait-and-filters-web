import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Download, Upload, FileSpreadsheet, Loader2, TrendingUp } from 'lucide-react';
import { parseYearRange } from '../../utils/productUtils';

const BulkOperations = ({ onSuccess, onExportFetch, staticProducts = [] }) => {
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState('');

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const headers = [
        'productID', 'name', 'activeStatus', 'isGenuine', 'category', 'subcategory', 'carMake', 'carModel',
        'yearRange', 'partBrand', 'countryOfOrigin', 'costPrice', 'sellPrice',
        'salePrice', 'warranty', 'description', 'imageUrl', 'partNumber', 'compatibility'
    ];

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
                // Recursive deep fetch for all products (Handles 20,000+ items)
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

            const products = rawData.map(data => {
                return {
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
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(products, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `products_backup_${date}.xlsx`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Export failed");
        } finally {
            setLoading(false);
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
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    toast.error("The file is empty");
                    setLoading(false);
                    return;
                }

                setImportStatus(`Processing ${jsonData.length} products...`);
                let successCount = 0;
                let errorCount = 0;

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
                            brand: String(row.partBrand || '').trim(), // Legacy sync
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

                        if (row.salePrice !== undefined && row.salePrice !== "") {
                            dataToUpdate.salePrice = Number(row.salePrice);
                        }

                        if (row.productID) {
                            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, String(row.productID).trim(), dataToUpdate);
                        } else {
                            await databases.createDocument(DATABASE_ID, PRODUCTS_COLLECTION, ID.unique(), dataToUpdate);
                        }
                        successCount++;
                    } catch (err) {
                        console.error(`Row ${i + 2} failed:`, err);
                        errorCount++;
                    }
                    setImportStatus(`Syncing: ${i + 1} / ${jsonData.length}`);
                }

                if (errorCount > 0) {
                    toast.error(`Imported ${successCount} items, but ${errorCount} failed. Check console.`);
                } else {
                    toast.success(`Successfully synced ${successCount} products!`);
                }

                if (onSuccess) onSuccess();
            } catch (error) {
                console.error("Import error:", error);
                toast.error("Import failure");
            } finally {
                setLoading(false);
                setImportStatus('');
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const runDataRepair = async () => {
        // SUPER DEBUG 1: Immediate Alert to verify button click
        alert("REPAIR COMMAND INITIATED. Check console and toasts.");

        console.log("🚀 [REPAIR] Command Received. Initializing Diagnostics...");
        console.log("📊 [REPAIR] Appwrite Config:", { DATABASE_ID, PRODUCTS_COLLECTION });
        console.log("📦 [REPAIR] Static Products Count:", staticProducts?.length || 0);

        if (!DATABASE_ID || !PRODUCTS_COLLECTION) {
            toast.error("Critical: Appwrite settings not detected in .env");
            return;
        }

        setLoading(true);
        const loadToast = toast.loading('Phase 1: Fetching Remote Catalog...', {
            style: { minWidth: '300px', fontWeight: 'bold' }
        });

        try {
            let allDocs = [];
            let lastId = null;
            let hasMore = true;

            // Step 1: Exhaustive Fetch
            while (hasMore) {
                const queries = [Query.limit(100)];
                if (lastId) queries.push(Query.after(lastId));

                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                allDocs = [...allDocs, ...response.documents];

                if (response.documents.length < 100 || allDocs.length >= 30000) {
                    hasMore = false;
                } else {
                    lastId = response.documents[response.documents.length - 1].$id;
                    setImportStatus(`Gathering: ${allDocs.length}`);
                    toast.loading(`Syncing Catalog: ${allDocs.length} items...`, { id: loadToast });
                }
            }

            console.log(`✅ [REPAIR] Fetch Complete. ${allDocs.length} items found.`);
            toast.loading(`Phase 2: Repairing Data...`, { id: loadToast });

            let repairCount = 0;
            const refMap = new Map();
            if (Array.isArray(staticProducts)) {
                staticProducts.forEach(r => {
                    const sid = String(r?.id || r?.productID || r?.$id || '').trim();
                    if (sid) refMap.set(sid, r);
                });
            }

            // Step 2: Repair Loop
            for (let i = 0; i < allDocs.length; i++) {
                const doc = allDocs[i];
                const updates = {};
                const ref = refMap.get(String(doc.$id).trim());

                if (i % 50 === 0) {
                    console.log(`🔨 [REPAIR] Scan: ${i}/${allDocs.length} | Repairs: ${repairCount}`);
                    setImportStatus(`Fixed: ${repairCount} / ${allDocs.length}`);
                    toast.loading(`Scanning Matrix: ${i + 1} / ${allDocs.length}...`, { id: loadToast });
                }

                if (ref) {
                    if (ref.yearStart && !doc.yearStart) updates.yearStart = Number(ref.yearStart);
                    if (ref.yearEnd && !doc.yearEnd) updates.yearEnd = Number(ref.yearEnd);
                    if (ref.yearRange && (!doc.yearRange || doc.yearRange === '-')) updates.yearRange = String(ref.yearRange);
                    if (ref.make && !doc.make) updates.make = String(ref.make).toUpperCase();
                    if (ref.model && !doc.model) updates.model = String(ref.model).toUpperCase();
                    if ((ref.brand || ref.partBrand) && !doc.brand) updates.brand = String(ref.brand || ref.partBrand);

                    // Legacy Schema Sync
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
                        console.error(`Repair failed for ${doc.$id}:`, err);
                    }
                }
            }

            toast.success(`Success! Fixed ${repairCount} entries.`, { id: loadToast, duration: 5000 });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("❌ [REPAIR] Failure:", error);
            alert("REPAIR FAILED: " + error.message);
            toast.error("Recovery failed. Check console.", { id: loadToast });
        } finally {
            setLoading(false);
            setImportStatus('');
        }
    };

    // Emergency Hook
    window.REPAIR_MATRIX = runDataRepair;

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 font-admin">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 mr-4">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Bulk Operations</h3>
                </div>

                <button onClick={downloadTemplate} className="admin-btn-slim bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm">
                    <Download size={14} /> Template
                </button>

                <button onClick={exportProducts} disabled={loading} className="admin-btn-slim bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download size={14} />} Export
                </button>

                <div className="relative">
                    <input type="file" id="bulk-import" className="hidden" accept=".xlsx, .xls" onChange={handleImport} disabled={loading} />
                    <label htmlFor="bulk-import" className="admin-btn-slim bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 cursor-pointer">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload size={14} />} Import Excel
                    </label>
                </div>

                <button onClick={runDataRepair} disabled={loading} id="master-repair-btn" className={`admin-btn-slim bg-orange-600 text-white hover:bg-orange-700 shadow-xl shadow-orange-600/20 px-6 py-2 ${loading ? 'opacity-50 pulse' : ''}`}>
                    <TrendingUp size={14} /> Repair & Sync Matrix
                </button>

                {importStatus && (
                    <div className="ml-auto flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 transition-all duration-300">
                        <Loader2 className="h-3 w-3 animate-spin text-orange-600" />
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{importStatus}</span>
                    </div>
                )}
            </div>
            <p className="mt-2 text-[9px] text-slate-400 uppercase tracking-[0.2em] font-black italic">
                Advanced Protocol: $O(1)$ Matrix Lookup active | Non-blocking sync enabled | Global: window.REPAIR_MATRIX()
            </p>
        </div>
    );
};

export default BulkOperations;
