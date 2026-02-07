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
    const [submitting, setSubmitting] = useState(false);

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
        setSubmitting(true);
        try {
            const payload = {
                make: formData.make.trim(),
                model: formData.model.trim(),
                yearStart: formData.yearStart ? Number(formData.yearStart) : null,
                yearEnd: formData.yearEnd ? Number(formData.yearEnd) : null,
                year: formData.yearStart && formData.yearEnd
                    ? `${formData.yearStart}-${formData.yearEnd}`
                    : (formData.yearStart || formData.yearEnd || 'N/A'),
                imageUrl: formData.imageUrl || '',
                image: formData.imageUrl || '' // Dual-mapping for schema compatibility
            };

            await databases.createDocument(DATABASE_ID, CARS_COLLECTION, ID.unique(), payload);
            setFormData({ make: '', model: '', yearStart: '', yearEnd: '', imageUrl: '' });
            fetchCars();
            toast.success("Vehicle registered successfully");
        } catch (error) {
            console.error("[FLEET_SYNC_ERROR]", error);
            toast.error(`Sync failure: ${error.message || 'Check database schema'}`);
        } finally {
            setSubmitting(false);
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
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Fleet Registry" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="admin-card-compact p-5 h-fit space-y-5">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">New Registration</h2>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Acquisition protocol for fleet nodes</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="admin-text-subtle ml-1">Make</label>
                                    <input placeholder="e.g. Toyota" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="admin-text-subtle ml-1">Model</label>
                                    <input placeholder="e.g. Corolla" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="admin-text-subtle ml-1">Start Year</label>
                                    <input placeholder="2010" type="number" value={formData.yearStart} onChange={e => setFormData({ ...formData, yearStart: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="admin-text-subtle ml-1">End Year</label>
                                    <input placeholder="2020" type="number" value={formData.yearEnd} onChange={e => setFormData({ ...formData, yearEnd: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="admin-text-subtle ml-1">Fleet Visual (Image)</label>
                                <ImageUpload currentImage={formData.imageUrl} onUploadComplete={url => setFormData({ ...formData, imageUrl: url })} folderPath="cars" />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 justify-center py-3 text-xs uppercase shadow-lg shadow-slate-900/10 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Commit to Fleet'}
                            </button>
                        </form>
                    </section>

                    <section className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Active Fleet</h2>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Telemtery: {filtered.length} nodes registered</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filter Fleet..." className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-slate-900" />
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-16 text-center text-slate-400">
                                <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                                <p className="text-xs font-medium uppercase tracking-widest">Accessing Logs...</p>
                            </div>
                        ) : (
                            <div className="admin-card-compact overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full admin-table-dense">
                                        <thead className="bg-slate-50/50">
                                            <tr>
                                                <th className="text-left">Visual</th>
                                                <th className="text-left">Composition</th>
                                                <th className="text-left">Timeline</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filtered.map(car => (
                                                <tr key={car.id} className="hover:bg-slate-50/50 group transition-all">
                                                    <td>
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                                            <img src={car.imageUrl || car.image || '/car-placeholder.png'} className="w-full h-full object-cover" alt={car.model} />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <h3 className="font-bold text-slate-900 text-[13px] leading-tight">{car.make}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{car.model}</p>
                                                    </td>
                                                    <td>
                                                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 uppercase border border-slate-200">
                                                            {car.yearStart ? `${car.yearStart} — ${car.yearEnd || 'Present'}` : (car.year || 'Unknown')}
                                                        </span>
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => navigate(`/admin/edit-car/${car.id}`)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button onClick={() => handleDelete(car.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
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
