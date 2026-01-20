import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const AddProduct = () => {
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
        yearRange: '',
        yearStart: '',
        yearEnd: '',
        viscosity: '',
        isActive: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch categories
                const categoriesSnapshot = await getDocs(collection(db, 'categories'));
                const categoriesList = categoriesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCategories(categoriesList);

                // Fetch Cars
                const carsSnapshot = await getDocs(collection(db, 'cars'));
                const carsList = carsSnapshot.docs.map(doc => doc.data());
                setCars(carsList);

                const uniqueMakes = [...new Set(carsList.map(c => c.make))].sort();
                setCarMakes(uniqueMakes);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (name === 'category') {
            const selectedCat = categories.find(c => c.name === value);
            setSubCategories(selectedCat ? selectedCat.subCategories || [] : []);
            setFormData(prev => ({ ...prev, subcategory: '' }));
        }

        if (name === 'make') {
            const models = cars
                .filter(car => car.make === value)
                .map(car => car.model);
            setFilteredModels([...new Set(models)].sort());
            setFormData(prev => ({ ...prev, model: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await addDoc(collection(db, 'products'), {
                ...formData,
                brand: formData.partBrand || '', // Sync legacy brand field
                nameEn: formData.nameEn || null,
                brandEn: formData.brandEn || null,
                price: Number(formData.price),
                salePrice: formData.salePrice ? Number(formData.salePrice) : null,
                costPrice: formData.costPrice ? Number(formData.costPrice) : null,
                yearStart: formData.yearStart ? Number(formData.yearStart) : null,
                yearEnd: formData.yearEnd ? Number(formData.yearEnd) : null,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            toast.success('Product added successfully!');
            navigate('/admin/products');
        } catch (error) {
            console.error('Error adding product:', error);
            toast.error('Error adding product');
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
        <div className="min-h-screen bg-gray-100">
            <AdminHeader title="Add New Product" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/admin/products')}
                            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Management
                        </button>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
                            <div className="flex items-center">
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                    <span className="ms-3 text-sm font-medium text-gray-700">{formData.isActive ? 'Active' : 'Inactive'}</span>
                                </label>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">Product Name (Arabic)</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="اسم المنتج بالعربي"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">Product Name (English)</label>
                                    <input
                                        type="text"
                                        name="nameEn"
                                        value={formData.nameEn}
                                        onChange={handleChange}
                                        placeholder="Product name in English (for PDF reports)"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">Part Brand (Arabic)</label>
                                    <input
                                        type="text"
                                        name="partBrand"
                                        value={formData.partBrand}
                                        onChange={handleChange}
                                        placeholder="ماركة القطعة بالعربي"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">Part Brand (English)</label>
                                    <input
                                        type="text"
                                        name="brandEn"
                                        value={formData.brandEn}
                                        onChange={handleChange}
                                        placeholder="e.g. Castrol, Mobil (for PDF reports)"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sell Price (EGP)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        required
                                        value={formData.price}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sale Price (Optional)</label>
                                    <input
                                        type="number"
                                        name="salePrice"
                                        placeholder="Leave empty if not on sale"
                                        value={formData.salePrice}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cost Price (Buy)</label>
                                    <input
                                        type="number"
                                        name="costPrice"
                                        placeholder="Optional"
                                        value={formData.costPrice}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Country of Origin (بلد الصنع)</label>
                                    <input
                                        type="text"
                                        name="countryOfOrigin"
                                        placeholder="e.g. Japan (Optional)"
                                        value={formData.countryOfOrigin}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Car Make</label>
                                    <select
                                        name="make"
                                        value={formData.make}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    >
                                        <option value="">Select Make (Optional)</option>
                                        {carMakes.map(make => (
                                            <option key={make} value={make}>{make}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Car Model</label>
                                    <select
                                        name="model"
                                        disabled={!formData.make}
                                        value={formData.model}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2 disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        <option value="">Select Model (Optional)</option>
                                        {filteredModels.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">Year Range (سنة الصنع)</label>
                                    <input
                                        type="text"
                                        name="yearRange"
                                        placeholder="e.g. 2015-2020 (Optional)"
                                        value={formData.yearRange}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 text-[10px]">Logical Start Year</label>
                                    <input
                                        type="number"
                                        name="yearStart"
                                        placeholder="e.g. 2015"
                                        value={formData.yearStart}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-1 opacity-60"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 text-[10px]">Logical End Year</label>
                                    <input
                                        type="number"
                                        name="yearEnd"
                                        placeholder="e.g. 2020"
                                        value={formData.yearEnd}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-1 opacity-60"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Category</label>
                                    <select
                                        name="category"
                                        required
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sub-Category</label>
                                    <select
                                        name="subcategory"
                                        required
                                        value={formData.subcategory}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    >
                                        <option value="">Select Subcategory</option>
                                        {subCategories.map((sub, idx) => (
                                            <option key={idx} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Viscosity (for Oils)</label>
                                    <input
                                        type="text"
                                        name="viscosity"
                                        placeholder="e.g. 5W-30"
                                        value={formData.viscosity}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                                    />
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

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/products')}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`inline - flex items - center px - 4 py - 2 border border - transparent text - sm font - medium rounded - md shadow - sm text - white bg - orange - 600 hover: bg - orange - 700 focus: outline - none focus: ring - 2 focus: ring - offset - 2 focus: ring - orange - 500 ${saving ? 'opacity-50 cursor-not-allowed' : ''} `}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Product
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

export default AddProduct;
