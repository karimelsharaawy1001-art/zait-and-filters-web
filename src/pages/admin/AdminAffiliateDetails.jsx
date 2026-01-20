import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    addDoc,
    updateDoc,
    increment,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Wallet,
    Clock,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    FileText,
    ExternalLink,
    PlusCircle
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const AdminAffiliateDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [affiliate, setAffiliate] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({
        totalEarned: 0,
        pendingBalance: 0,
        withdrawableBalance: 0,
        paidOut: 0
    });
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutLoading, setPayoutLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Affiliate Profile
            const affSnap = await getDoc(doc(db, 'affiliates', id));
            if (!affSnap.exists()) {
                toast.error("Affiliate not found");
                navigate('/admin/affiliates');
                return;
            }
            const affData = affSnap.data();
            setAffiliate(affData);

            // 2. Fetch Transactions from subcollection
            const transRef = collection(db, `affiliates/${id}/transactions`);
            const q = query(transRef, orderBy('createdAt', 'desc'));
            const transSnap = await getDocs(q);

            const transList = transSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 3. Dynamic Calculation Engine (Phase 2)
            let earned = 0;
            let pending = 0;
            let withdrawable = 0;
            const now = new Date();

            transList.forEach(tx => {
                if (tx.status === 'void') return;

                earned += tx.commission;

                // Maturity check
                const created = tx.createdAt?.toDate() || new Date();
                const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

                if (diffDays >= 14) {
                    tx.maturityStatus = 'ready';
                    // We need to subtract what's already paid from the aggregate withdrawable
                    // But for per-transaction listing, it's 'ready'
                } else {
                    tx.maturityStatus = 'cooling';
                    tx.daysLeft = 14 - diffDays;
                }
            });

            // Calculate aggregate balances from profile (assuming totalPaid is tracked)
            const totalPaid = affData.totalPaid || 0;

            // Calculate withdrawable as confirmed commissions > 14 days - already paid
            // For simplicity in this UI, we show the split
            const matureTotal = transList
                .filter(tx => tx.status !== 'void' && (Math.floor((now - (tx.createdAt?.toDate() || new Date())) / (1000 * 60 * 60 * 24))) >= 14)
                .reduce((acc, tx) => acc + tx.commission, 0);

            setStats({
                totalEarned: affData.totalEarnings || 0,
                pendingBalance: (affData.totalEarnings || 0) - matureTotal,
                withdrawableBalance: Math.max(0, matureTotal - totalPaid),
                paidOut: totalPaid
            });

            setTransactions(transList);
        } catch (error) {
            console.error("Error fetching affiliate details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayout = async (e) => {
        e.preventDefault();
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0 || amount > stats.withdrawableBalance) {
            toast.error("Invalid payout amount");
            return;
        }

        setPayoutLoading(true);
        try {
            // 1. Create payout record
            await addDoc(collection(db, 'payouts'), {
                affiliateId: id,
                amount: amount,
                method: affiliate.instaPayNumber ? 'InstaPay' : 'Mobile Wallet',
                recipientInfo: affiliate.instaPayNumber || affiliate.walletNumber,
                status: 'completed',
                createdAt: serverTimestamp()
            });

            // 2. Update affiliate profile
            await updateDoc(doc(db, 'affiliates', id), {
                totalPaid: increment(amount)
            });

            setShowPayoutModal(false);
            setPayoutAmount('');
            fetchData(); // Refresh stats
            toast.success("Payout recorded successfully");
        } catch (error) {
            console.error("Payout Error:", error);
            toast.error("Failed to record payout");
        } finally {
            setPayoutLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AdminHeader title="Affiliate Management" />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <button
                        onClick={() => navigate('/admin/affiliates')}
                        className="flex items-center text-gray-500 hover:text-gray-900 font-bold uppercase tracking-widest text-xs transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to List
                    </button>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${affiliate.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {affiliate.status}
                        </span>
                        <button
                            onClick={() => setShowPayoutModal(true)}
                            disabled={stats.withdrawableBalance <= 0}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-100 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Record Payout
                        </button>
                    </div>
                </div>

                {/* Profile and Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Profile Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 lg:col-span-1">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-16 w-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white">
                                <User className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 leading-tight">{affiliate.fullName}</h2>
                                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-1">Tier {affiliate.currentTier} Partner</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                                    <p className="text-sm font-bold text-gray-900">{affiliate.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                                    <p className="text-sm font-bold text-gray-900">{affiliate.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                <Wallet className="h-5 w-5 text-orange-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Payout Methods</p>
                                    {affiliate.instaPayNumber && (
                                        <p className="text-xs font-bold text-gray-900">IP: <span className="text-sm">{affiliate.instaPayNumber}</span></p>
                                    )}
                                    {affiliate.walletNumber && (
                                        <p className="text-xs font-bold text-gray-900">W: <span className="text-sm">{affiliate.walletNumber}</span></p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Earned</p>
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                            </div>
                            <p className="text-3xl font-black text-gray-900">{stats.totalEarned.toLocaleString()} <span className="text-sm font-bold text-gray-400">EGP</span></p>
                            <p className="text-[10px] font-bold text-gray-400 mt-2 italic">All-time commissions generated</p>
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Pending (Cooling)</p>
                                <Clock className="h-5 w-5 text-orange-500" />
                            </div>
                            <p className="text-3xl font-black text-orange-600">{stats.pendingBalance.toLocaleString()} <span className="text-sm font-bold text-orange-200">EGP</span></p>
                            <p className="text-[10px] font-bold text-orange-400 mt-2 italic">Orders delivered within 14 days</p>
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-green-100 shadow-green-50 flex flex-col justify-between relative overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-black text-green-700 uppercase tracking-widest">Withdrawable</p>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <p className="text-3xl font-black text-green-600">{stats.withdrawableBalance.toLocaleString()} <span className="text-sm font-bold text-green-200">EGP</span></p>
                            <p className="text-[10px] font-bold text-green-500 mt-2 italic">Matured and ready for payout</p>
                        </div>

                        <div className="bg-gray-900 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Already Paid</p>
                                <FileText className="h-5 w-5 text-gray-500" />
                            </div>
                            <p className="text-3xl font-black text-white">{stats.paidOut.toLocaleString()} <span className="text-sm font-bold text-gray-600">EGP</span></p>
                            <p className="text-[10px] font-bold text-gray-500 mt-2 italic">Total amount transferred to partner</p>
                        </div>
                    </div>
                </div>

                {/* Referral History */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Referral History</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-4">Cooling</span>
                            <span className="w-3 h-3 rounded-full bg-green-400"></span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ready</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Commission</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-12 text-center text-gray-400 font-bold italic">No referrals found for this partner</td>
                                    </tr>
                                ) : (
                                    transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <button
                                                    onClick={() => navigate(`/admin/order/${tx.orderId}`)}
                                                    className="flex items-center gap-1 text-sm font-black text-gray-900 hover:text-orange-600 transition-colors"
                                                >
                                                    #{tx.orderId.slice(-6)}
                                                    <ExternalLink className="h-3 w-3" />
                                                </button>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {tx.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-bold">{tx.createdAt?.toDate().toLocaleTimeString()}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                {tx.status === 'void' ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase tracking-widest w-fit">
                                                        <RotateCcw className="h-3 w-3" />
                                                        Void / Returned
                                                    </span>
                                                ) : tx.maturityStatus === 'ready' ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest w-fit">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Ready / Matured
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-widest w-fit">
                                                        <Clock className="h-3 w-3" />
                                                        {tx.daysLeft}d Remaining
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <p className={`text-sm font-black ${tx.status === 'void' ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
                                                    {tx.commission.toLocaleString()} EGP
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-bold">{tx.commissionRate * 100}% Rate</p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Payout Modal */}
            {showPayoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl relative w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-orange-600 p-8 text-white">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Record Payout</h3>
                            <p className="text-orange-200 text-sm font-bold mt-1">Send funds to {affiliate.fullName}</p>
                        </div>
                        <form onSubmit={handleRecordPayout} className="p-8 space-y-6">
                            <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Max Withdrawable</p>
                                <p className="text-2xl font-black text-green-600">{stats.withdrawableBalance.toLocaleString()} EGP</p>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Amount to Payout</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">EGP</span>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={stats.withdrawableBalance}
                                        value={payoutAmount}
                                        onChange={(e) => setPayoutAmount(e.target.value)}
                                        className="w-full pl-16 pr-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:outline-none transition-all font-black text-lg"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3" />
                                    Verify transfer on external app first
                                </p>
                                <button
                                    type="submit"
                                    disabled={payoutLoading || !payoutAmount}
                                    className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                >
                                    {payoutLoading ? "Recording..." : "Confirm & Record"}
                                    {!payoutLoading && <CheckCircle2 className="h-5 w-5" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPayoutModal(false)}
                                    className="w-full bg-white text-gray-500 font-bold py-3 text-xs uppercase tracking-widest hover:text-gray-900 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAffiliateDetails;
