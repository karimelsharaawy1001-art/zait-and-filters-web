import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';
import { Trash2, Edit3, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const ManageCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
            toast.success("Car model added successfully");
        } catch (error) {
            console.error("Error adding car:", error);
            toast.error("Failed to add car");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this car model?")) return;
        try {
            await deleteDoc(doc(db, 'cars', id));
            setCars(cars.filter(c => c.id !== id));
            toast.success("Car model deleted successfully");
        } catch (error) {
            console.error("Error deleting car:", error);
            toast.error("Failed to delete car");
        }
    };

    const filteredAndSortedCars = cars
        .filter(car =>
            car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
            car.model.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            const makeCompare = a.make.localeCompare(b.make);
            if (makeCompare !== 0) return makeCompare;
            return a.model.localeCompare(b.model);
        });

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
                                className="admin-primary-btn"
                            >
                                Add Car Model
                            </button>
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2">
                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-widest poppins">Fleet Registry</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Manage makes and models</p>
                            </div>

                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Search Make or Model..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-admin-card border border-admin-border rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div className="w-12 h-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Syncing fleet data...</p>
                            </div>
                        ) : (
                            <div className="bg-admin-card rounded-[2rem] border border-admin-border overflow-hidden shadow-admin">
                                <div className="grid grid-cols-12 gap-4 p-4 border-b border-admin-border bg-[#ffffff02]">
                                    <div className="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Image</div>
                                    <div className="col-span-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Make & Model</div>
                                    <div className="col-span-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Year Range</div>
                                    <div className="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</div>
                                </div>

                                <div className="divide-y divide-admin-border">
                                    {filteredAndSortedCars.length > 0 ? filteredAndSortedCars.map(car => (
                                        <div key={car.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#ffffff05] transition-all group">
                                            <div className="col-span-2 flex justify-center">
                                                <div className="w-12 h-12 bg-[#ffffff05] rounded-xl overflow-hidden border border-admin-border shadow-sm">
                                                    <img src={car.imageUrl} alt={car.model} className="w-full h-full object-cover" />
                                                </div>
                                            </div>

                                            <div className="col-span-4 min-w-0">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest truncate">{car.make}</h3>
                                                <p className="text-admin-accent text-xs font-bold truncate">{car.model}</p>
                                            </div>

                                            <div className="col-span-4">
                                                <span className="px-3 py-1 bg-[#ffffff05] border border-admin-border rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {car.yearStart} — {car.yearEnd}
                                                </span>
                                            </div>

                                            <div className="col-span-2 flex justify-end gap-2">
                                                <Link
                                                    to={`/admin/edit-car/${car.id}`}
                                                    className="p-2 bg-admin-accent/10 text-admin-accent hover:bg-admin-accent hover:text-white rounded-lg transition-all"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(car.id)}
                                                    className="p-2 bg-admin-red/10 text-admin-red hover:bg-admin-red hover:text-white rounded-lg transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-12 text-center">
                                            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">No models found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 text-right">
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                Showing {filteredAndSortedCars.length} of {cars.length} Models
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageCars;
