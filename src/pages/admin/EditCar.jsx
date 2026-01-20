import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const EditCar = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        make: '',
        model: '',
        yearStart: '',
        yearEnd: '',
        imageUrl: ''
    });

    useEffect(() => {
        const fetchCar = async () => {
            try {
                const docRef = doc(db, 'cars', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData(docSnap.data());
                } else {
                    toast.error('Car not found');
                    navigate('/admin/cars');
                }
            } catch (error) {
                console.error("Error fetching car:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCar();
    }, [id, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDoc(doc(db, 'cars', id), {
                ...formData,
                yearStart: formData.yearStart ? Number(formData.yearStart) : null,
                yearEnd: formData.yearEnd ? Number(formData.yearEnd) : null,
                updatedAt: new Date()
            });
            toast.success('Car updated successfully!');
            navigate('/admin/cars');
        } catch (error) {
            console.error("Error updating car:", error);
            toast.error('Failed to update car');
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
            <AdminHeader title="Edit Car Model" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/admin/cars')}
                            className="flex items-center text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Cars
                        </button>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Car: {formData.make} {formData.model}</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Make</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.make}
                                        onChange={e => setFormData({ ...formData, make: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Model</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year Start</label>
                                    <input
                                        type="number"
                                        value={formData.yearStart}
                                        onChange={e => setFormData({ ...formData, yearStart: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year End</label>
                                    <input
                                        type="number"
                                        value={formData.yearEnd}
                                        onChange={e => setFormData({ ...formData, yearEnd: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-orange-500 focus:border-orange-500"
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

                            <div className="flex justify-end pt-6">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 ${saving ? 'opacity-50' : ''}`}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditCar;
