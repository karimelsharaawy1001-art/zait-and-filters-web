import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { Truck, Plus, Trash2, Edit2, Save, X, Loader2, RefreshCcw } from 'lucide-react';

const EGYPT_GOVERNORATES = [
    { name: "Cairo", cost: 50 },
    { name: "Giza", cost: 50 },
    { name: "Alexandria", cost: 60 },
    { name: "Qalyubia", cost: 55 },
    { name: "Sharqia", cost: 65 },
    { name: "Daqahlia", cost: 65 },
    { name: "Beheira", cost: 70 },
    { name: "Monufia", cost: 65 },
    { name: "Gharbia", cost: 65 },
    { name: "Kafr El Sheikh", cost: 70 },
    { name: "Damietta", cost: 75 },
    { name: "Port Said", cost: 75 },
    { name: "Ismailia", cost: 75 },
    { name: "Suez", cost: 75 },
    { name: "Fayoum", cost: 80 },
    { name: "Beni Suef", cost: 80 },
    { name: "Minya", cost: 90 },
    { name: "Assiut", cost: 90 },
    { name: "Sohag", cost: 100 },
    { name: "Qena", cost: 110 },
    { name: "Luxor", cost: 120 },
    { name: "Aswan", cost: 130 },
    { name: "Red Sea", cost: 150 },
    { name: "New Valley", cost: 150 },
    { name: "Matrouh", cost: 150 },
    { name: "North Sinai", cost: 150 },
    { name: "South Sinai", cost: 150 }
];

const ManageShipping = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [newRate, setNewRate] = useState({ governorate: '', cost: '' });
    const [editRate, setEditRate] = useState({ governorate: '', cost: '' });

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'shipping_rates'));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRates(data.sort((a, b) => a.governorate.localeCompare(b.governorate)));
        } catch (error) {
            console.error("Error fetching shipping rates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newRate.governorate || !newRate.cost) return;
        setActionLoading(true);
        try {
            await addDoc(collection(db, 'shipping_rates'), {
                governorate: newRate.governorate,
                cost: Number(newRate.cost)
            });
            setNewRate({ governorate: '', cost: '' });
            fetchRates();
        } catch (error) {
            console.error("Error adding rate:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this shipping rate?")) return;
        setActionLoading(true);
        try {
            await deleteDoc(doc(db, 'shipping_rates', id));
            fetchRates();
        } catch (error) {
            console.error("Error deleting rate:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const startEdit = (rate) => {
        setIsEditing(rate.id);
        setEditRate({ governorate: rate.governorate, cost: rate.cost });
    };

    const handleUpdate = async (id) => {
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'shipping_rates', id), {
                governorate: editRate.governorate,
                cost: Number(editRate.cost)
            });
            setIsEditing(null);
            fetchRates();
        } catch (error) {
            console.error("Error updating rate:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSeed = async () => {
        if (!window.confirm("This will load 27 Egypt governorates. Existing rates will remain. Continue?")) return;
        setActionLoading(true);
        try {
            const batch = writeBatch(db);
            EGYPT_GOVERNORATES.forEach(gov => {
                const docRef = doc(collection(db, 'shipping_rates'));
                batch.set(docRef, gov);
            });
            await batch.commit();
            fetchRates();
            toast.success("Default governorates loaded successfully!");
        } catch (error) {
            console.error("Error seeding data:", error);
            toast.error("Failed to seed data.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-3 rounded-2xl">
                        <Truck className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Shipping Rates</h1>
                        <p className="text-sm text-gray-500 font-bold">Manage governorate-based delivery costs</p>
                    </div>
                </div>
                <button
                    onClick={handleSeed}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-black hover:bg-blue-100 transition-all border border-blue-100"
                >
                    <RefreshCcw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
                    Load Default Egypt Govs
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Side */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-8">
                        <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Plus className="h-5 w-5 text-orange-600" />
                            Add New Rate
                        </h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Governorate</label>
                                <input
                                    type="text"
                                    value={newRate.governorate}
                                    onChange={(e) => setNewRate({ ...newRate, governorate: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="e.g. Cairo"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Cost (EGP)</label>
                                <input
                                    type="number"
                                    value={newRate.cost}
                                    onChange={(e) => setNewRate({ ...newRate, cost: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="e.g. 50"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                Add Rate
                            </button>
                        </form>
                    </div>
                </div>

                {/* Table Side */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p className="font-bold text-sm">Loading rates...</p>
                            </div>
                        ) : rates.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 font-bold text-sm">
                                No shipping rates configured.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Governorate</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cost</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rates.map((rate) => (
                                            <tr key={rate.id} className="hover:bg-gray-50/50 transition-all group">
                                                <td className="px-6 py-4">
                                                    {isEditing === rate.id ? (
                                                        <input
                                                            type="text"
                                                            value={editRate.governorate}
                                                            onChange={(e) => setEditRate({ ...editRate, governorate: e.target.value })}
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-bold text-gray-700">{rate.governorate}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isEditing === rate.id ? (
                                                        <input
                                                            type="number"
                                                            value={editRate.cost}
                                                            onChange={(e) => setEditRate({ ...editRate, cost: e.target.value })}
                                                            className="w-24 mx-auto bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-black text-orange-600">{rate.cost} <span className="text-[10px] font-bold">EGP</span></span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isEditing === rate.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdate(rate.id)}
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                >
                                                                    <Save className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setIsEditing(null)}
                                                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => startEdit(rate)}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(rate.id)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageShipping;
