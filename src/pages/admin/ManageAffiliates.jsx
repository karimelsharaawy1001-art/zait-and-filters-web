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
    deleteDoc,
    addDoc,
    where
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

            // Auto-Generate Promo Code on Activation
            if (newStatus === 'active') {
                const affiliateDoc = affiliates.find(a => a.id === id);
                if (affiliateDoc && !affiliateDoc.referralCode) {
                    // Import needed only here or use existing imports
                    // We need 'addDoc' and 'collection' which we have.
                    // We need 'query', 'where' to check uniqueness.

                    // Robust English Code Generation
                    const rawName = affiliateDoc.fullName || affiliateDoc.userName || 'PARTNER';
                    const englishName = rawName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

                    // If name is Arabic (empty after replace) or too short, use ID
                    let baseCode = englishName.length >= 3 ? englishName.substring(0, 8) : id.substring(0, 6).toUpperCase();

                    let generatedCode = '';
                    let isUnique = false;
                    let attempts = 0;

                    const promoRef = collection(db, 'promo_codes');
                    const affRef = collection(db, 'affiliates');

                    while (!isUnique && attempts < 10) {
                        const suffix = attempts === 0 ? '5' : `${Math.floor(10 + Math.random() * 90)}5`;
                        generatedCode = `ZAF_${baseCode}${suffix}`;

                        const qPromo = query(promoRef, where('code', '==', generatedCode));
                        const qAff = query(affRef, where('referralCode', '==', generatedCode));

                        const [promoSnap, affSnap] = await Promise.all([getDocs(qPromo), getDocs(qAff)]);

                        if (promoSnap.empty && affSnap.empty) {
                            isUnique = true;
                        } else {
                            attempts++;
                        }
                    }

                    if (!isUnique) {
                        // Fallback
                        generatedCode = `ZAF_${id.substring(0, 5).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}5`;
                        isUnique = true;
                    }

                    if (isUnique) {
                        // Create Promo Code (hardcoded 5% discount)
                        await addDoc(promoRef, {
                            code: generatedCode,
                            type: 'discount',
                            value: 5,
                            isPercentage: true,
                            isActive: true,
                            affiliateId: id,
                            usageLimit: 10000,
                            usedCount: 0,
                            createdAt: new Date(),
                            createdBy: 'system_auto_approve'
                        });

                        // Link to Affiliate
                        await updateDoc(doc(db, 'affiliates', id), {
                            referralCode: generatedCode,
                            linkedPromoCode: generatedCode
                        });

                        // Update local state to reflect change immediately
                        setAffiliates(prev => prev.map(aff => aff.id === id ? { ...aff, status: newStatus, referralCode: generatedCode } : aff));
                        toast.success(`Activated & Code Generated: ${generatedCode}`);
                        return; // Exit as specific success handled
                    } else {
                        toast.error("Could not generate unique code.");
                    }
                }
            }

            setAffiliates(prev => prev.map(aff => aff.id === id ? { ...aff, status: newStatus } : aff));
            toast.success("Status updated successfully");
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
        <div className="min-h-screen bg-gray-50 font-sans pb-20 p-4 md:p-8">
            <AdminHeader title="Affiliate Management" />

            <main className="max-w-7xl mx-auto mt-10">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-admin-accent/10 text-admin-accent rounded-2xl group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Partners</p>
                                <h3 className="text-2xl font-black text-black poppins">{summary.totalAffiliates || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-admin-green/10 text-admin-green rounded-2xl group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sales</p>
                                <h3 className="text-2xl font-black text-black poppins">{summary.totalSales || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-admin-accent/10 text-admin-accent rounded-2xl group-hover:scale-110 transition-transform">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid</p>
                                <h3 className="text-2xl font-black text-black poppins">{(summary.totalEarnings || 0).toLocaleString()} <span className="text-xs text-gray-400">EGP</span></h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-admin-red/10 text-admin-red rounded-2xl group-hover:scale-110 transition-transform">
                                <Ban className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Rate</p>
                                <h3 className="text-2xl font-black text-black poppins">
                                    {summary.totalAffiliates > 0
                                        ? ((summary.activeAffiliates / summary.totalAffiliates) * 100).toFixed(1)
                                        : '0.0'}%
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/30">
                        <div>
                            <h3 className="text-xl font-black text-black uppercase tracking-widest poppins">Partner Network</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Manage referral partners and commission payouts</p>
                        </div>
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                            <input
                                type="text"
                                placeholder="Search by code or user ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-admin-accent transition-all font-bold text-sm text-black placeholder-gray-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins">Identity</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins">Metrics</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins">Tiering</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins">Gateway</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins">Escrow</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins">Status</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest poppins text-right">Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-10 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-admin-accent border-t-transparent"></div>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Synchronizing partner ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAffiliates.length > 0 ? filteredAffiliates.map((aff) => (
                                    <tr key={aff.id} className="hover:bg-gray-50 transition-all group">
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="font-black text-black text-base poppins uppercase tracking-wide group-hover:text-admin-accent transition-colors">{aff.referralCode || 'NO CODE'}</span>
                                                <span className="text-[9px] font-bold text-gray-400 truncate max-w-[100px] mt-1">{aff.userId || 'No UID'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-black">{aff.referralCount || 0} Successful Conversions</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Generated: {(aff.totalEarnings || 0).toLocaleString()} EGP</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border w-fit
                                                    ${aff.currentTier === 3 ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        aff.currentTier === 2 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}
                                                `}>
                                                    Tier {aff.currentTier || 1}
                                                </span>
                                                <span className="text-xs font-black text-black">{(aff.commissionPercentage || 5)}% Take-Home</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-2">
                                                {aff.instaPayNumber && (
                                                    <span className="text-[9px] font-black text-admin-accent bg-admin-accent/5 px-2 py-1 rounded-lg border border-admin-accent/10 uppercase tracking-widest">IP: {aff.instaPayNumber}</span>
                                                )}
                                                {aff.walletNumber && (
                                                    <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 uppercase tracking-widest">W: {aff.walletNumber}</span>
                                                )}
                                                {!aff.instaPayNumber && !aff.walletNumber && (
                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Incomplete KYC</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-admin-accent/10 rounded-xl">
                                                    <Wallet className="h-4 w-4 text-admin-accent" />
                                                </div>
                                                <span className="font-black text-black text-base poppins">{(aff.pendingBalance || 0).toLocaleString()} <span className="text-[10px] text-gray-400 uppercase">EGP</span></span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <select
                                                value={aff.status || 'pending'}
                                                onChange={(e) => handleStatusChange(aff.id, e.target.value)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border-2 outline-none cursor-pointer transition-all bg-transparent
                                                    ${aff.status === 'active' ? 'text-admin-green border-admin-green/20 hover:bg-admin-green/10' : ''}
                                                    ${aff.status === 'pending' ? 'text-admin-accent border-admin-accent/20 hover:bg-admin-accent/10' : ''}
                                                    ${aff.status === 'banned' ? 'text-admin-red border-admin-red/20 hover:bg-admin-red/10' : ''}
                                                `}
                                            >
                                                <option value="active" className="bg-white text-black">Active</option>
                                                <option value="pending" className="bg-white text-black">Pending</option>
                                                <option value="banned" className="bg-white text-black">Banned</option>
                                            </select>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => navigate(`/admin/affiliates/${aff.id}`)}
                                                    className="p-3 bg-white text-gray-400 hover:text-admin-accent hover:bg-admin-accent/10 rounded-2xl transition-all border border-gray-100 hover:border-admin-accent/20 shadow-sm"
                                                    title="View Full Intel"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(aff.id)}
                                                    className="p-3 bg-red-50 text-gray-400 hover:text-admin-red hover:bg-admin-red/10 rounded-2xl transition-all border border-gray-100 hover:border-admin-red/20 shadow-sm"
                                                    title="Terminate Account"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="bg-gray-50 p-10 rounded-full border border-gray-100">
                                                    <Users className="h-16 w-16 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No active partners detected in node</p>
                                            </div>
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
