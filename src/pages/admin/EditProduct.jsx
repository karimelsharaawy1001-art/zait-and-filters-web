import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { parseYearRange } from '../../utils/productUtils';
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
        make: 'Toyota',
        model: '',
        yearRange: '',
        yearStart: '',
        yearEnd: '',
        warranty_months: '',
        isActive: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch categories first
                const categoriesSnapshot = await getDocs(collection(db, 'categories'));
                const categoriesList = categoriesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCategories(categoriesList);

                // Fetch product data
                const productDoc = await getDoc(doc(db, 'products', id));
                if (productDoc.exists()) {
                    const productData = productDoc.data();

                    // Handle subcategory - could be string or object {name, imageUrl}
                    let subcategoryValue = productData.subcategory || productData.subCategory || '';
                    if (typeof subcategoryValue === 'object' && subcategoryValue !== null) {
                        subcategoryValue = subcategoryValue.name || '';
                    }

                    setFormData({
                        ...productData,
                        nameEn: productData.nameEn || '',
                        brandEn: productData.brandEn || '',
                        price: productData.price?.toString() || '',
                        salePrice: productData.salePrice?.toString() || '',
                        costPrice: productData.costPrice?.toString() || '',
                        partBrand: productData.partBrand || productData.brand || '',
                        countryOfOrigin: productData.countryOfOrigin || productData.country || '',
                        subcategory: subcategoryValue,
                        yearRange: productData.yearRange || '',
                        yearStart: productData.yearStart?.toString() || '',
                        yearEnd: productData.yearEnd?.toString() || '',
                        warranty_months: productData.warranty_months?.toString() || '',
                        isActive: productData.isActive !== undefined ? productData.isActive : true
                    });

                    // Set subcategories for the current category
                    const currentCategory = categoriesList.find(c => c.name === productData.category);
                    if (currentCategory) {
                        // Normalize subcategories - handle both string and object formats
                        const normalizedSubs = (currentCategory.subCategories || []).map(sub => {
                            if (typeof sub === 'string') {
                                return sub;
                            } else if (typeof sub === 'object' && sub !== null) {
                                return sub.name || '';
                            }
                            return '';
                        }).filter(Boolean);
                        setSubCategories(normalizedSubs);
                    }

                    // Fetch Cars & Set Initial Models
                    const carsSnapshot = await getDocs(collection(db, 'cars'));
                    const carsList = carsSnapshot.docs.map(doc => doc.data());
                    setCars(carsList);

                    const uniqueMakes = [...new Set(carsList.map(c => c.make))].sort();
                    setCarMakes(uniqueMakes);

                    if (productData.make) {
                        const models = carsList
                            .filter(car => car.make === productData.make)
                            .map(car => car.model);
                        setFilteredModels([...new Set(models)].sort());
                    }
                } else {
                    toast.error('Product not found');
                    navigate('/admin/products');
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (name === 'category') {
            const selectedCat = categories.find(c => c.name === value);
            // Normalize subcategories - handle both string and object formats
            const normalizedSubs = selectedCat ? (selectedCat.subCategories || []).map(sub => {
                if (typeof sub === 'string') {
                    return sub;
                } else if (typeof sub === 'object' && sub !== null) {
                    return sub.name || '';
                }
                return '';
            }).filter(Boolean) : [];
            setSubCategories(normalizedSubs);
            setFormData(prev => ({ ...prev, subcategory: '' }));
        }

        if (name === 'make') {
            const models = cars
                .filter(car => car.make === value)
                .map(car => car.model);
            setFilteredModels([...new Set(models)].sort());
            setFormData(prev => ({ ...prev, model: '' }));
        }

        // Auto-generate Year Display and Parse Range if entered in yearStart
        if (name === 'yearStart' || name === 'yearEnd') {
            setFormData(prev => {
                const nextData = { ...prev, [name]: value };

                // If it looks like a range (e.g. 2004-2013), parse it
                if (String(value).includes('-') || String(value).includes('/')) {
                    const { yearStart, yearEnd } = parseYearRange(value);
                    if (yearStart) nextData.yearStart = yearStart.toString();
                    if (yearEnd) nextData.yearEnd = yearEnd.toString();
                }

                if (nextData.yearStart && nextData.yearEnd) {
                    nextData.yearRange = `${nextData.yearStart} - ${nextData.yearEnd}`;
                } else if (nextData.yearStart) {
                    nextData.yearRange = nextData.yearStart;
                } else if (nextData.yearEnd) {
                    nextData.yearRange = nextData.yearEnd;
                }
                return nextData;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await updateDoc(doc(db, 'products', id), {
                ...formData,
                brand: formData.partBrand || '', // Sync legacy brand field
                nameEn: formData.nameEn || null,
                brandEn: formData.brandEn || null,
                price: Number(formData.price),
                salePrice: formData.salePrice ? Number(formData.salePrice) : null,
                costPrice: formData.costPrice ? Number(formData.costPrice) : null,
                yearStart: formData.yearStart ? Number(formData.yearStart) : null,
                yearEnd: formData.yearEnd ? Number(formData.yearEnd) : null,
                warranty_months: formData.warranty_months ? Number(formData.warranty_months) : null,
                updatedAt: new Date()
            });

            toast.success('Product updated successfully!');
            navigate('/admin/products');
        } catch (error) {
            console.error('Error updating product:', error);
            toast.error('Error updating product');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-admin-bg font-sans">
            <AdminHeader title="Edit Product" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/admin/products')}
                            className="flex items-center text-gray-400 hover:text-black font-bold transition-colors uppercase tracking-widest text-[10px]"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Management
                        </button>
                    </div>

                    <div className="bg-white shadow-admin rounded-3xl p-8 max-w-2xl mx-auto border border-admin-border">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-black uppercase tracking-widest poppins">Edit Product</h2>
                            <div className="flex items-center">
                                <label className="inline-flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-14 h-7 bg-gray-600 rounded-full peer transition-all duration-300 peer-checked:bg-[#FF0000] peer-focus:ring-4 peer-focus:ring-red-500/20 shadow-lg peer-checked:shadow-red-500/40">
                                        <div className="absolute top-0.5 start-0.5 bg-white rounded-full h-6 w-6 transition-all duration-300 peer-checked:translate-x-7 shadow-md"></div>
                                    </div>
                                    <span className={`ms-3 text-xs font-black uppercase tracking-widest transition-all duration-300 ${formData.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                                        {formData.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Product Name (Arabic)</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="اسم المنتج بالعربي"
                                        className="w-full px-4 py-3 bg-gray-50 border border-admin-border rounded-xl text-black placeholder-gray-400 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Product Name (English)</label>
                                    <input
                                        type="text"
                                        name="nameEn"
                                        value={formData.nameEn}
                                        onChange={handleChange}
                                        placeholder="Product name in English"
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Part Brand (Arabic)</label>
                                    <input
                                        type="text"
                                        name="partBrand"
                                        value={formData.partBrand}
                                        onChange={handleChange}
                                        placeholder="ماركة القطعة بالعربي"
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Part Brand (English)</label>
                                    <input
                                        type="text"
                                        name="brandEn"
                                        value={formData.brandEn}
                                        onChange={handleChange}
                                        placeholder="e.g. Castrol, Mobil"
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sell Price</label>
                                    <input
                                        type="number"
                                        name="price"
                                        required
                                        value={formData.price}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sale Price</label>
                                    <input
                                        type="number"
                                        name="salePrice"
                                        placeholder="Sale EGP"
                                        value={formData.salePrice}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Cost Price</label>
                                    <input
                                        type="number"
                                        name="costPrice"
                                        placeholder="Buy EGP"
                                        value={formData.costPrice}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Origin</label>
                                    <input
                                        type="text"
                                        name="countryOfOrigin"
                                        placeholder="e.g. Japan"
                                        value={formData.countryOfOrigin}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Warranty (Months)</label>
                                    <input
                                        type="number"
                                        name="warranty_months"
                                        placeholder="e.g. 12"
                                        value={formData.warranty_months}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Car Make</label>
                                    <select
                                        name="make"
                                        value={formData.make}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-admin-border rounded-xl text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm cursor-pointer"
                                    >
                                        <option value="" className="bg-admin-card">Select Make (Optional)</option>
                                        {carMakes.map(make => (
                                            <option key={make} value={make} className="bg-admin-card">{make}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Car Model</label>
                                    <select
                                        name="model"
                                        disabled={!formData.make}
                                        value={formData.model}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg disabled:opacity-30 cursor-pointer"
                                    >
                                        <option value="" className="bg-admin-card">Select Model (Optional)</option>
                                        {filteredModels.map(model => (
                                            <option key={model} value={model} className="bg-admin-card">{model}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Year Display</label>
                                    <input
                                        type="text"
                                        name="yearRange"
                                        disabled
                                        placeholder="Calculated automatically..."
                                        value={formData.yearRange}
                                        className="w-full px-4 py-3 bg-gray-100 border border-admin-border rounded-xl text-gray-500 placeholder-gray-400 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm opacity-50 cursor-not-allowed"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Start Year</label>
                                    <input
                                        type="number"
                                        name="yearStart"
                                        placeholder="2015"
                                        value={formData.yearStart}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">End Year</label>
                                    <input
                                        type="number"
                                        name="yearEnd"
                                        placeholder="2020"
                                        value={formData.yearEnd}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-[#ffffff05] border border-admin-border rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Category</label>
                                    <select
                                        name="category"
                                        required
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-admin-border rounded-xl text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm cursor-pointer"
                                    >
                                        <option value="" className="bg-admin-card">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name} className="bg-admin-card">{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sub-Category</label>
                                    <select
                                        name="subcategory"
                                        required
                                        value={formData.subcategory || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-admin-border rounded-xl text-black focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm cursor-pointer"
                                    >
                                        <option value="" className="bg-admin-card">Select Subcategory</option>
                                        {subCategories.map((sub, idx) => {
                                            // Ensure we're rendering a string, not an object
                                            const subValue = typeof sub === 'string' ? sub : (sub?.name || '');
                                            return (
                                                <option key={idx} value={subValue} className="bg-admin-card">
                                                    {subValue}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, image: url }))}
                                    currentImage={formData.image}
                                    folderPath="products"
                                />
                                <input type="hidden" name="image" value={formData.image} required />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/products')}
                                    className="px-6 py-3 text-[10px] font-black text-admin-text-secondary uppercase tracking-widest hover:text-black transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="admin-primary-btn !w-fit !px-12"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditProduct;
