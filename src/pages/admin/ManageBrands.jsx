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
        <div className="min-h-screen bg-admin-bg font-sans p-8">
            <AdminHeader title="Manage Brands" />

            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest poppins">Brand Partners</h2>
                    <p className="text-gray-500 font-bold text-sm mt-1 uppercase tracking-widest text-[10px]">Logos displayed in the home page marquee.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-admin-red hover:bg-admin-red-dark text-white px-8 py-4 rounded-xl flex items-center gap-3 hover:scale-105 transition-all shadow-lg shadow-admin-red/40 font-black uppercase tracking-widest text-xs"
                    >
                        <Plus className="h-5 w-5" /> Add New Brand
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-admin-card p-8 rounded-[2rem] shadow-admin mb-12 border border-admin-border max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Brand Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg shadow-inner"
                                placeholder="e.g. Toyota, NGK..."
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-3 px-1">
                                <label className="block text-[10px] font-black text-admin-text-secondary uppercase tracking-widest">Logo Image</label>
                                <span className="text-[9px] text-admin-accent font-black uppercase tracking-widest">150x100px recommended</span>
                            </div>
                            <ImageUpload
                                onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                currentImage={formData.imageUrl}
                                folderPath="brands"
                            />
                            <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-admin-red hover:bg-admin-red-dark text-white py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs shadow-lg shadow-admin-red/40"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Plus className="h-4 w-4" />}
                                Add Brand
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="flex-1 py-4 bg-[#ffffff05] hover:bg-[#ffffff0d] text-admin-text-secondary hover:text-white rounded-xl transition-all border border-admin-border font-black uppercase tracking-widest text-xs"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {loading && brands.length === 0 ? (
                    <div className="col-span-full py-24 text-center">
                        <Loader2 className="h-12 w-12 text-admin-accent animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Syncing brand registry...</p>
                    </div>
                ) : brands.map((brand) => (
                    <div key={brand.id} className="group relative bg-[#ffffff02] p-8 rounded-[2rem] border border-admin-border shadow-admin hover:bg-[#ffffff05] transition-all hover:-translate-y-1 flex flex-col items-center">
                        <div className="h-20 w-32 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                            <img src={brand.imageUrl} alt={brand.name} className="max-h-full max-w-full object-contain filter drop-shadow-lg" />
                        </div>
                        <p className="text-center text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest truncate w-full transition-colors">{brand.name}</p>
                        <button
                            onClick={() => handleDelete(brand.id)}
                            className="absolute -top-3 -right-3 bg-admin-red/10 text-admin-red p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-admin-red hover:text-white border border-admin-red/20"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManageBrands;
