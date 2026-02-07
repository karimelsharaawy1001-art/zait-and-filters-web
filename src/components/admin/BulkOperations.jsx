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
        if (!window.confirm('MASTER DATA REPAIR: This will analyze all 4000+ products and fix missing Car Makes, Models, and empty years by migrating them to the new system. It also fixes price formats. Proceed?')) return;

        setLoading(true);
        setImportStatus('Scanning Matrix...');

        try {
            // Appwrite doesn't have offset for large lists easily without cursor, 
            // but we'll fetch in batches of 100
            let allDocs = [];
            let lastId = null;
            let hasMore = true;

            toast('Fetching catalog metadata...', { icon: '📡' });

            while (hasMore) {
                const queries = [Query.limit(100)];
                if (lastId) queries.push(Query.after(lastId));

                const response = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, queries);
                allDocs = [...allDocs, ...response.documents];

                if (response.documents.length < 100) {
                    hasMore = false;
                } else {
                    lastId = response.documents[response.documents.length - 1].$id;
                    setImportStatus(`Loaded ${allDocs.length} items...`);
                }
            }

            setImportStatus(`Repairing ${allDocs.length} entries...`);
            let repairCount = 0;

            for (let i = 0; i < allDocs.length; i++) {
                const doc = allDocs[i];
                const updates = {};

                // Find matching product in reference data (JSON)
                const ref = staticProducts.find(r => r.id === doc.$id || r.$id === doc.$id);

                // 1. Restore missing Data from Reference (JSON Backup)
                if (ref) {
                    // Fill New Schema (Preparation)
                    if (ref.yearStart && !doc.yearStart) updates.yearStart = Number(ref.yearStart);
                    if (ref.yearEnd && !doc.yearEnd) updates.yearEnd = Number(ref.yearEnd);
                    if (ref.yearRange && !doc.yearRange) updates.yearRange = String(ref.yearRange);
                    if (ref.make && !doc.make) updates.make = String(ref.make).toUpperCase();
                    if (ref.model && !doc.model) updates.model = String(ref.model).toUpperCase();
                    if ((ref.brand || ref.partBrand) && !doc.brand) updates.brand = String(ref.brand || ref.partBrand);

                    // Fill Legacy Schema (Active in Appwrite)
                    if ((ref.make || ref.carMake) && !doc.carMake) updates.carMake = String(ref.make || ref.carMake).toUpperCase();
                    if ((ref.model || ref.carModel) && !doc.carModel) updates.carModel = String(ref.model || ref.carModel).toUpperCase();
                    if ((ref.yearRange || ref.carYear) && !doc.carYear) updates.carYear = String(ref.yearRange || ref.carYear);
                    if ((ref.brand || ref.partBrand) && !doc.partBrand) updates.partBrand = String(ref.brand || ref.partBrand);
                }

                // 2. Internal Synchronization (Cross-fill)
                if (doc.carMake && !doc.make && !updates.make) updates.make = doc.carMake;
                if (doc.carModel && !doc.model && !updates.model) updates.model = doc.carModel;
                if (doc.carYear && !doc.yearRange && !updates.yearRange) updates.yearRange = doc.carYear;
                if (doc.make && !doc.carMake && !updates.carMake) updates.carMake = doc.make;
                if (doc.model && !doc.carModel && !updates.carModel) updates.carModel = doc.model;
                if (doc.yearRange && !doc.carYear && !updates.carYear) updates.carYear = doc.yearRange;

                // 3. Ensure Active
                if (doc.isActive === undefined || doc.isActive === null) updates.isActive = true;

                // 3. Year Range Parsing (if still needed)
                const rangeToParse = updates.yearRange || doc.yearRange || doc.carYear;
                if (rangeToParse && (!doc.yearStart || !doc.yearEnd)) {
                    const { yearStart, yearEnd } = parseYearRange(rangeToParse);
                    if (yearStart && !doc.yearStart) updates.yearStart = yearStart;
                    if (yearEnd && !doc.yearEnd) updates.yearEnd = yearEnd;
                }

                // 4. Brand Normalization
                if (doc.partBrand && !doc.brand && !updates.brand) updates.brand = doc.partBrand;
                if (doc.brand && !doc.partBrand) updates.partBrand = doc.brand;

                // 5. Data Types
                if (typeof doc.price === 'string') updates.price = Number(doc.price) || 0;
                if (typeof doc.costPrice === 'string') updates.costPrice = Number(doc.costPrice) || 0;
                if (typeof doc.isActive === 'string') updates.isActive = parseBoolean(doc.isActive);

                if (Object.keys(updates).length > 0) {
                    try {
                        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, doc.$id, updates);
                        repairCount++;
                    } catch (err) {
                        console.error(`Repair failed for ${doc.$id}:`, err);
                    }
                }

                if (i % 25 === 0) {
                    setImportStatus(`Repairing: ${i + 1} / ${allDocs.length}`);
                }
            }

            toast.success(`Matrix restored! Fixed ${repairCount} inconsistencies.`, { duration: 5000 });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Repair error:", error);
            toast.error("Repair operation failed.");
        } finally {
            setLoading(false);
            setImportStatus('');
        }
    };

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

                <button onClick={runDataRepair} disabled={loading} className="admin-btn-slim bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/10">
                    <TrendingUp size={14} /> Repair & Sync Matrix
                </button>

                {importStatus && (
                    <div className="ml-auto flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                        <Loader2 className="h-3 w-3 animate-spin text-orange-600" />
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{importStatus}</span>
                    </div>
                )}
            </div>
            <p className="mt-2 text-[9px] text-slate-400 uppercase tracking-[0.2em] font-black italic">
                Protocol: XLSX/XLS Support | Schema Normalization active | Legacy Fallback enabled
            </p>
        </div>
    );
};

export default BulkOperations;
