import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Car, Settings } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const EditCar = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ make: '', model: '', yearStart: '', yearEnd: '', imageUrl: '' });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CARS_COLLECTION = 'cars';

    useEffect(() => {
        const fetchCar = async () => {
            if (!DATABASE_ID) return;
            try {
                const docSnap = await databases.getDocument(DATABASE_ID, CARS_COLLECTION, id);
                setFormData({
                    ...docSnap,
                    yearStart: docSnap.yearStart?.toString() || '',
                    yearEnd: docSnap.yearEnd?.toString() || ''
                });
            } catch (error) {
                toast.error('Vehicle profile not found');
                navigate('/admin/cars');
            } finally {
                setLoading(false);
            }
        };
        fetchCar();
    }, [id, DATABASE_ID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                make: formData.make.trim(),
                model: formData.model.trim(),
                yearStart: formData.yearStart ? Number(formData.yearStart) : null,
                yearEnd: formData.yearEnd ? Number(formData.yearEnd) : null,
                imageUrl: formData.imageUrl || '',
                image: formData.imageUrl || '' // Dual-mapping for schema compatibility
            };

            await databases.updateDocument(DATABASE_ID, CARS_COLLECTION, id, payload);
            toast.success('Fleet registry updated');
            navigate('/admin/cars');
        } catch (error) {
            toast.error('Sync failure');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center uppercase font-black text-[10px] text-gray-400 font-Cairo"><Loader2 className="animate-spin mx-auto mb-4" /> Scanning Registry...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Profile Revision" />
            <main className="max-w-4xl mx-auto py-8 px-4">
                <button onClick={() => navigate('/admin/cars')} className="flex items-center text-gray-400 font-black uppercase text-[10px] mb-8 gap-2"><ArrowLeft size={14} /> Return to Fleet</button>
                <form onSubmit={handleSubmit} className="space-y-10">
                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b pb-6"><Car className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Vehicle DNA</h2></div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Composition Make</label><input value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xl italic" required /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Structural Model</label><input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xl italic" required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Production Start</label><input type="number" value={formData.yearStart} onChange={e => setFormData({ ...formData, yearStart: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Production End</label><input type="number" value={formData.yearEnd} onChange={e => setFormData({ ...formData, yearEnd: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" /></div>
                        </div>
                    </section>

                    <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b pb-6"><Settings className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Visual Asset</h2></div>
                        <ImageUpload currentImage={formData.imageUrl} onUploadComplete={url => setFormData({ ...formData, imageUrl: url })} folderPath="cars" />
                    </section>

                    <div className="flex justify-end pt-10 border-t"><button type="submit" disabled={saving} className="bg-red-600 text-white px-16 py-6 rounded-3xl font-black uppercase italic shadow-2xl hover:scale-105 transition-all">{saving ? 'Committing...' : 'Finalize Revision'}</button></div>
                </form>
            </main>
        </div>
    );
};

export default EditCar;
