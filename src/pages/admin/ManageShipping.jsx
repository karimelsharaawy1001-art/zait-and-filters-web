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
        <div className="min-h-screen bg-gray-50 font-sans pb-20 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 max-w-7xl mx-auto mt-10">
                <div className="flex items-center gap-4">
                    <div className="bg-[#28B463]/10 p-4 rounded-2xl">
                        <Truck className="h-6 w-6 text-admin-accent" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-black uppercase tracking-widest poppins">Shipping Rates</h1>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Manage governorate-based delivery costs</p>
                    </div>
                </div>
                <button
                    onClick={handleSeed}
                    disabled={actionLoading}
                    className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all border border-gray-100 shadow-sm group active:scale-95 disabled:opacity-50"
                >
                    <RefreshCcw className={`h-4 w-4 text-[#28B463] group-hover:rotate-180 transition-transform duration-500 ${actionLoading ? 'animate-spin' : ''}`} />
                    Provision Default Egypt Matrix
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
                {/* Form Side */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 sticky top-8 group overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Plus className="h-24 w-24 text-black" />
                        </div>

                        <h2 className="text-xl font-black text-black mb-8 flex items-center gap-3 relative poppins">
                            <div className="p-2 bg-[#28B463]/10 rounded-xl">
                                <Plus className="h-5 w-5 text-admin-accent" />
                            </div>
                            Manual Entry
                        </h2>
                        <form onSubmit={handleAdd} className="space-y-8 relative">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Governorate Entity</label>
                                <input
                                    type="text"
                                    value={newRate.governorate}
                                    onChange={(e) => setNewRate({ ...newRate, governorate: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all placeholder-gray-300"
                                    placeholder="e.g. Cairo"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operational Cost (EGP)</label>
                                <input
                                    type="number"
                                    value={newRate.cost}
                                    onChange={(e) => setNewRate({ ...newRate, cost: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all placeholder-gray-300"
                                    placeholder="e.g. 50"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="admin-primary-btn"
                            >
                                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                Commit Rate Entity
                            </button>
                        </form>
                    </div>
                </div>

                {/* Table Side */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <div className="h-10 w-10 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tracing Logistics Node...</p>
                            </div>
                        ) : rates.length === 0 ? (
                            <div className="p-20 text-center">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No logistics matrix detected.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins">Geographic Entity</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center poppins">Operational Cost</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right poppins">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ffffff05]">
                                        {rates.map((rate) => (
                                            <tr key={rate.id} className="hover:bg-gray-50 transition-all group">
                                                <td className="px-10 py-6">
                                                    {isEditing === rate.id ? (
                                                        <input
                                                            type="text"
                                                            value={editRate.governorate}
                                                            onChange={(e) => setEditRate({ ...editRate, governorate: e.target.value })}
                                                            className="w-full bg-gray-50 border border-[#28B463]/30 rounded-xl px-4 py-2.5 text-sm font-bold text-black focus:ring-1 focus:ring-[#28B463] outline-none"
                                                        />
                                                    ) : (
                                                        <span className="text-base font-black text-black poppins uppercase tracking-wide group-hover:text-admin-accent transition-colors">{rate.governorate}</span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6 text-center">
                                                    {isEditing === rate.id ? (
                                                        <input
                                                            type="number"
                                                            value={editRate.cost}
                                                            onChange={(e) => setEditRate({ ...editRate, cost: e.target.value })}
                                                            className="w-32 mx-auto bg-gray-50 border border-admin-accent/30 rounded-xl px-4 py-2.5 text-sm font-bold text-black text-center focus:ring-1 focus:ring-admin-accent outline-none"
                                                        />
                                                    ) : (
                                                        <span className="text-xl font-black text-admin-accent font-mono uppercase tracking-tighter">
                                                            {rate.cost}
                                                            <span className="text-[10px] ml-1 opacity-50">EGP</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {isEditing === rate.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdate(rate.id)}
                                                                    className="p-3 text-admin-green hover:bg-admin-green/10 rounded-xl transition-all border border-admin-green/20"
                                                                >
                                                                    <Save className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setIsEditing(null)}
                                                                    className="p-3 text-gray-500 hover:bg-[#ffffff05] rounded-xl transition-all border border-gray-200"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => startEdit(rate)}
                                                                    className="p-3 text-admin-accent hover:bg-[#28B463]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-admin-accent/20"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(rate.id)}
                                                                    className="p-3 text-admin-red hover:bg-admin-red/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-admin-red/20"
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
