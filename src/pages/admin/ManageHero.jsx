import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Edit3, Save, X, MoveUp, MoveDown, Loader2, Image as ImageIcon } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const ManageHero = () => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSlide, setEditingSlide] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const [formData, setFormData] = useState({
        imageUrl: '',
        title_ar: '',
        title_en: '',
        subtitle_ar: '',
        subtitle_en: '',
        isActive: true,
        order: 0
    });

    useEffect(() => {
        fetchSlides();
    }, []);

    const fetchSlides = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'hero_slides'), orderBy('order', 'asc'));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSlides(list);
        } catch (error) {
            console.error("Error fetching slides:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'order' ? parseInt(value) : value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingSlide) {
                await updateDoc(doc(db, 'hero_slides', editingSlide.id), formData);
                toast.success("Slide updated successfully!");
            } else {
                await addDoc(collection(db, 'hero_slides'), formData);
                toast.success("Slide added successfully!");
            }
            fetchSlides();
            resetForm();
        } catch (error) {
            console.error("Error saving slide:", error);
            toast.error("Error saving slide");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this slide?")) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'hero_slides', id));
            fetchSlides();
        } catch (error) {
            console.error("Error deleting slide:", error);
        } finally {
            setLoading(false);
        }
    };

    const editSlide = (slide) => {
        setEditingSlide(slide);
        setFormData({
            imageUrl: slide.imageUrl,
            title_ar: slide.title_ar,
            title_en: slide.title_en,
            subtitle_ar: slide.subtitle_ar,
            subtitle_en: slide.subtitle_en,
            isActive: slide.isActive,
            order: slide.order
        });
        setIsAdding(true);
    };

    const resetForm = () => {
        setEditingSlide(null);
        setIsAdding(false);
        setFormData({
            imageUrl: '',
            title_ar: '',
            title_en: '',
            subtitle_ar: '',
            subtitle_en: '',
            isActive: true,
            order: slides.length
        });
    };

    return (
        <div className="p-6">
            <AdminHeader title="Manage Hero Slider" />

            <div className="mb-8 flex justify-between items-center">
                <p className="text-gray-600">Add or edit the banners displayed on the home page hero section.</p>
                {!isAdding && (
                    <button
                        onClick={() => { setIsAdding(true); setFormData(prev => ({ ...prev, order: slides.length })); }}
                        className="bg-admin-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-admin-red-dark transition"
                    >
                        <Plus className="h-5 w-5" /> Add New Slide
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">{editingSlide ? 'Edit Slide' : 'Add New Slide'}</h2>
                        <button onClick={resetForm} className="text-admin-text-secondary hover:text-gray-600"><X /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Slide Image</label>
                            <ImageUpload
                                onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                currentImage={formData.imageUrl}
                                folderPath="hero"
                            />
                            <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
                            <input
                                type="text"
                                name="title_en"
                                value={formData.title_en}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-admin-red"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title (Arabic)</label>
                            <input
                                type="text"
                                name="title_ar"
                                value={formData.title_ar}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-admin-red"
                                required
                                dir="rtl"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (English)</label>
                            <textarea
                                name="subtitle_en"
                                value={formData.subtitle_en}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-admin-red"
                                rows="2"
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (Arabic)</label>
                            <textarea
                                name="subtitle_ar"
                                value={formData.subtitle_ar}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-admin-red"
                                rows="2"
                                dir="rtl"
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                            <input
                                type="number"
                                name="order"
                                value={formData.order}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-admin-red"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                                id="isActive"
                                className="h-4 w-4 text-admin-red focus:ring-admin-red border-gray-300 rounded"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Display this slide</label>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-admin-red text-white px-8 py-2 rounded-lg hover:bg-admin-red-dark transition flex items-center gap-2 disabled:bg-admin-red/30"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                {editingSlide ? 'Update Slide' : 'Save Slide'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title (EN / AR)</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && slides.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-admin-text-secondary">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    Loading slides...
                                </td>
                            </tr>
                        ) : slides.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                    No slides found. Add your first hero banner.
                                </td>
                            </tr>
                        ) : slides.map((slide) => (
                            <tr key={slide.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <div className="h-16 w-28 rounded-md overflow-hidden bg-gray-100 border">
                                        <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{slide.title_en}</div>
                                    <div className="text-xs text-gray-500" dir="rtl">{slide.title_ar}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {slide.order}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    {slide.isActive ? (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Hidden</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => editSlide(slide)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                        title="Edit"
                                    >
                                        <Edit3 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(slide.id)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageHero;
