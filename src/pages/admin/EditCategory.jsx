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
    const [newSubCategory, setNewSubCategory] = useState({ name: '', imageUrl: '' });
    const [editingSubIndex, setEditingSubIndex] = useState(null);
    const [editingSubData, setEditingSubData] = useState({ name: '', imageUrl: '' });

    useEffect(() => {
        const fetchCategory = async () => {
            try {
                const docRef = doc(db, 'categories', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Backward compatibility: Convert string subcategories to objects
                    const normalizedSubs = (data.subCategories || []).map(sub =>
                        typeof sub === 'string' ? { name: sub, imageUrl: '' } : sub
                    );
                    setFormData({
                        ...data,
                        subCategories: normalizedSubs
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
        if (!newSubCategory.name.trim()) return;
        setFormData(prev => ({
            ...prev,
            subCategories: [...prev.subCategories, { ...newSubCategory }]
        }));
        setNewSubCategory({ name: '', imageUrl: '' });
    };

    const removeSubCategory = (index) => {
        setFormData(prev => ({
            ...prev,
            subCategories: prev.subCategories.filter((_, i) => i !== index)
        }));
    };

    const startEditingSub = (index, sub) => {
        setEditingSubIndex(index);
        setEditingSubData(typeof sub === 'string' ? { name: sub, imageUrl: '' } : sub);
    };

    const saveSubEdit = () => {
        if (!editingSubData.name.trim()) return;
        const updated = [...formData.subCategories];
        updated[editingSubIndex] = editingSubData;
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
                            className="flex items-center text-gray-400 hover:text-black font-bold transition-colors uppercase tracking-widest text-[10px]"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Categories
                        </button>
                    </div>

                    <div className="bg-white shadow-admin rounded-3xl p-8 border border-admin-border">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-[#FF0000] p-3 rounded-2xl shadow-lg shadow-red-500/20">
                                <Edit2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black uppercase tracking-widest poppins">Edit Category</h2>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{formData.name}</p>
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
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-sm"
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

                            <div className="border-t border-gray-100 pt-8">
                                <h3 className="text-sm font-black text-black uppercase tracking-widest poppins mb-6">Manage Subcategories</h3>

                                <div className="space-y-4">
                                    {(formData.subCategories || []).map((sub, index) => (
                                        <div key={index} className="flex flex-col bg-gray-50 p-4 rounded-3xl border border-gray-100 group">
                                            {editingSubIndex === index ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-admin-accent uppercase tracking-widest">Editing Subcategory</span>
                                                        <div className="flex gap-3">
                                                            <button type="button" onClick={saveSubEdit} className="text-green-600 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Save</button>
                                                            <button type="button" onClick={() => setEditingSubIndex(null)} className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Cancel</button>
                                                        </div>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={editingSubData.name}
                                                        onChange={e => setEditingSubData({ ...editingSubData, name: e.target.value })}
                                                        placeholder="Subcategory Name"
                                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black outline-none font-bold text-sm shadow-sm"
                                                        autoFocus
                                                    />

                                                    <ImageUpload
                                                        onUploadComplete={(url) => setEditingSubData(prev => ({ ...prev, imageUrl: url }))}
                                                        currentImage={editingSubData.imageUrl}
                                                        folderPath={`subcategories/${formData.name.toLowerCase().replace(/\s+/g, '-')}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={sub.imageUrl || formData.imageUrl}
                                                        alt={sub.name}
                                                        className="w-16 h-16 rounded-2xl object-cover bg-gray-200 border border-gray-100 shadow-sm"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-lg text-black font-black truncate font-Cairo">{sub.name}</p>
                                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">{sub.imageUrl ? 'Unique Visual' : 'Parent Fallback'}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingSub(index, sub)}
                                                            className="p-3 bg-white hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-black border border-gray-200 shadow-sm"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSubCategory(index)}
                                                            className="p-3 bg-white hover:bg-red-50 rounded-xl transition-all text-gray-400 hover:text-red-600 border border-gray-200 shadow-sm"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-admin-accent/10 p-2 rounded-lg">
                                            <Plus className="h-4 w-4 text-admin-accent" />
                                        </div>
                                        <h4 className="text-xs font-black text-black uppercase tracking-widest">New Subcategory Asset</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Subcategory Name (e.g. Engine Oil)"
                                            value={newSubCategory.name}
                                            onChange={e => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                                            className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl text-black placeholder-gray-400 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-sm"
                                        />

                                        <ImageUpload
                                            onUploadComplete={(url) => setNewSubCategory(prev => ({ ...prev, imageUrl: url }))}
                                            currentImage={newSubCategory.imageUrl}
                                            folderPath={`subcategories/${formData.name.toLowerCase().replace(/\s+/g, '-')}`}
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={addSubCategory}
                                            className="admin-primary-btn !w-fit !px-10"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Append Subcategory
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-8 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="admin-primary-btn !w-fit !px-12 !py-5"
                                >
                                    {saving ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Save className="h-5 w-5" />}
                                    Commit Changes
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
