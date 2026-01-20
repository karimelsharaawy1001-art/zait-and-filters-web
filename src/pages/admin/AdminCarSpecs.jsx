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
            const q = query(collection(db, 'car_specs'), orderBy('make'), orderBy('model'), orderBy('year', 'desc'));
            const querySnapshot = await getDocs(q);
            const specsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSpecs(specsList);
        } catch (error) {
            console.error("Error fetching car specs:", error);
            toast.error("Failed to load car specs");
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
        <div className="min-h-screen bg-gray-50">
            <AdminHeader title="Car Specifications" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Actions Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search make, model, or year..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none shadow-sm"
                        />
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    </div>

                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-100 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Specification
                    </button>
                </div>

                {/* Form Overlay */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">{editingId ? 'Edit Specification' : 'New Specification'}</h2>
                                    <p className="text-gray-500 font-medium">Define vehicle fluid capacities and types</p>
                                </div>
                                <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="h-6 w-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Make</label>
                                        <input
                                            type="text"
                                            name="make"
                                            required
                                            value={formData.make}
                                            onChange={handleInputChange}
                                            placeholder="Toyota"
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 font-bold outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Model</label>
                                        <input
                                            type="text"
                                            name="model"
                                            required
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            placeholder="Corolla"
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 font-bold outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Year</label>
                                        <input
                                            type="text"
                                            name="year"
                                            required
                                            value={formData.year}
                                            onChange={handleInputChange}
                                            placeholder="2022"
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 font-bold outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Engine & Fuel */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Engine Type/Size</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="engineType"
                                                required
                                                value={formData.engineType}
                                                onChange={handleInputChange}
                                                placeholder="1.8L Dual VVT-i"
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 pl-12 font-bold outline-none transition-all"
                                            />
                                            <Fuel className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Motor Oil Specs */}
                                <div className="bg-orange-50/50 rounded-3xl p-6 border border-orange-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Droplets className="h-5 w-5 text-orange-600" />
                                        <h3 className="text-sm font-black text-orange-900 uppercase tracking-widest">Motor Oil Specifications</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Default Viscosity</label>
                                            <input
                                                type="text"
                                                name="motorOilViscosity"
                                                required
                                                value={formData.motorOilViscosity}
                                                onChange={handleInputChange}
                                                placeholder="0W-20"
                                                className="w-full bg-white border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 font-bold outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Capacity (Liters)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="motorOilCapacity"
                                                required
                                                value={formData.motorOilCapacity}
                                                onChange={handleInputChange}
                                                placeholder="4.2"
                                                className="w-full bg-white border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 font-bold outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Transmission Specs */}
                                <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Settings className="h-5 w-5 text-blue-600" />
                                        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Transmission Specifications</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fluid Type</label>
                                            <input
                                                type="text"
                                                name="transmissionFluidType"
                                                required
                                                value={formData.transmissionFluidType}
                                                onChange={handleInputChange}
                                                placeholder="Toyota Genuine ATF WS"
                                                className="w-full bg-white border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 font-bold outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Capacity (Liters)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="transmissionCapacity"
                                                required
                                                value={formData.transmissionCapacity}
                                                onChange={handleInputChange}
                                                placeholder="7.5"
                                                className="w-full bg-white border-2 border-transparent focus:border-orange-600 rounded-2xl px-5 py-3.5 font-bold outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white py-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-3 px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Save className="h-5 w-5" />
                                        )}
                                        {editingId ? 'Update Specification' : 'Save Specification'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Table Section */}
                <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Motor Oil</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transmission</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-10 w-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
                                                <p className="text-gray-400 font-bold">Loading specifications...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSpecs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-6 rounded-full">
                                                    <Car className="h-12 w-12 text-gray-300" />
                                                </div>
                                                <p className="text-gray-400 font-bold">No specifications found matching your criteria</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSpecs.map((spec) => (
                                        <tr key={spec.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-orange-200 transition-colors">
                                                        <Car className="h-6 w-6 text-gray-400 group-hover:text-orange-600 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 leading-none mb-1">{spec.make} {spec.model}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider">{spec.year}</span>
                                                            <span className="text-[10px] font-bold text-gray-400">{spec.engineType}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Droplets className="h-4 w-4 text-orange-500" />
                                                    <span className="font-black text-gray-900">{spec.motorOilViscosity}</span>
                                                </div>
                                                <p className="text-xs font-bold text-gray-500">{spec.motorOilCapacity} Liters</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Settings className="h-4 w-4 text-blue-500" />
                                                    <span className="font-black text-gray-900 text-xs truncate max-w-[150px] inline-block">{spec.transmissionFluidType}</span>
                                                </div>
                                                <p className="text-xs font-bold text-gray-500">{spec.transmissionCapacity} Liters</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => handleEdit(spec)}
                                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(spec.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
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
            </main>
        </div>
    );
};

export default AdminCarSpecs;
