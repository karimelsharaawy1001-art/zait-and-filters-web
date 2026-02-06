import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Save, X, Search, Car, Settings, Droplets, Fuel, Loader2, Activity, ShieldCheck, Zap } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const AdminCarSpecs = () => {
    const [specs, setSpecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({ make: '', model: '', year: '', engineType: '', motorOilViscosity: '', motorOilCapacity: '', transmissionFluidType: '', transmissionCapacity: '' });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CAR_SPECS_COLLECTION = import.meta.env.VITE_APPWRITE_CAR_SPECS_COLLECTION_ID || 'car_specs';

    const fetchSpecs = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, CAR_SPECS_COLLECTION, [Query.orderAsc('make'), Query.orderAsc('model'), Query.limit(100)]);
            setSpecs(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) { toast.error("Technical registry failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSpecs(); }, [DATABASE_ID]);

    const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const resetForm = () => { setFormData({ make: '', model: '', year: '', engineType: '', motorOilViscosity: '', motorOilCapacity: '', transmissionFluidType: '', transmissionCapacity: '' }); setEditingId(null); setShowForm(false); };

    const handleEdit = (spec) => {
        setFormData({ make: spec.make || '', model: spec.model || '', year: spec.year || '', engineType: spec.engineType || '', motorOilViscosity: spec.motorOilViscosity || '', motorOilCapacity: spec.motorOilCapacity || '', transmissionFluidType: spec.transmissionFluidType || '', transmissionCapacity: spec.transmissionCapacity || '' });
        setEditingId(spec.id); setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge vehicle technical data?")) return;
        try {
            await databases.deleteDocument(DATABASE_ID, CAR_SPECS_COLLECTION, id);
            toast.success("Technical entry purged"); fetchSpecs();
        } catch (error) { toast.error("Purge failure"); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const data = { ...formData, motorOilCapacity: parseFloat(formData.motorOilCapacity) || 0, transmissionCapacity: parseFloat(formData.transmissionCapacity) || 0 };
        try {
            if (editingId) { await databases.updateDocument(DATABASE_ID, CAR_SPECS_COLLECTION, editingId, data); toast.success("Technical update deployed"); }
            else { await databases.createDocument(DATABASE_ID, CAR_SPECS_COLLECTION, ID.unique(), data); toast.success("Technical entry secured"); }
            resetForm(); fetchSpecs();
        } catch (error) { toast.error("Deployment failure"); }
        finally { setSubmitting(false); }
    };

    const filteredSpecs = specs.filter(spec => `${spec.make} ${spec.model} ${spec.year}`.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Technical Specifications" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic text-black">Vehicle Matrix</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {specs.length} Validated Compatibility Nodes</p>
                    </div>
                    <button onClick={() => setShowForm(true)} className="bg-black text-white px-10 py-5 rounded-[2rem] font-black uppercase italic text-xs shadow-2xl flex items-center gap-3 hover:scale-[1.03] transition-all"><Plus size={18} /> Secure New Specification</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-black text-white rounded-2xl shadow-xl"><Car size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Models</p><h3 className="text-2xl font-black italic">{specs.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><Droplets size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Fluids</p><h3 className="text-2xl font-black italic">Indexed</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><Zap size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Uptime</p><h3 className="text-2xl font-black italic">100%</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Registry</p><h3 className="text-2xl font-black italic">Clean</h3></div></div>
                </div>

                <div className="bg-white rounded-[3.5rem] border shadow-sm overflow-hidden flex flex-col">
                    <div className="p-10 border-b bg-gray-50/50 flex flex-col md:flex-row gap-6 justify-between items-center">
                        <div className="relative w-full md:w-96"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="FILTER BY MAKE, MODEL OR YEAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white border-2 rounded-[2rem] font-black text-xs italic outline-none focus:border-black transition-all shadow-inner" /></div>
                        <div className="flex items-center gap-4"><div className="p-4 bg-red-600 text-white rounded-2xl shadow-xl"><Settings size={20} /></div><div><h4 className="text-lg font-black uppercase italic leading-none">Compatibility Registry</h4><p className="text-[10px] font-bold text-gray-400 uppercase italic mt-1">Live Technical Grid Broadcast</p></div></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400"><tr><th className="px-10 py-6">Vehicle Identity</th><th className="px-10 py-6">Lubricant Grid</th><th className="px-10 py-6">Drivetrain Hub</th><th className="px-10 py-6 text-right">Ops</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading && specs.length === 0 ? <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr> : filteredSpecs.map(spec => (
                                    <tr key={spec.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-10 py-8"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-transparent group-hover:border-black transition-all group-hover:rotate-6 shadow-inner"><Car size={28} className="text-gray-400 group-hover:text-black transition-all" /></div><div><h4 className="font-black text-lg uppercase italic leading-none">{spec.make} {spec.model}</h4><div className="flex items-center gap-2 mt-2"><span className="bg-black text-white px-3 py-1 rounded-lg text-[9px] font-black italic">{spec.year}</span><span className="text-[10px] font-bold text-gray-400 uppercase italic">{spec.engineType}</span></div></div></div></td>
                                        <td className="px-10 py-8"><div className="flex items-center gap-4 mb-2"><Droplets size={16} className="text-red-600" /><span className="font-black text-sm italic uppercase">{spec.motorOilViscosity}</span></div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{spec.motorOilCapacity} LITERS FLUID</p></td>
                                        <td className="px-10 py-8"><div className="flex items-center gap-4 mb-2"><Settings size={16} className="text-blue-600" /><span className="font-black text-sm italic uppercase truncate max-w-[150px]">{spec.transmissionFluidType}</span></div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{spec.transmissionCapacity} LITERS CAPACITY</p></td>
                                        <td className="px-10 py-8 text-right"><div className="flex justify-end gap-3"><button onClick={() => handleEdit(spec)} className="p-3 bg-white border-2 rounded-xl text-gray-400 hover:text-black hover:border-black transition-all shadow-sm"><Edit2 size={18} /></button><button onClick={() => handleDelete(spec.id)} className="p-3 bg-white border-2 rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 sm:p-12">
                    <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl max-h-full overflow-y-auto border-8 border-black animate-in zoom-in-95 duration-500">
                        <div className="p-12 border-b flex justify-between items-center bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md">
                            <div><h3 className="text-2xl font-black uppercase italic">{editingId ? 'Modify Metrics' : 'Initialize Registry'}</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Vehicle technical configuration bridge</p></div>
                            <button onClick={resetForm} className="p-4 hover:bg-black hover:text-white rounded-2xl transition-all border-2 border-transparent hover:rotate-90"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-12 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Identity (Make)</label><input type="text" name="make" required value={formData.make} onChange={handleInputChange} placeholder="Toyota" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl font-black text-sm italic outline-none focus:border-red-600 transition-all font-mono shadow-inner" /></div>
                                <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Model Node</label><input type="text" name="model" required value={formData.model} onChange={handleInputChange} placeholder="Corolla" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl font-black text-sm italic outline-none focus:border-red-600 transition-all font-mono shadow-inner" /></div>
                                <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Cycle (Year)</label><input type="text" name="year" required value={formData.year} onChange={handleInputChange} placeholder="2022" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl font-black text-sm italic outline-none focus:border-red-600 transition-all font-mono shadow-inner" /></div>
                            </div>
                            <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Engine Variant Portfolio</label><div className="relative"><Fuel className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input type="text" name="engineType" required value={formData.engineType} onChange={handleInputChange} placeholder="1.8L Dual VVT-i" className="w-full pl-16 pr-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-sm italic outline-none focus:border-red-600 transition-all font-mono shadow-inner" /></div></div>
                            <div className="bg-red-50 p-10 rounded-[3rem] border-2 border-dashed border-red-100 space-y-8">
                                <div className="flex items-center gap-3"><Droplets className="text-red-600" size={20} /><h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest italic">Lubricant Calibration Hub</h4></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3"><label className="block text-[9px] font-black text-gray-400 uppercase italic">Viscosity Index</label><input type="text" name="motorOilViscosity" required value={formData.motorOilViscosity} onChange={handleInputChange} placeholder="0W-20" className="w-full px-6 py-4 bg-white border-2 rounded-2xl font-black text-base italic outline-none focus:border-red-600 transition-all font-mono" /></div>
                                    <div className="space-y-3"><label className="block text-[9px] font-black text-gray-400 uppercase italic">Refill Capacity (L)</label><input type="number" step="0.1" name="motorOilCapacity" required value={formData.motorOilCapacity} onChange={handleInputChange} placeholder="4.2" className="w-full px-6 py-4 bg-white border-2 rounded-2xl font-black text-base italic outline-none focus:border-red-600 transition-all font-mono" /></div>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-10 rounded-[3rem] border-2 border-dashed border-blue-100 space-y-8">
                                <div className="flex items-center gap-3"><Settings className="text-blue-600" size={20} /><h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Drivetrain Metric Node</h4></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3"><label className="block text-[9px] font-black text-gray-400 uppercase italic">Fluid Protocol</label><input type="text" name="transmissionFluidType" required value={formData.transmissionFluidType} onChange={handleInputChange} placeholder="Toyota ATF WS" className="w-full px-6 py-4 bg-white border-2 rounded-2xl font-black text-base italic outline-none focus:border-blue-600 transition-all font-mono" /></div>
                                    <div className="space-y-3"><label className="block text-[9px] font-black text-gray-400 uppercase italic">Terminal Capacity (L)</label><input type="number" step="0.1" name="transmissionCapacity" required value={formData.transmissionCapacity} onChange={handleInputChange} placeholder="7.5" className="w-full px-6 py-4 bg-white border-2 rounded-2xl font-black text-base italic outline-none focus:border-blue-600 transition-all font-mono" /></div>
                                </div>
                            </div>
                            <div className="flex gap-6 pt-6"><button type="button" onClick={resetForm} className="flex-1 py-5 border-4 border-black rounded-[2.5rem] font-black uppercase italic text-xs hover:bg-gray-50 transition-all">Cancel Node</button><button type="submit" disabled={submitting} className="flex-[2] bg-black text-white py-5 rounded-[2.5rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] transition-all flex items-center justify-center gap-3">{submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />} {editingId ? 'Deploy Update' : 'Initialize Registry'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCarSpecs;
