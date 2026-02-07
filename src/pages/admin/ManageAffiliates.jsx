import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    Users, TrendingUp, DollarSign, Wallet, Search, CheckCircle, Ban, Clock, Trash2, Eye, Loader2, Star, Target, ShieldCheck, Zap
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const ManageAffiliates = () => {
    const navigate = useNavigate();
    const [affiliates, setAffiliates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState({ totalAffiliates: 0, activeAffiliates: 0, totalSales: 0, totalEarnings: 0 });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const AFFILIATES_COLLECTION = import.meta.env.VITE_APPWRITE_AFFILIATES_COLLECTION_ID || 'affiliates';
    const PROMO_CODES_COLLECTION = import.meta.env.VITE_APPWRITE_PROMO_CODES_COLLECTION_ID || 'promo_codes';

    const fetchAffiliates = async () => {
        if (!DATABASE_ID || !AFFILIATES_COLLECTION) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, AFFILIATES_COLLECTION, [Query.orderDesc('$createdAt'), Query.limit(100)]);
            const list = response.documents.map(doc => ({ id: doc.$id, ...doc }));
            setAffiliates(list);
            const totals = list.reduce((acc, curr) => ({
                totalSales: acc.totalSales + (Number(curr.totalSales) || 0),
                totalEarnings: acc.totalEarnings + (Number(curr.totalEarnings) || 0),
                activeAffiliates: acc.activeAffiliates + (curr.status === 'active' ? 1 : 0)
            }), { totalSales: 0, totalEarnings: 0, activeAffiliates: 0 });
            setSummary({ totalAffiliates: list.length, ...totals });
        } catch (error) { toast.error("Partnership registry failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAffiliates(); }, [DATABASE_ID, AFFILIATES_COLLECTION]);

    const handleStatusChange = async (id, newStatus) => {
        try {
            await databases.updateDocument(DATABASE_ID, AFFILIATES_COLLECTION, id, { status: newStatus });
            if (newStatus === 'active') {
                const affiliateDoc = affiliates.find(a => a.id === id);
                if (affiliateDoc && !affiliateDoc.referralCode) {
                    const rawName = affiliateDoc.name || affiliateDoc.userName || 'PARTNER';
                    const englishName = rawName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    let baseCode = englishName.length >= 3 ? englishName.substring(0, 8) : id.substring(0, 6).toUpperCase();
                    let generatedCode = ''; let isUnique = false; let attempts = 0;
                    while (!isUnique && attempts < 10) {
                        const suffix = attempts === 0 ? '5' : `${Math.floor(10 + Math.random() * 90)}5`;
                        generatedCode = `ZAF_${baseCode}${suffix}`;
                        const [promoRes, affRes] = await Promise.all([
                            databases.listDocuments(DATABASE_ID, PROMO_CODES_COLLECTION, [Query.equal('code', generatedCode)]),
                            databases.listDocuments(DATABASE_ID, AFFILIATES_COLLECTION, [Query.equal('referralCode', generatedCode)])
                        ]);
                        if (promoRes.total === 0 && affRes.total === 0) isUnique = true; else attempts++;
                    }
                    if (isUnique) {
                        await databases.createDocument(DATABASE_ID, PROMO_CODES_COLLECTION, ID.unique(), {
                            code: generatedCode, type: 'discount', value: 5, isPercentage: true, isActive: true, affiliateId: id, usageLimit: 10000, usedCount: 0, createdAt: new Date().toISOString()
                        });
                        await databases.updateDocument(DATABASE_ID, AFFILIATES_COLLECTION, id, { referralCode: generatedCode, linkedPromoCode: generatedCode });
                        setAffiliates(prev => prev.map(aff => aff.id === id ? { ...aff, status: newStatus, referralCode: generatedCode } : aff));
                        toast.success(`Activated: ${generatedCode}`); return;
                    }
                }
            }
            setAffiliates(prev => prev.map(aff => aff.id === id ? { ...aff, status: newStatus } : aff));
            toast.success("Protocol updated");
        } catch (error) { toast.error("Sync failure"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge partnership record?")) return;
        try {
            await databases.deleteDocument(DATABASE_ID, AFFILIATES_COLLECTION, id);
            setAffiliates(prev => prev.filter(aff => aff.id !== id));
            toast.success("Record purged");
        } catch (error) { toast.error("Purge failure"); }
    };

    const filteredAffiliates = affiliates.filter(aff => {
        const search = searchTerm.toLowerCase();
        return (aff.referralCode || '').toLowerCase().includes(search) || (aff.name || '').toLowerCase().includes(search) || (aff.email || '').toLowerCase().includes(search);
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Growth Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Partner Matrix</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {summary.totalAffiliates} Strategic Alliances</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Users size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Growth Nodes</p><h3 className="text-2xl font-black italic">{summary.totalAffiliates}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><TrendingUp size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Gross Pipeline</p><h3 className="text-2xl font-black italic">{summary.totalSales.toLocaleString()} <span className="text-[10px] opacity-40 italic">EGP</span></h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><DollarSign size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Settled Comms</p><h3 className="text-2xl font-black italic">{summary.totalEarnings.toLocaleString()} <span className="text-[10px] opacity-40 italic">EGP</span></h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Target size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Efficiency</p><h3 className="text-2xl font-black italic">{summary.totalAffiliates > 0 ? ((summary.activeAffiliates / summary.totalAffiliates) * 100).toFixed(1) : 0}%</h3></div></div>
                </div>

                <div className="bg-white p-4 rounded-[2.5rem] border shadow-sm mb-12 relative">
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search partners by code, signature, or digital relay..." className="w-full pl-16 pr-6 py-5 bg-gray-50/50 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>

                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-8 py-6">Partner Signature</th>
                                <th className="px-8 py-6">Operational Yield</th>
                                <th className="px-8 py-6 text-center">Hierarchy</th>
                                <th className="px-8 py-6 text-center">Settlement</th>
                                <th className="px-8 py-6 text-center">Phase</th>
                                <th className="px-8 py-6 text-right">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? <tr><td colSpan="6" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr> : filteredAffiliates.map(aff => (
                                <tr key={aff.id} className="hover:bg-gray-50/50 group transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 group-hover:bg-black group-hover:text-white transition-all uppercase">{aff.name?.[0]}</div>
                                            <div>
                                                <h4 className="font-black text-base uppercase italic">{aff.referralCode || 'PROSPECT'}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{aff.name || 'UNRESOLVED IDENTITY'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-black italic flex items-center gap-2"><Zap size={12} className="text-orange-600" /> {aff.referralCount || 0} Conversions</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase italic">Pipeline: {(aff.totalSales || 0).toLocaleString()} EGP</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border shadow-sm ${aff.currentTier === 3 ? 'bg-purple-50 text-purple-600 border-purple-100' : aff.currentTier === 2 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Tier {aff.currentTier || 1}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="inline-flex items-center gap-3 px-5 py-2 bg-black text-white rounded-2xl shadow-lg">
                                            <Wallet size={14} className="text-red-600" />
                                            <span className="font-black italic">{(aff.pendingBalance || 0).toLocaleString()} <span className="text-[10px] opacity-40 not-italic ml-1">EGP</span></span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <select value={aff.status || 'pending'} onChange={e => handleStatusChange(aff.id, e.target.value)} className={`text-[10px] font-black uppercase italic px-5 py-2 rounded-xl border-2 shadow-sm focus:ring-0 outline-none transition-all ${aff.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : aff.status === 'banned' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                            <option value="active">Active</option><option value="pending">Pending</option><option value="banned">Banned</option>
                                        </select>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                            <button onClick={() => navigate(`/admin/affiliates/${aff.id}`)} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Eye size={18} /></button>
                                            <button onClick={() => handleDelete(aff.id)} className="p-3 bg-white text-red-600 border rounded-xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default ManageAffiliates;
