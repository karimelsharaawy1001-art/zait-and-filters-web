import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';
import { Trash2, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const ManageCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        make: '',
        model: '',
        yearStart: '',
        yearEnd: '',
        imageUrl: ''
    });

    const fetchCars = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'cars'));
            setCars(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching cars:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCars();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'cars'), {
                ...formData,
                yearStart: Number(formData.yearStart),
                yearEnd: Number(formData.yearEnd)
            });
            setFormData({ make: '', model: '', yearStart: '', yearEnd: '', imageUrl: '' });
            fetchCars();
        } catch (error) {
            console.error("Error adding car:", error);
            toast.error("Failed to add car");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await deleteDoc(doc(db, 'cars', id));
            setCars(cars.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting car:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <AdminHeader title="Manage Cars" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Car Model</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Make</label>
                                    <input
                                        type="text"
                                        placeholder="Toyota"
                                        value={formData.make}
                                        onChange={e => setFormData({ ...formData, make: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Model</label>
                                    <input
                                        type="text"
                                        placeholder="Corolla"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year Start (Optional)</label>
                                    <input
                                        type="number"
                                        value={formData.yearStart}
                                        onChange={e => setFormData({ ...formData, yearStart: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year End (Optional)</label>
                                    <input
                                        type="number"
                                        value={formData.yearEnd}
                                        onChange={e => setFormData({ ...formData, yearEnd: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Car Image</label>
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                    currentImage={formData.imageUrl}
                                    folderPath="cars"
                                />
                                <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
                            >
                                Add Car Model
                            </button>
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Registered Cars</h2>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {cars.map(car => (
                                    <div key={car.id} className="bg-white p-4 rounded-lg shadow-sm flex items-start space-x-4 border border-gray-200">
                                        <img src={car.imageUrl} alt={`${car.make} ${car.model}`} className="w-20 h-16 object-cover rounded-md bg-gray-100" />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900">{car.make} {car.model}</h3>
                                            <p className="text-xs text-gray-500">
                                                {car.yearStart && car.yearEnd ? `${car.yearStart} - ${car.yearEnd}` : 'All Years'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Link
                                                to={`/admin/edit-car/${car.id}`}
                                                className="text-blue-500 hover:text-blue-700 p-2"
                                            >
                                                <Edit3 className="h-5 w-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(car.id)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
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

export default ManageCars;
