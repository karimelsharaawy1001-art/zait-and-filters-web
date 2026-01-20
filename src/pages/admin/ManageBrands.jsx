import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const ManageBrands = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        imageUrl: ''
    });

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'brand_logos'));
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBrands(list);
        } catch (error) {
            console.error("Error fetching brands:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'brand_logos'), formData);
            fetchBrands();
            setIsAdding(false);
            setFormData({ name: '', imageUrl: '' });
            toast.success("Brand added successfully!");
        } catch (error) {
            console.error("Error adding brand:", error);
            toast.error("Error adding brand");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this brand?")) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'brand_logos', id));
            fetchBrands();
        } catch (error) {
            console.error("Error deleting brand:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <AdminHeader title="Manage Brands" />

            <div className="mb-8 flex justify-between items-center">
                <p className="text-gray-600">Add logos of brands you work with for the home page marquee.</p>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 transition"
                    >
                        <Plus className="h-5 w-5" /> Add New Brand
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-100 max-w-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-2 focus:ring-orange-500"
                                placeholder="e.g. Toyota, NGK..."
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-sm font-medium text-gray-700">Logo Image</label>
                                <span className="text-[10px] text-orange-600 font-semibold italic">Recommended Size: 150x100px (PNG Transparent)</span>
                            </div>
                            <ImageUpload
                                onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                currentImage={formData.imageUrl}
                                folderPath="brands"
                            />
                            <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Add Brand
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {loading && brands.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        Loading brands...
                    </div>
                ) : brands.map((brand) => (
                    <div key={brand.id} className="group relative bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                        <div className="h-16 flex items-center justify-center mb-2">
                            <img src={brand.imageUrl} alt={brand.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <p className="text-center text-xs font-bold text-gray-800 truncate">{brand.name}</p>
                        <button
                            onClick={() => handleDelete(brand.id)}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManageBrands;
