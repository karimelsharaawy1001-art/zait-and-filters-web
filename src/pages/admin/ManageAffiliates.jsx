import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    orderBy,
    deleteDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    TrendingUp,
    DollarSign,
    Wallet,
    Search,
    CheckCircle,
    Ban,
    Clock,
    Trash2,
    Eye
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const ManageAffiliates = () => {
    const navigate = useNavigate();
    const [affiliates, setAffiliates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState({
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalSales: 0,
        totalEarnings: 0
    });

    useEffect(() => {
        fetchAffiliates();
    }, []);

    const fetchAffiliates = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAffiliates(list);

            const totals = list.reduce((acc, curr) => ({
                totalSales: acc.totalSales + (Number(curr.totalSales) || 0),
                totalEarnings: acc.totalEarnings + (Number(curr.totalEarnings) || 0),
                activeAffiliates: acc.activeAffiliates + (curr.status === 'active' ? 1 : 0)
            }), { totalSales: 0, totalEarnings: 0, activeAffiliates: 0 });

            setSummary({
                totalAffiliates: list.length,
                ...totals
            });
        } catch (error) {
            console.error("Error fetching affiliates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, 'affiliates', id), { status: newStatus });
            setAffiliates(prev => prev.map(aff => aff.id === id ? { ...aff, status: newStatus } : aff));
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleCommissionChange = async (id, newRate) => {
        const rate = parseFloat(newRate);
        if (isNaN(rate) || rate < 0 || rate > 1) {
            toast.error("Please enter a valid rate between 0 and 1 (e.g., 0.05 for 5%)\"");
            return;
        }

        try {
            await updateDoc(doc(db, 'affiliates', id), { commissionRate: rate });
            setAffiliates(prev => prev.map(aff => aff.id === id ? { ...aff, commissionRate: rate } : aff));
        } catch (error) {
            console.error("Error updating rate:", error);
            toast.error("Failed to update commission rate");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this affiliate? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'affiliates', id));
            setAffiliates(prev => prev.filter(aff => aff.id !== id));
        } catch (error) {
            console.error("Error deleting affiliate:", error);
            toast.error("Failed to delete affiliate");
        }
    };

    const filteredAffiliates = affiliates.filter(aff => {
        const code = (aff.referralCode || '').toLowerCase();
        const uid = (aff.userId || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return code.includes(search) || uid.includes(search);
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AdminHeader title="Affiliate Management" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Partners</p>
                                <h3 className="text-2xl font-black text-gray-900">{summary.totalAffiliates || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Sales</p>
                                <h3 className="text-2xl font-black text-gray-900">{summary.totalSales || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Paid</p>
                                <h3 className="text-2xl font-black text-gray-900">{(summary.totalEarnings || 0).toLocaleString()} <span className="text-xs font-normal">EGP</span></h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                <Ban className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Rate</p>
                                <h3 className="text-2xl font-black text-gray-900">
                                    {summary.totalAffiliates > 0
                                        ? ((summary.activeAffiliates / summary.totalAffiliates) * 100).toFixed(1)
                                        : '0.0'}%
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Partner List</h3>
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by code or user ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 transition-all font-medium text-sm text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Affiliate / ID</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Performance</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Tier / Rate</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Payout Info</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Balance</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Partners...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAffiliates.length > 0 ? filteredAffiliates.map((aff) => (
                                    <tr key={aff.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-gray-900 text-lg uppercase">{aff.referralCode || 'NO CODE'}</span>
                                                <span className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">{aff.userId || 'No UID'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700">{aff.referralCount || 0} Sales</span>
                                                <span className="text-xs text-gray-400">Total: {(aff.totalEarnings || 0).toLocaleString()} EGP</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded w-fit
                                                    ${aff.currentTier === 3 ? 'bg-purple-100 text-purple-700' :
                                                        aff.currentTier === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
                                                `}>
                                                    Tier {aff.currentTier || 1}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900">{(aff.commissionPercentage || 5)}%</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                {aff.instaPayNumber && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">IP: {aff.instaPayNumber}</span>
                                                )}
                                                {aff.walletNumber && (
                                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">W: {aff.walletNumber}</span>
                                                )}
                                                {!aff.instaPayNumber && !aff.walletNumber && (
                                                    <span className="text-[10px] font-bold text-gray-400 italic">No payout info</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="h-4 w-4 text-orange-400" />
                                                <span className="font-black text-orange-600">{(aff.pendingBalance || 0).toLocaleString()} <span className="text-[10px]">EGP</span></span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                value={aff.status || 'pending'}
                                                onChange={(e) => handleStatusChange(aff.id, e.target.value)}
                                                className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2 outline-none cursor-pointer transition-all
                                                    ${aff.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : ''}
                                                    ${aff.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : ''}
                                                    ${aff.status === 'banned' ? 'bg-red-50 text-red-700 border-red-100' : ''}
                                                `}
                                            >
                                                <option value="active">Active</option>
                                                <option value="pending">Pending</option>
                                                <option value="banned">Banned</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/admin/affiliates/${aff.id}`)}
                                                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(aff.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Affiliate"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                                            No partners found in the system.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ManageAffiliates;
