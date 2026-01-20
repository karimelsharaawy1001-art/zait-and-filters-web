import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Plus, X, Edit2 } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const EditCategory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        imageUrl: '',
        subCategories: []
    });
    const [newSubCategory, setNewSubCategory] = useState('');
    const [editingSubIndex, setEditingSubIndex] = useState(null);
    const [editingSubText, setEditingSubText] = useState('');

    useEffect(() => {
        const fetchCategory = async () => {
            try {
                const docRef = doc(db, 'categories', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData({
                        ...docSnap.data(),
                        subCategories: docSnap.data().subCategories || []
                    });
                } else {
                    toast.error('Category not found');
                    navigate('/admin/categories');
                }
            } catch (error) {
                console.error("Error fetching category:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategory();
    }, [id, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDoc(doc(db, 'categories', id), formData);
            toast.success('Category updated successfully!');
            navigate('/admin/categories');
        } catch (error) {
            console.error("Error updating category:", error);
            toast.error('Failed to update category');
        } finally {
            setSaving(false);
        }
    };

    const addSubCategory = () => {
        if (!newSubCategory.trim()) return;
        setFormData(prev => ({
            ...prev,
            subCategories: [...prev.subCategories, newSubCategory.trim()]
        }));
        setNewSubCategory('');
    };

    const removeSubCategory = (index) => {
        setFormData(prev => ({
            ...prev,
            subCategories: prev.subCategories.filter((_, i) => i !== index)
        }));
    };

    const startEditingSub = (index, text) => {
        setEditingSubIndex(index);
        setEditingSubText(text);
    };

    const saveSubEdit = () => {
        if (!editingSubText.trim()) return;
        const updated = [...formData.subCategories];
        updated[editingSubIndex] = editingSubText.trim();
        setFormData(prev => ({ ...prev, subCategories: updated }));
        setEditingSubIndex(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <AdminHeader title="Edit Category" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/admin/categories')}
                            className="flex items-center text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Categories
                        </button>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Category: {formData.name}</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-orange-500 focus:border-orange-500"
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

                            <div className="border-t pt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Subcategories</h3>

                                <div className="space-y-3">
                                    {formData.subCategories.map((sub, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            {editingSubIndex === index ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editingSubText}
                                                        onChange={e => setEditingSubText(e.target.value)}
                                                        className="flex-1 rounded-md border-gray-300 border p-1 text-sm"
                                                        autoFocus
                                                    />
                                                    <button type="button" onClick={saveSubEdit} className="text-green-600 font-medium text-sm">Save</button>
                                                    <button type="button" onClick={() => setEditingSubIndex(null)} className="text-gray-500 text-sm">Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="flex-1 bg-gray-50 px-3 py-1.5 rounded-md border text-sm">{sub}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditingSub(index, sub)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSubCategory(index)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add new subcategory"
                                        value={newSubCategory}
                                        onChange={e => setNewSubCategory(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSubCategory())}
                                        className="flex-1 rounded-md border-gray-300 border p-2 text-sm focus:ring-orange-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={addSubCategory}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 ${saving ? 'opacity-50' : ''}`}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditCategory;
