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
            <div className="min-h-screen bg-admin-bg flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing partner intel...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-admin-bg font-sans pb-20 p-4 md:p-8">
            <AdminHeader title="Affiliate Profile" />

            <main className="max-w-7xl mx-auto mt-10">
                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <button
                        onClick={() => navigate('/admin/affiliates')}
                        className="flex items-center text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors bg-[#ffffff05] px-6 py-3 rounded-xl border border-admin-border"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Return to Registry
                    </button>
                    <div className="flex items-center gap-4">
                        <span className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border ${affiliate.status === 'active' ? 'bg-admin-green/10 text-admin-green border-admin-green/20' : 'bg-admin-red/10 text-admin-red border-admin-red/20'}`}>
                            Node Status: {affiliate.status}
                        </span>
                        <button
                            onClick={() => setShowPayoutModal(true)}
                            disabled={stats.withdrawableBalance <= 0}
                            className="bg-admin-red hover:bg-admin-red-dark text-white font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl transition-all shadow-lg shadow-admin-red/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center gap-3"
                        >
                            <PlusCircle className="h-5 w-5" />
                            Provision Payout
                        </button>
                    </div>
                </div>

                {/* Profile and Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Profile Card */}
                    <div className="bg-admin-card rounded-[2.5rem] p-10 shadow-admin border border-admin-border lg:col-span-1 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <User className="h-32 w-32 text-white" />
                        </div>
                        <div className="flex items-center gap-5 mb-10 relative">
                            <div className="h-16 w-16 bg-gradient-to-br from-admin-red to-admin-red-light rounded-2xl flex items-center justify-center text-white shadow-lg shadow-admin-red/40">
                                <User className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white leading-tight poppins">{affiliate.fullName}</h2>
                                <p className="text-[10px] font-black text-admin-accent uppercase tracking-widest mt-1">Tier {affiliate.currentTier} Accredited Partner</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative">
                            <div className="flex items-start gap-4 p-5 bg-[#ffffff03] rounded-2xl border border-[#ffffff05] hover:border-admin-accent/20 transition-all">
                                <Mail className="h-5 w-5 text-gray-600 mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Secure Channel</p>
                                    <p className="text-sm font-bold text-white">{affiliate.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-5 bg-[#ffffff03] rounded-2xl border border-[#ffffff05] hover:border-admin-accent/20 transition-all">
                                <Phone className="h-5 w-5 text-gray-600 mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Direct Comms</p>
                                    <p className="text-sm font-bold text-white">{affiliate.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-5 bg-admin-accent/5 rounded-2xl border border-admin-accent/10 hover:border-admin-accent/30 transition-all">
                                <Wallet className="h-5 w-5 text-admin-accent mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-admin-accent uppercase tracking-widest mb-2">Authenticated Wallets</p>
                                    <div className="space-y-2">
                                        {affiliate.instaPayNumber && (
                                            <p className="text-xs font-black text-white flex items-center gap-2">
                                                <span className="text-[9px] bg-admin-accent/20 px-1.5 rounded">IP</span>
                                                {affiliate.instaPayNumber}
                                            </p>
                                        )}
                                        {affiliate.walletNumber && (
                                            <p className="text-xs font-black text-white flex items-center gap-2">
                                                <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 rounded">W</span>
                                                {affiliate.walletNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-admin-card rounded-[2.5rem] p-8 shadow-admin border border-admin-border flex flex-col justify-between group hover:bg-[#ffffff05] transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5">
                                <TrendingUp className="h-16 w-16 text-white" />
                            </div>
                            <div className="flex items-center justify-between mb-6 relative">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Lifetime Yield</p>
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-blue-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-white poppins relative">{stats.totalEarned.toLocaleString()} <span className="text-xs text-gray-600 tracking-widest uppercase ml-1">EGP</span></p>
                            <p className="text-[9px] font-black text-gray-600 mt-4 uppercase tracking-widest relative">Aggregate gross commission flow</p>
                        </div>

                        <div className="bg-admin-card rounded-[2.5rem] p-8 shadow-admin border border-admin-border flex flex-col justify-between group hover:bg-[#ffffff05] transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5">
                                <Clock className="h-16 w-16 text-white" />
                            </div>
                            <div className="flex items-center justify-between mb-6 relative">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cooling Period</p>
                                <div className="p-2 bg-admin-accent/10 rounded-lg">
                                    <Clock className="h-5 w-5 text-admin-accent" />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-admin-accent poppins relative">{stats.pendingBalance.toLocaleString()} <span className="text-xs text-admin-accent/40 tracking-widest uppercase ml-1">EGP</span></p>
                            <p className="text-[9px] font-black text-gray-600 mt-4 uppercase tracking-widest relative">Assets in anti-fraud maturity</p>
                        </div>

                        <div className="bg-[#00f2c30a] rounded-[2.5rem] p-8 shadow-admin border border-admin-green/20 flex flex-col justify-between group hover:bg-[#00f2c312] transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5">
                                <CheckCircle2 className="h-16 w-16 text-admin-green" />
                            </div>
                            <div className="flex items-center justify-between mb-6 relative">
                                <p className="text-[10px] font-black text-admin-green uppercase tracking-widest">Liquid Assets</p>
                                <div className="p-2 bg-admin-green/20 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-admin-green" />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-admin-green poppins relative">{stats.withdrawableBalance.toLocaleString()} <span className="text-xs text-admin-green/40 tracking-widest uppercase ml-1">EGP</span></p>
                            <p className="text-[9px] font-black text-admin-green/60 mt-4 uppercase tracking-widest relative">Cleared for immediate remittance</p>
                        </div>

                        <div className="bg-admin-card rounded-[2.5rem] p-8 shadow-admin border border-admin-border flex flex-col justify-between bg-gradient-to-br from-admin-card to-[#1e2d4d22] group transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <FileText className="h-16 w-16 text-admin-text-secondary" />
                            </div>
                            <div className="flex items-center justify-between mb-6 relative">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Remitted</p>
                                <div className="p-2 bg-gray-800 rounded-lg">
                                    <FileText className="h-5 w-5 text-admin-text-secondary" />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-white poppins relative">{stats.paidOut.toLocaleString()} <span className="text-xs text-gray-700 tracking-widest uppercase ml-1">EGP</span></p>
                            <p className="text-[9px] font-black text-gray-600 mt-4 uppercase tracking-widest relative">Confirmed payout distribution</p>
                        </div>
                    </div>
                </div>

                {/* Referral History */}
                <div className="bg-admin-card rounded-[2.5rem] shadow-admin border border-admin-border overflow-hidden">
                    <div className="px-10 py-8 border-b border-[#ffffff05] flex items-center justify-between bg-[#ffffff02]">
                        <h3 className="text-lg font-black text-white uppercase tracking-widest poppins">Conversion Intel</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-admin-accent"></span>
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Verification</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-admin-green"></span>
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Synchronized</span>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#ffffff01]">
                                <tr className="text-left">
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest poppins">Trace ID</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest poppins">Timestamp</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest poppins">Maturity Status</th>
                                    <th className="px-10 py-6 text-right text-[10px] font-black text-gray-600 uppercase tracking-widest poppins">Yield</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-10 py-24 text-center">
                                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest italic">No conversion telemetry detected for this node</p>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-[#ffffff02] transition-colors border-b border-[#ffffff05] group">
                                            <td className="px-10 py-6">
                                                <button
                                                    onClick={() => navigate(`/admin/order/${tx.orderId}`)}
                                                    className="flex items-center gap-2 text-sm font-black text-white hover:text-admin-accent transition-colors poppins"
                                                >
                                                    #{tx.orderId.slice(-6).toUpperCase()}
                                                    <ExternalLink className="h-3 w-3 opacity-30 group-hover:opacity-100" />
                                                </button>
                                            </td>
                                            <td className="px-10 py-6">
                                                <p className="text-xs font-bold text-white uppercase tracking-tight">
                                                    {tx.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                                                </p>
                                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">{tx.createdAt?.toDate().toLocaleTimeString()}</p>
                                            </td>
                                            <td className="px-10 py-6">
                                                {tx.status === 'void' ? (
                                                    <span className="flex items-center gap-2 text-[9px] font-black text-admin-red bg-admin-red/10 px-3 py-1.5 rounded-lg uppercase tracking-widest w-fit border border-admin-red/20 shadow-lg shadow-admin-red/5">
                                                        <RotateCcw className="h-3 w-3" />
                                                        Distribution Terminated
                                                    </span>
                                                ) : tx.maturityStatus === 'ready' ? (
                                                    <span className="flex items-center gap-2 text-[9px] font-black text-admin-green bg-admin-green/10 px-3 py-1.5 rounded-lg uppercase tracking-widest w-fit border border-admin-green/20 shadow-lg shadow-admin-green/5">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Synced & Matured
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-[9px] font-black text-admin-accent bg-admin-accent/10 px-3 py-1.5 rounded-lg uppercase tracking-widest w-fit border border-admin-accent/20 shadow-lg shadow-admin-accent/5">
                                                        <Clock className="h-3 w-3" />
                                                        Maturity: {tx.daysLeft} Cycles Remaining
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <p className={`text-base font-black poppins ${tx.status === 'void' ? 'text-gray-800 line-through' : 'text-white'}`}>
                                                    {tx.commission.toLocaleString()} <span className="text-[9px] text-gray-600 ml-1">EGP</span>
                                                </p>
                                                <p className="text-[9px] text-admin-accent font-black uppercase tracking-widest mt-1">{tx.commissionRate * 100}% Allocation</p>
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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPayoutModal(false)}></div>
                    <div className="bg-admin-card rounded-[2.5rem] shadow-admin relative w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-admin-border">
                        <div className="bg-admin-red hover:bg-admin-red-dark p-10 text-white relative">
                            <h3 className="text-2xl font-black uppercase tracking-tight poppins">Remittance Order</h3>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-2">Provisioning funds for {affiliate.fullName.split(' ')[0]}</p>
                            <div className="absolute -bottom-6 -right-6 opacity-20">
                                <Wallet className="h-32 w-32" />
                            </div>
                        </div>
                        <form onSubmit={handleRecordPayout} className="p-10 space-y-8">
                            <div className="bg-admin-green/5 border border-admin-green/10 p-6 rounded-2xl shadow-inner group">
                                <p className="text-[9px] font-black text-admin-green uppercase tracking-widest mb-1">Authenticated Liquidity</p>
                                <p className="text-3xl font-black text-admin-green poppins group-hover:scale-105 transition-transform origin-left">{stats.withdrawableBalance.toLocaleString()} <span className="text-xs uppercase">EGP</span></p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Remittance Quantum</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-600 text-xs">EGP</span>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={stats.withdrawableBalance}
                                        value={payoutAmount}
                                        onChange={(e) => setPayoutAmount(e.target.value)}
                                        className="w-full pl-16 pr-6 py-5 bg-[#ffffff05] border border-admin-border rounded-2xl focus:ring-2 focus:ring-admin-accent focus:outline-none transition-all font-black text-xl text-white placeholder-gray-800"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-start gap-3 p-4 bg-[#ffffff02] rounded-xl border border-[#ffffff05]">
                                    <AlertCircle className="h-4 w-4 text-admin-accent mt-0.5 shrink-0" />
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                        Verify external distribution completion before committing to node ledger. Distribution is non-reversible.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={payoutLoading || !payoutAmount}
                                    className="w-full bg-admin-red hover:bg-admin-red-dark text-white font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-admin-red/40 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                                >
                                    {payoutLoading ? "Committing..." : "Authorize Distribution"}
                                    {!payoutLoading && <CheckCircle2 className="h-5 w-5" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPayoutModal(false)}
                                    className="w-full bg-transparent text-gray-600 font-black py-2 text-[10px] uppercase tracking-widest hover:text-white transition-all"
                                >
                                    Abort Operation
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
