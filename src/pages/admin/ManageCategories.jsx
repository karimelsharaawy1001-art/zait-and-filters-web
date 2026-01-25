import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';
import { Trash2, Tag, Edit3, Loader2, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
// import * as XLSX from 'xlsx'; // Moved to backend API

const ManageCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [formData, setFormData] = useState({ name: '', imageUrl: '', subCategories: '' });

    const fetchCategories = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'categories'));
            setCategories(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const exportCategories = async (format = 'xlsx') => {
        setExporting(true);
        try {
            const response = await fetch(`/api/export-categories?format=${format}`);

            if (!response.ok) {
                let errorMessage = 'Export failed';
                let errorDetails = '';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                    errorDetails = errorData.details || '';
                } catch (e) {
                    const textError = await response.text();
                    errorMessage = textError.slice(0, 100) || errorMessage;
                }
                throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `categories_export_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Categories exported as ${format.toUpperCase()} successfully`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error(`Export error: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error('Please enter a category name');
            return;
        }

        if (!formData.imageUrl) {
            toast.error('Please upload or provide an image URL for the category');
            return;
        }

        try {
            // Parse comma-separated subcategories into array
            const subCategoriesArray = formData.subCategories
                .split(',')
                .map(sub => sub.trim())
                .filter(sub => sub.length > 0);

            await addDoc(collection(db, 'categories'), {
                name: formData.name,
                imageUrl: formData.imageUrl,
                subCategories: subCategoriesArray
            });
            setFormData({ name: '', imageUrl: '', subCategories: '' });
            fetchCategories(); // Refresh list
            toast.success('Category added successfully!');
        } catch (error) {
            console.error("Error adding category:", error);
            toast.error("Failed to add category");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await deleteDoc(doc(db, 'categories', id));
            setCategories(categories.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    return (
        <div className="min-h-screen bg-admin-bg font-sans">
            <AdminHeader title="Manage Categories" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="bg-admin-card p-8 rounded-3xl shadow-admin border border-admin-border h-fit">
                        <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest poppins">Add New Category</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Category Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Category Image</label>
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                    currentImage={formData.imageUrl}
                                    folderPath="categories"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Subcategories</label>
                                <input
                                    type="text"
                                    name="subCategories"
                                    value={formData.subCategories}
                                    onChange={e => setFormData({ ...formData, subCategories: e.target.value })}
                                    placeholder="Engine Oil, Gear Oil, Transmission Oil"
                                    className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                />
                                <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Comma-separated values (e.g. 'Engine Oil, Gear Oil')</p>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-[#FF0000] hover:bg-[#CC0000] text-white font-black rounded-xl shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
                            >
                                Add Category
                            </button>
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-black uppercase tracking-widest poppins">Existing Categories</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => exportCategories('xlsx')}
                                    disabled={exporting || loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
                                >
                                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    Excel
                                </button>
                                <button
                                    onClick={() => exportCategories('csv')}
                                    disabled={exporting || loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
                                >
                                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    CSV
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-12 h-12 text-admin-accent animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {categories.map(cat => (
                                    <div key={cat.id} className="bg-white p-6 rounded-3xl shadow-admin border border-gray-100 group hover:bg-[#fcfcfc] transition-colors">
                                        <div className="flex items-start space-x-5">
                                            <img src={cat.imageUrl} alt={cat.name} className="w-20 h-20 object-cover rounded-2xl bg-gray-50 flex-shrink-0 border border-gray-100 shadow-sm" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-black text-lg poppins mb-1 leading-tight">{cat.name}</h3>
                                                {cat.subCategories && cat.subCategories.length > 0 && (
                                                    <div className="mt-3">
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">
                                                            <Tag className="h-3 w-3" />
                                                            <span>Sub-Levels:</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {cat.subCategories.map((sub, idx) => {
                                                                const name = typeof sub === 'string' ? sub : sub.name;
                                                                const hasImage = typeof sub !== 'string' && sub.imageUrl;
                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border transition-colors ${hasImage ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                                                                    >
                                                                        {hasImage && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                                                        {name}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2 flex-shrink-0 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                                <Link
                                                    to={`/admin/edit-category/${cat.id}`}
                                                    className="p-3 bg-white hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-black border border-gray-100 shadow-sm"
                                                >
                                                    <Edit3 className="h-5 w-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="p-3 bg-white hover:bg-red-50 rounded-xl transition-all text-gray-400 hover:text-red-600 border border-gray-100 shadow-sm"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ManageCategories;
