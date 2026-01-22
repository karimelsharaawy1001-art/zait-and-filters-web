import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Edit2, Trash2, Save, X, Search, Car, Settings, Droplets, Fuel } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';

const AdminCarSpecs = () => {
    const [specs, setSpecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        make: '',
        model: '',
        year: '',
        engineType: '',
        motorOilViscosity: '',
        motorOilCapacity: '',
        transmissionFluidType: '',
        transmissionCapacity: ''
    });

    useEffect(() => {
        fetchSpecs();
    }, []);

    const fetchSpecs = async () => {
        setLoading(true);
        try {
            // This query requires a composite index in Firestore:
            // car_specs (make: ASC, model: ASC, year: DESC)
            const q = query(
                collection(db, 'car_specs'),
                orderBy('make', 'asc'),
                orderBy('model', 'asc'),
                orderBy('year', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const specsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSpecs(specsList);
        } catch (error) {
            console.error("=== FIREBASE ERROR FETCHING CAR SPECS ===");
            console.error("Code:", error.code);
            console.error("Message:", error.message);
            console.dir(error);

            if (error.message.includes('requires an index')) {
                const indexUrl = error.message.split('it here: ')[1];
                console.warn("COMPOSITE INDEX MISSING. Create it using this URL:");
                console.warn(indexUrl);
                toast.error("Database initialization required. Check console for index link.");
            } else {
                toast.error("Failed to load car specs");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            make: '',
            model: '',
            year: '',
            engineType: '',
            motorOilViscosity: '',
            motorOilCapacity: '',
            transmissionFluidType: '',
            transmissionCapacity: ''
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (spec) => {
        setFormData({
            make: spec.make || '',
            model: spec.model || '',
            year: spec.year || '',
            engineType: spec.engineType || '',
            motorOilViscosity: spec.motorOilViscosity || '',
            motorOilCapacity: spec.motorOilCapacity || '',
            transmissionFluidType: spec.transmissionFluidType || '',
            transmissionCapacity: spec.transmissionCapacity || ''
        });
        setEditingId(spec.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this specification?")) return;

        try {
            await deleteDoc(doc(db, 'car_specs', id));
            toast.success("Specification deleted successfully");
            fetchSpecs();
        } catch (error) {
            console.error("Error deleting spec:", error);
            toast.error("Failed to delete specification");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Convert capacities to numbers
        const dataToSave = {
            ...formData,
            motorOilCapacity: parseFloat(formData.motorOilCapacity) || 0,
            transmissionCapacity: parseFloat(formData.transmissionCapacity) || 0,
            updatedAt: new Date()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, 'car_specs', editingId), dataToSave);
                toast.success("Specification updated successfully");
            } else {
                await addDoc(collection(db, 'car_specs'), {
                    ...dataToSave,
                    createdAt: new Date()
                });
                toast.success("Specification added successfully");
            }
            resetForm();
            fetchSpecs();
        } catch (error) {
            console.error("Error saving spec:", error);
            toast.error("Failed to save specification");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSpecs = specs.filter(spec =>
        `${spec.make} ${spec.model} ${spec.year}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-admin-bg font-sans p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <AdminHeader title="Car Specifications" />

                {/* Actions Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 mt-10">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search make, model, or year..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-[#ffffff05] border border-admin-border rounded-2xl text-white placeholder-gray-600 focus:ring-2 focus:ring-admin-accent focus:border-transparent transition-all outline-none shadow-lg shadow-inner font-bold text-sm"
                        />
                        <Search className="absolute left-4 top-4 h-5 w-5 text-gray-600" />
                    </div>

                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-admin-red hover:bg-admin-red-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-admin-red/40 hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Specification
                    </button>
                </div>

                {/* Form Overlay */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-admin-card rounded-[2.5rem] shadow-admin w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-admin-border animate-in zoom-in-95 duration-300">
                            <div className="p-10 border-b border-[#ffffff0d] flex justify-between items-center sticky top-0 bg-admin-card/80 backdrop-blur-md z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-widest poppins">{editingId ? 'Edit Metrics' : 'New Configuration'}</h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Define vehicle fluid capacities and types</p>
                                </div>
                                <button onClick={resetForm} className="p-3 bg-[#ffffff05] hover:bg-[#ffffff0d] rounded-2xl transition-all text-gray-500 hover:text-white border border-admin-border">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-10">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Make</label>
                                        <input
                                            type="text"
                                            name="make"
                                            required
                                            value={formData.make}
                                            onChange={handleInputChange}
                                            placeholder="Toyota"
                                            className="w-full bg-[#ffffff05] border border-admin-border focus:ring-2 focus:ring-admin-accent rounded-xl px-5 py-4 text-white font-bold outline-none transition-all shadow-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Model</label>
                                        <input
                                            type="text"
                                            name="model"
                                            required
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            placeholder="Corolla"
                                            className="w-full bg-[#ffffff05] border border-admin-border focus:ring-2 focus:ring-admin-accent rounded-xl px-5 py-4 text-white font-bold outline-none transition-all shadow-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Year</label>
                                        <input
                                            type="text"
                                            name="year"
                                            required
                                            value={formData.year}
                                            onChange={handleInputChange}
                                            placeholder="2022"
                                            className="w-full bg-[#ffffff05] border border-admin-border focus:ring-2 focus:ring-admin-accent rounded-xl px-5 py-4 text-white font-bold outline-none transition-all shadow-lg"
                                        />
                                    </div>
                                </div>

                                {/* Engine & Fuel */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Engine Variant</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="engineType"
                                                required
                                                value={formData.engineType}
                                                onChange={handleInputChange}
                                                placeholder="1.8L Dual VVT-i"
                                                className="w-full bg-[#ffffff05] border border-admin-border focus:ring-2 focus:ring-admin-accent rounded-xl px-5 py-4 pl-12 text-white font-bold outline-none transition-all shadow-lg"
                                            />
                                            <Fuel className="absolute left-4 top-4 h-5 w-5 text-gray-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Motor Oil Specs */}
                                <div className="bg-admin-accent/5 rounded-3xl p-8 border border-admin-accent/10 shadow-inner">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-admin-accent/20 p-2 rounded-lg">
                                            <Droplets className="h-5 w-5 text-admin-accent" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-admin-accent uppercase tracking-widest">Motor Oil Calibration</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Viscosity</label>
                                            <input
                                                type="text"
                                                name="motorOilViscosity"
                                                required
                                                value={formData.motorOilViscosity}
                                                onChange={handleInputChange}
                                                placeholder="0W-20"
                                                className="w-full bg-[#ffffff05] border border-[#ffffff1a] focus:ring-2 focus:ring-admin-accent rounded-xl px-5 py-4 text-white font-bold outline-none transition-all shadow-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Capacity (L)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="motorOilCapacity"
                                                required
                                                value={formData.motorOilCapacity}
                                                onChange={handleInputChange}
                                                placeholder="4.2"
                                                className="w-full bg-[#ffffff05] border border-[#ffffff1a] focus:ring-2 focus:ring-admin-accent rounded-xl px-5 py-4 text-white font-bold outline-none transition-all shadow-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Transmission Specs */}
                                <div className="bg-[#1e2d4d]/20 rounded-3xl p-8 border border-[#1e2d4d]/40 shadow-inner">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-blue-600/20 p-2 rounded-lg">
                                            <Settings className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Drivetrain Metrics</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Fluid Specification</label>
                                            <input
                                                type="text"
                                                name="transmissionFluidType"
                                                required
                                                value={formData.transmissionFluidType}
                                                onChange={handleInputChange}
                                                placeholder="Toyota Genuine ATF WS"
                                                className="w-full bg-[#ffffff05] border border-[#ffffff1a] focus:ring-2 focus:ring-blue-500 rounded-xl px-5 py-4 text-white font-bold outline-none transition-all shadow-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Capacity (L)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="transmissionCapacity"
                                                required
                                                value={formData.transmissionCapacity}
                                                onChange={handleInputChange}
                                                placeholder="7.5"
                                                className="w-full bg-[#ffffff05] border border-[#ffffff1a] focus:ring-2 focus:ring-blue-500 rounded-xl px-5 py-4 text-white font-bold outline-none transition-all shadow-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 sticky bottom-0 bg-admin-card py-6 border-t border-[#ffffff0d] z-20">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-8 py-4 bg-[#ffffff05] hover:bg-[#ffffff0d] text-gray-500 hover:text-white rounded-xl transition-all font-black uppercase tracking-widest text-[10px] border border-admin-border"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-[2] px-8 py-4 bg-admin-red hover:bg-admin-red-dark text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-lg shadow-admin-red/40 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {submitting ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Save className="h-5 w-5" />
                                        )}
                                        {editingId ? 'Push Update' : 'Commit Registry'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Table Section */}
                <div className="bg-admin-card rounded-[2.5rem] shadow-admin overflow-hidden border border-admin-border animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#ffffff02]">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest poppins">Vehicle Entity</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest poppins">Lubricants</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest poppins">Drivetrain</th>
                                    <th className="px-10 py-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest poppins">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ffffff05]">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-10 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin text-admin-accent"></div>
                                                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Filtering specs cache...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSpecs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-10 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="bg-[#ffffff05] p-8 rounded-full shadow-inner border border-admin-border">
                                                    <Car className="h-14 w-14 text-gray-800" />
                                                </div>
                                                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">No matches in core registry</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSpecs.map((spec) => (
                                        <tr key={spec.id} className="hover:bg-[#ffffff02] transition-all group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-[#ffffff05] rounded-2xl flex items-center justify-center shadow-inner border border-admin-border group-hover:border-admin-accent/30 transition-all group-hover:scale-105">
                                                        <Car className="h-7 w-7 text-gray-600 group-hover:text-admin-accent transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white text-base poppins leading-none mb-2">{spec.make} {spec.model}</p>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-admin-accent bg-admin-accent/10 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-admin-accent/20">{spec.year}</span>
                                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{spec.engineType}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-1.5 bg-admin-accent/10 rounded-lg">
                                                        <Droplets className="h-4 w-4 text-admin-accent" />
                                                    </div>
                                                    <span className="font-black text-white poppins text-sm">{spec.motorOilViscosity}</span>
                                                </div>
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">{spec.motorOilCapacity} Liters Capacity</p>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-1.5 bg-blue-600/10 rounded-lg">
                                                        <Settings className="h-4 w-4 text-blue-500" />
                                                    </div>
                                                    <span className="font-black text-white poppins text-sm truncate max-w-[180px] inline-block">{spec.transmissionFluidType}</span>
                                                </div>
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">{spec.transmissionCapacity} Liters Capacity</p>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => handleEdit(spec)}
                                                        className="p-3 bg-admin-accent/5 text-gray-500 hover:text-admin-accent hover:bg-admin-accent/10 rounded-2xl transition-all border border-[#ffffff05] hover:border-admin-accent/20 shadow-lg"
                                                        title="Edit Metrics"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(spec.id)}
                                                        className="p-3 bg-admin-red/5 text-gray-500 hover:text-admin-red hover:bg-admin-red/10 rounded-2xl transition-all border border-[#ffffff05] hover:border-admin-red/20 shadow-lg"
                                                        title="Delete Entry"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCarSpecs;
