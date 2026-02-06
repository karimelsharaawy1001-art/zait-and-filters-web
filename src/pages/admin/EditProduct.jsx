import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Package, Globe, Tag, ShieldCheck } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [cars, setCars] = useState([]);
    const [carMakes, setCarMakes] = useState([]);
    const [filteredModels, setFilteredModels] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        nameEn: '',
        price: '',
        salePrice: '',
        costPrice: '',
        image: '',
        partBrand: '',
        brandEn: '',
        countryOfOrigin: '',
        category: '',
        subcategory: '',
        make: '',
        model: '',
        yearStart: '',
        yearEnd: '',
        warranty_months: '',
        stockQuantity: 0,
        isActive: true,
        isGenuine: false,
        description: '',
        descriptionEn: ''
    });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';
    const CATEGORIES_COLLECTION = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories';
    const CARS_COLLECTION = 'cars';

    useEffect(() => {
        const fetchData = async () => {
            if (!DATABASE_ID) return;
            try {
                const [catRes, carsRes, productData] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [Query.limit(100)]),
                    databases.listDocuments(DATABASE_ID, CARS_COLLECTION, [Query.limit(100)]).catch(() => ({ documents: [] })),
                    databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, id)
                ]);

                const categoriesList = catRes.documents.map(d => ({ id: d.$id, ...d }));
                setCategories(categoriesList);
                const carsList = carsRes.documents;
                setCars(carsList);
                setCarMakes([...new Set(carsList.map(c => c.make))].sort());

                setFormData({
                    ...productData,
                    price: productData.price?.toString() || '',
                    salePrice: productData.salePrice?.toString() || '',
                    costPrice: productData.costPrice?.toString() || '',
                    yearStart: productData.yearStart?.toString() || '',
                    yearEnd: productData.yearEnd?.toString() || '',
                    warranty_months: productData.warranty_months?.toString() || '',
                    stockQuantity: productData.stockQuantity || 0,
                    partBrand: productData.partBrand || productData.brand || ''
                });

                const currentCategory = categoriesList.find(c => c.name === productData.category);
                setSubCategories(currentCategory?.subCategories || []);

                if (productData.make) {
                    const models = carsList.filter(car => car.make === productData.make).map(car => car.model);
                    setFilteredModels([...new Set(models)].sort());
                }
            } catch (error) {
                console.error(error);
                toast.error("Node not found");
                navigate('/admin/products');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, DATABASE_ID]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));

        if (name === 'category') {
            const selectedCat = categories.find(c => c.name === value);
            setSubCategories(selectedCat?.subCategories || []);
            setFormData(prev => ({ ...prev, subcategory: '' }));
        }

        if (name === 'make') {
            const models = cars.filter(car => car.make === value).map(car => car.model);
            setFilteredModels([...new Set(models)].sort());
            setFormData(prev => ({ ...prev, model: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
                costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
                yearStart: formData.yearStart ? parseInt(formData.yearStart) : null,
                yearEnd: formData.yearEnd ? parseInt(formData.yearEnd) : null,
                warranty_months: formData.warranty_months ? parseInt(formData.warranty_months) : null,
                stockQuantity: parseInt(formData.stockQuantity),
                updatedAt: new Date().toISOString()
            };
            // Remove system fields before update
            delete payload.$id;
            delete payload.$collectionId;
            delete payload.$databaseId;
            delete payload.$createdAt;
            delete payload.$permissions;

            await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, id, payload);
            toast.success('Matrix updated');
            navigate('/admin/products');
        } catch (error) {
            toast.error('Sync failure');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center uppercase font-black text-[10px] text-gray-400 font-Cairo"><Loader2 className="animate-spin mx-auto mb-4" /> Locating Node...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Node Revision" />
            <main className="max-w-5xl mx-auto py-8 px-4">
                <button onClick={() => navigate('/admin/products')} className="flex items-center text-gray-400 font-black uppercase text-[10px] mb-8 gap-2"><ArrowLeft size={14} /> Return to Matrix</button>
                <form onSubmit={handleSubmit} className="space-y-10">
                    <section className="bg-white rounded-[2.5rem] p-10 border shadow-sm space-y-8">
                        <div className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border">
                            <div><h3 className="font-black uppercase italic">Node Status</h3><p className="text-xs text-gray-400 font-bold">Synchronizing with registry</p></div>
                            <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} className={`w-14 h-7 rounded-full relative transition-all ${formData.isActive ? 'bg-green-600' : 'bg-red-600'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.isActive ? 'left-8' : 'left-1'}`} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><Globe size={12} /> Identity (AR)</label><input name="name" required value={formData.name} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-right" dir="rtl" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><Globe size={12} /> Identity (EN)</label><input name="nameEn" required value={formData.nameEn} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Unit Price</label><input type="number" name="price" required value={formData.price} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Sale Level</label><input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Inventory</label><input type="number" name="stockQuantity" required value={formData.stockQuantity} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Warranty</label><input type="number" name="warranty_months" value={formData.warranty_months} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" placeholder="Months" /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><Tag size={12} /> Sector</label>
                                <select name="category" required value={formData.category} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black">
                                    <option value="">Select Category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><Tag size={12} /> Sub-Sector</label>
                                <select name="subcategory" required value={formData.subcategory} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black">
                                    <option value="">Select Subcategory</option>{subCategories.map((s, i) => <option key={i} value={s.name || s}>{s.name || s}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-[2.5rem] p-10 border shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b pb-4"><ShieldCheck className="text-red-600" /><h3 className="font-black uppercase italic">Technical Profile</h3></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Brand Name</label><input name="partBrand" value={formData.partBrand} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Origin</label><input name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                            <div className="flex items-center gap-4 pt-8"><button type="button" onClick={() => setFormData({ ...formData, isGenuine: !formData.isGenuine })} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${formData.isGenuine ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'}`}>Genuine Parts</button></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <select name="make" value={formData.make} onChange={handleChange} className="w-full p-4 bg-gray-100 border rounded-2xl font-black uppercase text-xs"><option value="">Make</option>{carMakes.map(m => <option key={m} value={m}>{m}</option>)}</select>
                            <select name="model" value={formData.model} onChange={handleChange} className="w-full p-4 bg-gray-100 border rounded-2xl font-black uppercase text-xs"><option value="">Model</option>{filteredModels.map(m => <option key={m} value={m}>{m}</option>)}</select>
                            <input name="yearStart" value={formData.yearStart} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" placeholder="Year Start" />
                            <input name="yearEnd" value={formData.yearEnd} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" placeholder="Year End" />
                        </div>
                    </section>

                    <section className="bg-white rounded-[2.5rem] p-10 border shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b pb-4"><Package className="text-red-600" /><h3 className="font-black uppercase italic">Visual Sync</h3></div>
                        <ImageUpload currentImage={formData.image} onUploadComplete={url => setFormData({ ...formData, image: url })} />
                    </section>

                    <div className="flex justify-end pt-10 border-t"><button type="submit" disabled={saving} className="bg-red-600 text-white px-16 py-6 rounded-3xl font-black uppercase italic shadow-2xl hover:scale-105 transition-all">{saving ? 'Syncing...' : 'Update Matrix Entry'}</button></div>
                </form>
            </main>
        </div>
    );
};

export default EditProduct;
