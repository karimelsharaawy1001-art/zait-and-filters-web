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
        <div className="min-h-screen bg-admin-bg font-sans p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <AdminHeader title="Manage Cars" />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
                    {/* Form Section */}
                    <div className="bg-admin-card p-8 rounded-[2rem] shadow-admin border border-admin-border h-fit sticky top-8">
                        <div className="mb-8">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest poppins">Add Model</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Register new vehicle to database</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Make</label>
                                    <input
                                        type="text"
                                        placeholder="Toyota"
                                        value={formData.make}
                                        onChange={e => setFormData({ ...formData, make: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Model</label>
                                    <input
                                        type="text"
                                        placeholder="Corolla"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Year Start</label>
                                    <input
                                        type="number"
                                        placeholder="2010"
                                        value={formData.yearStart}
                                        onChange={e => setFormData({ ...formData, yearStart: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Year End</label>
                                    <input
                                        type="number"
                                        placeholder="2024"
                                        value={formData.yearEnd}
                                        onChange={e => setFormData({ ...formData, yearEnd: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Car Profile Image</label>
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                    currentImage={formData.imageUrl}
                                    folderPath="cars"
                                />
                                <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-admin-red hover:bg-admin-red-dark text-white py-4 rounded-xl font-black text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-admin-red/40 uppercase tracking-widest"
                            >
                                Add Car Model
                            </button>
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-widest poppins">Fleet Registry</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Available makes and models in the system</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[24px] font-black text-white block leading-none">{cars.length}</span>
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Models</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div className="w-12 h-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Syncing fleet data...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {cars.map(car => (
                                    <div key={car.id} className="group relative bg-admin-card p-6 rounded-[2rem] border border-admin-border shadow-admin hover:bg-[#ffffff05] transition-all flex items-center gap-6">
                                        <div className="w-24 h-20 bg-[#ffffff05] rounded-2xl overflow-hidden shadow-inner border border-admin-border group-hover:scale-105 transition-transform shrink-0">
                                            <img src={car.imageUrl} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover filter drop-shadow-md" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-white uppercase tracking-widest text-sm poppins truncate">{car.make}</h3>
                                            <p className="text-admin-accent font-black text-xs uppercase tracking-tight truncate">{car.model}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-0.5 bg-[#ffffff05] border border-admin-border rounded text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                    {car.yearStart && car.yearEnd ? `${car.yearStart} — ${car.yearEnd}` : 'Legacy Model'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <Link
                                                to={`/admin/edit-car/${car.id}`}
                                                className="p-3 bg-admin-accent/10 text-admin-accent hover:bg-admin-accent hover:text-white rounded-2xl transition-all shadow-lg border border-admin-accent/20"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(car.id)}
                                                className="p-3 bg-admin-red/10 text-admin-red hover:bg-admin-red hover:text-white rounded-2xl transition-all shadow-lg border border-admin-red/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageCars;
