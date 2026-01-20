import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';
import { Trash2, Tag, Edit3, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const ManageCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.imageUrl) return;

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
        <div className="min-h-screen bg-gray-100">
            <AdminHeader title="Manage Categories" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Category</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-orange-500 focus:border-orange-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                    currentImage={formData.imageUrl}
                                    folderPath="categories"
                                />
                                <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subcategories</label>
                                <input
                                    type="text"
                                    name="subCategories"
                                    value={formData.subCategories}
                                    onChange={e => setFormData({ ...formData, subCategories: e.target.value })}
                                    placeholder="Engine Oil, Gear Oil, Transmission Oil"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">Comma-separated values (e.g. 'Engine Oil, Gear Oil')</p>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
                            >
                                Add Category
                            </button>
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Existing Categories</h2>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {categories.map(cat => (
                                    <div key={cat.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="flex items-start space-x-4">
                                            <img src={cat.imageUrl} alt={cat.name} className="w-16 h-16 object-cover rounded-md bg-gray-100 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900">{cat.name}</h3>
                                                {cat.subCategories && cat.subCategories.length > 0 && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                            <Tag className="h-3 w-3" />
                                                            <span>Subcategories:</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {cat.subCategories.map((sub, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                                                                >
                                                                    {sub}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                <Link
                                                    to={`/admin/edit-category/${cat.id}`}
                                                    className="text-blue-500 hover:text-blue-700 p-2"
                                                >
                                                    <Edit3 className="h-5 w-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="text-red-500 hover:text-red-700 p-2"
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
