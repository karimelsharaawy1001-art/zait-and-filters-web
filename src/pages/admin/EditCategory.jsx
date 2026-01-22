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
            <div className="min-h-screen bg-admin-bg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-admin-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-admin-bg font-sans">
            <AdminHeader title="Edit Category" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <button
                            onClick={() => navigate('/admin/categories')}
                            className="flex items-center text-gray-500 hover:text-white font-bold transition-colors uppercase tracking-widest text-[10px]"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Categories
                        </button>
                    </div>

                    <div className="bg-admin-card shadow-admin rounded-3xl p-8 border border-admin-border">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-admin-red hover:bg-admin-red-dark p-3 rounded-2xl shadow-lg">
                                <Edit2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-widest poppins">Edit Category</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{formData.name}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Category Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Category Image</label>
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                    currentImage={formData.imageUrl}
                                    folderPath="categories"
                                />
                                <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                            </div>

                            <div className="border-t border-[#ffffff0d] pt-8">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest poppins mb-6">Manage Subcategories</h3>

                                <div className="space-y-4">
                                    {formData.subCategories.map((sub, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            {editingSubIndex === index ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editingSubText}
                                                        onChange={e => setEditingSubText(e.target.value)}
                                                        className="flex-1 px-4 py-2 bg-[#ffffff05] border border-admin-accent/50 rounded-xl text-white outline-none font-bold text-sm shadow-lg"
                                                        autoFocus
                                                    />
                                                    <button type="button" onClick={saveSubEdit} className="text-admin-green font-black text-[10px] uppercase tracking-widest px-3 hover:scale-105 transition-all">Save</button>
                                                    <button type="button" onClick={() => setEditingSubIndex(null)} className="text-gray-500 font-black text-[10px] uppercase tracking-widest px-3 hover:scale-105 transition-all">Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="flex-1 bg-[#ffffff02] px-4 py-2.5 rounded-xl border border-admin-border text-sm text-white font-bold">{sub}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditingSub(index, sub)}
                                                        className="p-2.5 bg-[#ffffff05] hover:bg-[#ffffff0d] rounded-xl transition-all text-gray-500 hover:text-white border border-admin-border shadow-lg"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSubCategory(index)}
                                                        className="p-2.5 bg-[#ffffff05] hover:bg-admin-red/10 rounded-xl transition-all text-gray-500 hover:text-admin-red border border-admin-border shadow-lg"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Add new subcategory"
                                        value={newSubCategory}
                                        onChange={e => setNewSubCategory(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSubCategory())}
                                        className="flex-1 px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-400 outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={addSubCategory}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-[10px] font-black uppercase tracking-widest rounded-xl text-white bg-admin-red hover:bg-admin-red-dark shadow-lg shadow-admin-red/40 hover:scale-105 transition-all"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-8 border-t border-[#ffffff0d]">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center px-8 py-4 bg-admin-red hover:bg-admin-red-dark text-white font-black rounded-xl shadow-lg shadow-admin-red/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-3 text-white" /> : <Save className="h-4 w-4 mr-3" />}
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
