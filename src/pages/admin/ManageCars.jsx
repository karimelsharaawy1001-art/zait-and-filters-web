import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { ID, Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';
import { Trash2, Edit3, Search, Plus, Car, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageCars = () => {
    const navigate = useNavigate();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ make: '', model: '', yearStart: '', yearEnd: '', imageUrl: '' });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CARS_COLLECTION = 'cars';

    const fetchCars = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, CARS_COLLECTION, [Query.limit(100)]);
            setCars(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCars();
    }, [DATABASE_ID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await databases.createDocument(DATABASE_ID, CARS_COLLECTION, ID.unique(), {
                ...formData,
                yearStart: Number(formData.yearStart),
                yearEnd: Number(formData.yearEnd)
            });
            setFormData({ make: '', model: '', yearStart: '', yearEnd: '', imageUrl: '' });
            fetchCars();
            toast.success("Vehicle registered");
        } catch (error) {
            toast.error("Sync failure");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge vehicle from registry?")) return;
        try {
            await databases.deleteDocument(DATABASE_ID, CARS_COLLECTION, id);
            setCars(cars.filter(c => c.id !== id));
            toast.success("Resource deleted");
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const filtered = cars.filter(c =>
        c.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.model.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Fleet Registry" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm h-fit space-y-8">
                        <div><h2 className="text-xl font-black uppercase italic">New Registration</h2><p className="text-xs text-gray-400 font-bold">Protocol for adding vehicles</p></div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Make" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" required />
                                <input placeholder="Model" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Start Year" type="number" value={formData.yearStart} onChange={e => setFormData({ ...formData, yearStart: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" />
                                <input placeholder="End Year" type="number" value={formData.yearEnd} onChange={e => setFormData({ ...formData, yearEnd: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" />
                            </div>
                            <ImageUpload currentImage={formData.imageUrl} onUploadComplete={url => setFormData({ ...formData, imageUrl: url })} folderPath="cars" />
                            <button type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic shadow-xl">Commit to Fleet</button>
                        </form>
                    </section>

                    <section className="lg:col-span-2 space-y-8">
                        <div className="flex justify-between items-center">
                            <div><h2 className="text-xl font-black uppercase italic">Active Fleet</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Found {filtered.length} vehicle profiles</p></div>
                            <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filter Fleet..." className="pl-10 pr-4 py-2 bg-white border rounded-xl text-xs font-bold" /></div>
                        </div>

                        {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div> : (
                            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <tr>
                                                <th className="px-8 py-6">Visual</th>
                                                <th className="px-8 py-6">Composition</th>
                                                <th className="px-8 py-6">Timeline</th>
                                                <th className="px-8 py-6 text-right">Ops</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filtered.map(car => (
                                                <tr key={car.id} className="hover:bg-gray-50/50 group transition-all">
                                                    <td className="px-8 py-6"><img src={car.imageUrl || '/car-placeholder.png'} className="w-16 h-12 rounded-xl object-cover border" alt={car.model} /></td>
                                                    <td className="px-8 py-6"><h3 className="font-black text-lg italic">{car.make}</h3><p className="text-[10px] font-bold text-gray-400 uppercase">{car.model}</p></td>
                                                    <td className="px-8 py-6"><span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black">{car.yearStart} — {car.yearEnd}</span></td>
                                                    <td className="px-8 py-6 text-right flex justify-end gap-3 pt-8">
                                                        <button onClick={() => navigate(`/admin/edit-car/${car.id}`)} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Edit3 size={16} /></button>
                                                        <button onClick={() => handleDelete(car.id)} className="p-3 bg-white text-red-600 border rounded-xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default ManageCars;
