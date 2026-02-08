import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Truck, Plus, Trash2, Edit2, Save, X, Loader2, RefreshCcw, Map, Shield } from 'lucide-react';

const EGYPT_GOVERNORATES = [
    { governorate: "القاهرة", cost: 50 }, { governorate: "الجيزة", cost: 50 }, { governorate: "الإسكندرية", cost: 60 },
    { governorate: "القليوبية", cost: 55 }, { governorate: "الشرقية", cost: 65 }, { governorate: "الدقهلية", cost: 65 },
    { governorate: "البحيرة", cost: 70 }, { governorate: "المنوفية", cost: 65 }, { governorate: "الغربية", cost: 65 },
    { governorate: "كفر الشيخ", cost: 70 }, { governorate: "دمياط", cost: 75 }, { governorate: "بورسعيد", cost: 75 },
    { governorate: "الإسماعيلية", cost: 75 }, { governorate: "السويس", cost: 75 }, { governorate: "الفيوم", cost: 80 },
    { governorate: "بني سويف", cost: 80 }, { governorate: "المنيا", cost: 90 }, { governorate: "أسيوط", cost: 90 },
    { governorate: "سوهاج", cost: 100 }, { governorate: "قنا", cost: 110 }, { governorate: "الأقصر", cost: 120 },
    { governorate: "أسوان", cost: 130 }, { governorate: "البحر الأحمر", cost: 150 }, { governorate: "الوادي الجديد", cost: 150 },
    { governorate: "مطروح", cost: 150 }, { governorate: "شمال سيناء", cost: 150 }, { governorate: "جنوب سيناء", cost: 150 }
];

const ManageShipping = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [newRate, setNewRate] = useState({ governorate: '', cost: '' });
    const [editRate, setEditRate] = useState({ governorate: '', cost: '' });

    const fetchRates = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'shipping_rates'), orderBy('governorate', 'asc'));
            const querySnapshot = await getDocs(q);
            setRates(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching rates:", error);
            toast.error("Failed to load rates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await addDoc(collection(db, 'shipping_rates'), {
                governorate: newRate.governorate,
                cost: Number(newRate.cost)
            });
            setNewRate({ governorate: '', cost: '' });
            fetchRates();
            toast.success("Zone registered");
        } catch (error) {
            console.error(error);
            toast.error("Add failure");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge zone?")) return;
        setActionLoading(true);
        try {
            await deleteDoc(doc(db, 'shipping_rates', id));
            fetchRates();
            toast.success("Resource deleted");
        } catch (error) {
            console.error(error);
            toast.error("Delete failure");
        } finally {
            setActionLoading(false);
        }
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
            toast.success("Matrix updated");
        } catch (error) {
            console.error(error);
            toast.error("Update failure");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSeed = async () => {
        if (!window.confirm("Initialize/Merge default Egypt 27-zone matrix?")) return;
        setActionLoading(true);
        try {
            const ratesRef = collection(db, 'shipping_rates');
            // Check existing to avoid duplicates if possible, or just add all
            const existingSnapshot = await getDocs(ratesRef);
            const existingGovs = existingSnapshot.docs.map(d => d.data().governorate);

            for (const gov of EGYPT_GOVERNORATES) {
                if (!existingGovs.includes(gov.governorate)) {
                    await addDoc(ratesRef, gov);
                }
            }
            fetchRates();
            toast.success("Matrix provisioned and synced");
        } catch (error) {
            console.error(error);
            toast.error("Seeding failure");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Logistics Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Fulfillment Matrix</h2>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Managing {rates.length} Geographic Nodes</p>
                    </div>
                    <button onClick={handleSeed} disabled={actionLoading} className="bg-white text-black px-8 py-5 rounded-2xl font-black uppercase italic text-[10px] tracking-widest border shadow-xl hover:bg-black hover:text-white transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50">
                        <RefreshCcw size={16} className={actionLoading ? 'animate-spin' : ''} /> Provision Default Framework
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm h-fit space-y-8">
                        <div className="flex items-center gap-4 border-b pb-6"><Map className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Node Entry</h2></div>
                        <form onSubmit={handleAdd} className="space-y-6">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Geographic Entity</label><input value={newRate.governorate} onChange={e => setNewRate({ ...newRate, governorate: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black italic shadow-inner" placeholder="e.g. القاهرة" required /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Operational Cost (EGP)</label><input type="number" value={newRate.cost} onChange={e => setNewRate({ ...newRate, cost: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black italic shadow-inner" placeholder="0.00" required /></div>
                            <button type="submit" disabled={actionLoading} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase italic shadow-2xl hover:scale-105 transition-all">{actionLoading ? 'Syncing...' : 'Commit Node'}</button>
                        </form>
                    </section>

                    <section className="lg:col-span-2 bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                        {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <tr>
                                            <th className="px-10 py-6">Geographic Protocol</th>
                                            <th className="px-10 py-6 text-center">Cost Factor</th>
                                            <th className="px-10 py-6 text-right">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rates.map(rate => (
                                            <tr key={rate.id} className="hover:bg-gray-50/50 group transition-all">
                                                <td className="px-10 py-6">
                                                    {isEditing === rate.id ? (
                                                        <input value={editRate.governorate} onChange={e => setEditRate({ ...editRate, governorate: e.target.value })} className="w-full p-3 bg-white border-2 border-red-600 rounded-xl font-black uppercase text-xs" />
                                                    ) : (
                                                        <span className="text-lg font-black italic uppercase tracking-wider group-hover:text-red-600 transition-colors uppercase">{rate.governorate}</span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6 text-center">
                                                    {isEditing === rate.id ? (
                                                        <input type="number" value={editRate.cost} onChange={e => setEditRate({ ...editRate, cost: e.target.value })} className="w-32 p-3 bg-white border-2 border-red-600 rounded-xl font-black text-center" />
                                                    ) : (
                                                        <div className="inline-block px-6 py-2 bg-black text-white rounded-2xl font-black italic text-xl shadow-lg">{rate.cost}<span className="text-[10px] ml-1 opacity-50 not-italic">EGP</span></div>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                                        {isEditing === rate.id ? (
                                                            <>
                                                                <button onClick={() => handleUpdate(rate.id)} className="p-3 bg-red-600 text-white rounded-xl shadow-xl"><Save size={16} /></button>
                                                                <button onClick={() => setIsEditing(null)} className="p-3 bg-gray-100 text-gray-400 rounded-xl"><X size={16} /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => { setIsEditing(rate.id); setEditRate({ governorate: rate.governorate, cost: rate.cost }); }} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Edit2 size={16} /></button>
                                                                <button onClick={() => handleDelete(rate.id)} className="p-3 bg-white text-red-600 border rounded-xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
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
                    </section>
                </div>
            </main>
        </div>
    );
};

export default ManageShipping;
