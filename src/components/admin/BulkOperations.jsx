import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { Download, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';

const BulkOperations = () => {
    const [loading, setLoading] = useState(false);
    const [importStatus, setImportStatus] = useState('');

    const headers = [
        'name', 'category', 'subcategory', 'carMake', 'carModel',
        'yearRange', 'partBrand', 'countryOfOrigin', 'price',
        'salePrice', 'description', 'imageUrl'
    ];

    const downloadTemplate = () => {
        const sampleData = [
            {
                name: "فلتر زيت",
                category: "Maintenance",
                subcategory: "Filters",
                carMake: "Toyota",
                carModel: "Corolla",
                yearRange: "2015-2023",
                partBrand: "Genuine",
                countryOfOrigin: "Japan",
                price: 350,
                salePrice: "",
                description: "High quality oil filter",
                imageUrl: "https://example.com/filter.jpg"
            },
            {
                name: "تيل فرامل",
                category: "Brakes",
                subcategory: "Front Brakes",
                carMake: "Mitsubishi",
                carModel: "Lancer",
                yearRange: "2006-2016",
                partBrand: "Hi-Q",
                countryOfOrigin: "Korea",
                price: 900,
                salePrice: 850,
                description: "Premium brake pads",
                imageUrl: "https://example.com/brakes.jpg"
            },
            {
                name: "منظف دورة وقود",
                category: "Additives",
                subcategory: "Fuel System",
                carMake: "Generic",
                carModel: "All Models",
                yearRange: "All Years",
                partBrand: "Liqui Moly",
                countryOfOrigin: "Germany",
                price: 150,
                salePrice: "",
                description: "Fuel system cleaner",
                imageUrl: "https://example.com/cleaner.jpg"
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products Template");
        XLSX.writeFile(workbook, "products_template.xlsx");
    };

    const exportProducts = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'products'));
            const products = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    name: data.name || '',
                    category: data.category || '',
                    subcategory: data.subcategory || data.subCategory || '',
                    carMake: data.make || '',
                    carModel: data.model || '',
                    yearRange: data.yearRange || (data.yearStart && data.yearEnd ? `${data.yearStart}-${data.yearEnd}` : ''),
                    partBrand: data.partBrand || data.brand || '',
                    countryOfOrigin: data.countryOfOrigin || data.country || '',
                    price: data.price || 0,
                    salePrice: data.salePrice || '',
                    description: data.description || '',
                    imageUrl: data.image || ''
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
                for (let i = 0; i < jsonData.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = jsonData.slice(i, i + batchSize);

                    chunk.forEach((row) => {
                        if (!row.name || !row.price) return; // Basic validation

                        const docRef = doc(collection(db, 'products'));
                        batch.set(docRef, {
                            name: row.name,
                            category: row.category || 'Uncategorized',
                            subcategory: row.subcategory || '',
                            make: row.carMake || '',
                            model: row.carModel || '',
                            yearRange: row.yearRange || '',
                            partBrand: row.partBrand || '',
                            countryOfOrigin: row.countryOfOrigin || '',
                            price: Number(row.price),
                            salePrice: row.salePrice ? Number(row.salePrice) : null,
                            description: row.description || '',
                            image: row.imageUrl || '',
                            isActive: true,
                            createdAt: new Date()
                        });
                    });

                    await batch.commit();
                }

                toast.success(`Successfully imported ${jsonData.length} products`);
                setImportStatus('');
                // Refreshing the page to see changes (or trigger a local state update if passed as prop)
                window.location.reload();
            } catch (error) {
                console.error("Import error:", error);
                toast.error("Import failed. Check file format.");
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
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Download Template
                </button>

                <button
                    onClick={exportProducts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export Current
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
            </div>
            <p className="mt-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                Supported formats: .xlsx, .xls | Max 500 rows per batch
            </p>
        </div>
    );
};

export default BulkOperations;
