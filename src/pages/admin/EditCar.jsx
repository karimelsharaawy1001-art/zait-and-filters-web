import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const EditCar = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        make: '',
        model: '',
        yearStart: '',
        yearEnd: '',
        imageUrl: ''
    });

    useEffect(() => {
        const fetchCar = async () => {
            try {
                const docRef = doc(db, 'cars', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData(docSnap.data());
                } else {
                    toast.error('Car not found');
                    navigate('/admin/cars');
                }
            } catch (error) {
                console.error("Error fetching car:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCar();
    }, [id, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDoc(doc(db, 'cars', id), {
                ...formData,
                yearStart: formData.yearStart ? Number(formData.yearStart) : null,
                yearEnd: formData.yearEnd ? Number(formData.yearEnd) : null,
                updatedAt: new Date()
            });
            toast.success('Car updated successfully!');
            navigate('/admin/cars');
        } catch (error) {
            console.error("Error updating car:", error);
            toast.error('Failed to update car');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-admin-bg flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Fetching vehicle metadata...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-admin-bg font-sans p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <AdminHeader title="Edit Car Model" />

                <div className="mt-8">
                    <div className="mb-10">
                        <button
                            onClick={() => navigate('/admin/cars')}
                            className="flex items-center gap-3 text-admin-accent hover:text-white transition-all font-black uppercase tracking-widest text-[10px] group"
                        >
                            <div className="bg-admin-accent/10 p-2 rounded-xl group-hover:bg-admin-accent group-hover:text-white transition-all">
                                <ArrowLeft className="h-4 w-4" />
                            </div>
                            Back to fleet registry
                        </button>
                    </div>

                    <div className="bg-admin-card p-8 md:p-12 rounded-[2rem] border border-admin-border shadow-admin max-w-3xl mx-auto animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="mb-10 text-center">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest poppins">{formData.make} {formData.model}</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
                                <span className="w-8 h-[1px] bg-[#ffffff0d]"></span>
                                Management Portal
                                <span className="w-8 h-[1px] bg-[#ffffff0d]"></span>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Make</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.make}
                                        onChange={e => setFormData({ ...formData, make: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Model</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Year Start</label>
                                    <input
                                        type="number"
                                        value={formData.yearStart}
                                        onChange={e => setFormData({ ...formData, yearStart: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Year End</label>
                                    <input
                                        type="number"
                                        value={formData.yearEnd}
                                        onChange={e => setFormData({ ...formData, yearEnd: e.target.value })}
                                        className="w-full bg-[#ffffff05] border border-admin-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold shadow-lg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 px-1">Vehicle Asset</label>
                                <div className="bg-[#ffffff02] p-2 rounded-2xl border border-admin-border shadow-inner">
                                    <ImageUpload
                                        onUploadComplete={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                        currentImage={formData.imageUrl}
                                        folderPath="cars"
                                    />
                                </div>
                                <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                            </div>

                            <div className="flex justify-end pt-8 border-t border-[#ffffff0d]">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-10 py-4 bg-admin-red hover:bg-admin-red-dark text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-admin-red/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    {saving ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Save className="h-5 w-5" />}
                                    Sync Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditCar;
