import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { Download, Upload, FileSpreadsheet, Loader2, TrendingUp } from 'lucide-react';
import { parseYearRange } from '../../utils/productUtils';

const BulkOperations = ({ onSuccess, onExportFetch }) => {
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState('');

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
            },
            {
                name: "تيل فرامل",
                activeStatus: "TRUE",
                isGenuine: "FALSE",
                category: "Brakes",
                subcategory: "Front Brakes",
                carMake: "Mitsubishi",
                carModel: "Lancer",
                yearRange: "2006-2016",
                partBrand: "Hi-Q",
                countryOfOrigin: "Korea",
                costPrice: 600,
                sellPrice: 900,
                salePrice: 850,
                warranty: "6 Months",
                description: "Premium brake pads",
                imageUrl: "https://example.com/brakes.jpg",
                partNumber: "SP1402",
                compatibility: "All trims"
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
                const querySnapshot = await getDocs(collection(db, 'products'));
                rawData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            const products = rawData.map(data => {
                return {
                    productID: data.id,
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
                    imageUrl: data.image || '',
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

                setImportStatus(`Importing ${jsonData.length} products...`);

                const batchSize = 500;
                let successCount = 0;
                let errorCount = 0;

                for (let i = 0; i < jsonData.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = jsonData.slice(i, i + batchSize);

                    chunk.forEach((row) => {
                        // Minimal row validation: skip if no name provided for new products
                        if (!row.productID && !row.name) {
                            errorCount++;
                            return;
                        }

                        let docRef;
                        let isUpdate = false;

                        if (row.productID) {
                            docRef = doc(db, 'products', String(row.productID).trim());
                            isUpdate = true;
                        } else {
                            docRef = doc(collection(db, 'products'));
                        }

                        const dataToUpdate = {};

                        // Mapping Excel columns to Firestore fields
                        if (row.name) dataToUpdate.name = String(row.name).trim();
                        if (row.category) dataToUpdate.category = String(row.category).trim();
                        if (row.subcategory) dataToUpdate.subcategory = String(row.subcategory).trim();
                        if (row.carMake) dataToUpdate.make = String(row.carMake).trim().toUpperCase();
                        if (row.carModel) dataToUpdate.model = String(row.carModel).trim().toUpperCase();
                        if (row.yearRange) {
                            dataToUpdate.yearRange = String(row.yearRange).trim();
                            const { yearStart, yearEnd } = parseYearRange(row.yearRange);
                            if (yearStart) dataToUpdate.yearStart = yearStart;
                            if (yearEnd) dataToUpdate.yearEnd = yearEnd;
                        }
                        if (row.partBrand) dataToUpdate.partBrand = String(row.partBrand).trim();
                        if (row.countryOfOrigin) dataToUpdate.countryOfOrigin = String(row.countryOfOrigin).trim();

                        // Pricing (only update if provided)
                        if (row.costPrice !== undefined && row.costPrice !== "") dataToUpdate.costPrice = Number(row.costPrice);
                        if (row.sellPrice !== undefined && row.sellPrice !== "") dataToUpdate.price = Number(row.sellPrice);
                        if (row.salePrice !== undefined && row.salePrice !== "") dataToUpdate.salePrice = Number(row.salePrice);
                        else if (row.salePrice === "") dataToUpdate.salePrice = null; // Clear sale price if blank but present

                        const parseWarranty = (val) => {
                            if (!val) return null;
                            const str = String(val).toLowerCase();
                            const num = parseInt(str.replace(/[^0-9]/g, ''));
                            if (isNaN(num)) return null;

                            if (str.includes('year') || str.includes('سنة') || str.includes('عام')) {
                                return num * 12;
                            }
                            return num;
                        };

                        if (row.warranty) {
                            const months = parseWarranty(row.warranty);
                            if (months) {
                                dataToUpdate.warranty_months = months;
                                dataToUpdate.warranty = String(row.warranty).trim(); // Keep string version for reference
                            }
                        }
                        if (row.description) dataToUpdate.description = String(row.description).trim();
                        if (row.imageUrl) dataToUpdate.image = String(row.imageUrl).trim();
                        if (row.partNumber) dataToUpdate.partNumber = String(row.partNumber).trim();
                        if (row.compatibility) dataToUpdate.compatibility = String(row.compatibility).trim();

                        if (row.activeStatus !== undefined && row.activeStatus !== "") {
                            dataToUpdate.isActive = parseBoolean(row.activeStatus);
                        }

                        if (row.isGenuine !== undefined && row.isGenuine !== "") {
                            dataToUpdate.isGenuine = parseBoolean(row.isGenuine);
                        }

                        dataToUpdate.updatedAt = new Date();

                        if (isUpdate) {
                            // Update existing product
                            batch.update(docRef, dataToUpdate);
                        } else {
                            // Create new product
                            dataToUpdate.createdAt = new Date();
                            // Fallback for required fields on new products
                            if (!dataToUpdate.category) dataToUpdate.category = 'Uncategorized';
                            if (dataToUpdate.isActive === undefined) dataToUpdate.isActive = true;
                            if (dataToUpdate.isGenuine === undefined) dataToUpdate.isGenuine = false;

                            batch.set(docRef, dataToUpdate);
                        }
                        successCount++;
                    });

                    await batch.commit();
                    setImportStatus(`Processed ${Math.min(i + batchSize, jsonData.length)} / ${jsonData.length} products...`);
                }

                setImportStatus('');
                toast.success(`Successfully imported ${successCount} products! ${errorCount > 0 ? `(${errorCount} skipped)` : ''} Refresh the page to see changes.`, {
                    duration: 5000
                });

                // Reset file input
                e.target.value = '';

                // Ask user if they want to refresh
                if (onSuccess) {
                    onSuccess();
                    // Force a reload to ensure all state is reset if needed
                    setTimeout(() => {
                        toast('Refresh the page if products still don\'t appear.', { icon: 'ℹ️' });
                    }, 1000);
                }
            } catch (error) {
                console.error("Import error details:", error);

                // Specific error message for missing documents during batch.update
                if (error.code === 'not-found' || error.message?.includes('no document to update')) {
                    toast.error("Import failed: One or more Product IDs were not found in the database.");
                } else if (error.code === 'permission-denied') {
                    toast.error("Import failed: Permission denied. Please check your admin access.");
                } else if (error.code === 'resource-exhausted') {
                    toast.error("Import failed: Firebase quota exceeded. Please try again later.");
                } else {
                    toast.error(`Import failed: ${error.message || 'Unknown error'}. Check console for details.`);
                }

                setImportStatus('');
                // Reset file input on error
                e.target.value = '';
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 mr-4">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <h3 className="font-bold text-gray-900">Bulk Operations</h3>
                </div>

                <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Download Template
                </button>

                <button
                    type="button"
                    onClick={exportProducts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export Excel
                </button>

                <button
                    type="button"
                    onClick={async () => {
                        const confirmBackup = window.confirm('Generate full local backup JSON? This is free and saves your current view for offline use.');
                        if (!confirmBackup) return;

                        setLoading(true);
                        try {
                            const q = collection(db, 'products');
                            const snapshot = await getDocs(q);
                            const backupData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `products-backup-${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            toast.success('Local backup saved!');
                        } catch (err) {
                            console.error('Backup failed:', err);
                            toast.error('Backup failed: ' + err.message);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                    <Download className="h-4 w-4" />
                    Backup JSON
                </button>

                <div className="relative">
                    <input
                        type="file"
                        id="bulk-import"
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={handleImport}
                        disabled={loading}
                    />
                    <label
                        htmlFor="bulk-import"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Import Excel
                    </label>
                </div>

                {importStatus && (
                    <span className="text-sm font-bold text-orange-600 animate-pulse">
                        {importStatus}
                    </span>
                )}

                <button
                    onClick={async () => {
                        if (window.confirm('MASTER DATA REPAIR: This will fix year ranges AND normalize all Car Makes/Models to UPPERCASE for perfect filtering. This is recommended after every bulk import. Proceed?')) {
                            setLoading(true);
                            setImportStatus('Syncing years...');
                            try {
                                const snapshot = await getDocs(collection(db, 'products'));
                                const docs = snapshot.docs;
                                const batchSize = 500;
                                let processedCount = 0;

                                for (let i = 0; i < docs.length; i += batchSize) {
                                    const batch = writeBatch(db);
                                    const chunk = docs.slice(i, i + batchSize);
                                    let chunkUpdateCount = 0;

                                    chunk.forEach(docSnap => {
                                        const data = docSnap.data();
                                        const updates = {};

                                        // 1. Fix Year Data
                                        if (data.yearRange && (!data.yearStart || !data.yearEnd)) {
                                            const { yearStart, yearEnd } = parseYearRange(data.yearRange);
                                            if (yearStart) updates.yearStart = yearStart;
                                            if (yearEnd) updates.yearEnd = yearEnd;
                                        }

                                        // 2. Normalize Casing (Strict Uppercase for Filters)
                                        if (data.make && data.make !== data.make.toUpperCase()) {
                                            updates.make = data.make.toUpperCase().trim();
                                        }
                                        if (data.model && data.model !== data.model.toUpperCase()) {
                                            updates.model = data.model.toUpperCase().trim();
                                        }

                                        if (Object.keys(updates).length > 0) {
                                            batch.update(docSnap.ref, {
                                                ...updates,
                                                updatedAt: new Date()
                                            });
                                            chunkUpdateCount++;
                                        }
                                    });

                                    if (chunkUpdateCount > 0) {
                                        await batch.commit();
                                        processedCount += chunkUpdateCount;
                                    }
                                    setImportStatus(`Syncing: ${Math.min(i + batchSize, docs.length)} / ${docs.length}`);
                                }

                                if (processedCount > 0) {
                                    toast.success(`Successfully synced ${processedCount} products`);
                                } else {
                                    toast.success('All products are already synced');
                                }
                            } catch (err) {
                                console.error("Sync error:", err);
                                if (err.code === 'resource-exhausted') {
                                    toast.error('Daily Firebase quota exceeded. Sync will resume tomorrow.');
                                } else if (err.code === 'permission-denied') {
                                    toast.error('Admin permission required for bulk sync.');
                                } else {
                                    toast.error(`Sync failed: ${err.message}`);
                                }
                            } finally {
                                setLoading(false);
                                setImportStatus('');

                                // Trigger product refresh
                                if (onSuccess) {
                                    onSuccess();
                                }
                            }
                        }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    Master Data Repair
                </button>
            </div>
            <p className="mt-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                Supported formats: .xlsx, .xls | Max 500 rows per batch | <span className="text-[#28B463]">Auto-Uppercase active</span>
            </p>
        </div>
    );
};

export default BulkOperations;
