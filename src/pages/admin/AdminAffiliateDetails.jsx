import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft, User, Mail, Phone, Wallet, Clock, TrendingUp, CheckCircle2, AlertCircle, RotateCcw, FileText, ExternalLink, PlusCircle, Loader2, ShieldCheck, Activity, Award, BarChart3, Receipt, Landmark
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const AdminAffiliateDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [affiliate, setAffiliate] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ totalEarned: 0, pendingBalance: 0, withdrawableBalance: 0, paidOut: 0 });
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutLoading, setPayoutLoading] = useState(false);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const AFFILIATES_COLLECTION = import.meta.env.VITE_APPWRITE_AFFILIATES_COLLECTION_ID || 'affiliates';
    const AFF_TRANS_COLLECTION = import.meta.env.VITE_APPWRITE_AFFILIATE_TRANSACTIONS_COLLECTION_ID || 'affiliate_transactions';
    const PAYOUTS_COLLECTION = import.meta.env.VITE_APPWRITE_PAYOUTS_COLLECTION_ID || 'payouts';

    const fetchData = async () => {
        if (!DATABASE_ID || !AFFILIATES_COLLECTION) return;
        setLoading(true);
        try {
            const affDoc = await databases.getDocument(DATABASE_ID, AFFILIATES_COLLECTION, id);
            setAffiliate(affDoc);
            const transRes = await databases.listDocuments(DATABASE_ID, AFF_TRANS_COLLECTION, [Query.equal('affiliateId', id), Query.orderDesc('$createdAt'), Query.limit(100)]);
            const transList = transRes.documents.map(d => ({ id: d.$id, ...d }));
            let earned = 0; let matureTotal = 0; const now = new Date();
            transList.forEach(tx => {
                if (tx.status === 'void') return;
                earned += tx.commission;
                const created = new Date(tx.$createdAt);
                const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
                if (diffDays >= 14) { tx.maturityStatus = 'ready'; matureTotal += tx.commission; }
                else { tx.maturityStatus = 'cooling'; tx.daysLeft = 14 - diffDays; }
            });
            const totalPaid = affDoc.totalPaid || 0;
            setStats({ totalEarned: affDoc.totalEarnings || 0, pendingBalance: (affDoc.totalEarnings || 0) - matureTotal, withdrawableBalance: Math.max(0, matureTotal - totalPaid), paidOut: totalPaid });
            setTransactions(transList);
        } catch (error) { toast.error("Partnership intelligence failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [id, DATABASE_ID]);

    const handleRecordPayout = async (e) => {
        e.preventDefault();
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0 || amount > stats.withdrawableBalance) { toast.error("Invalid quantum"); return; }
        setPayoutLoading(true);
        try {
            await databases.createDocument(DATABASE_ID, PAYOUTS_COLLECTION, ID.unique(), {
                affiliateId: id, amount: amount, method: affiliate.instaPayNumber ? 'InstaPay' : 'Mobile Wallet', recipientInfo: affiliate.instaPayNumber || affiliate.walletNumber, status: 'completed', createdAt: new Date().toISOString()
            });
            await databases.updateDocument(DATABASE_ID, AFFILIATES_COLLECTION, id, { totalPaid: (affiliate.totalPaid || 0) + amount });
            setShowPayoutModal(false); setPayoutAmount(''); fetchData(); toast.success("Settlement committed");
        } catch (error) { toast.error("Sync failure"); }
        finally { setPayoutLoading(false); }
    };

    if (loading) return <div className="p-20 text-center uppercase font-black text-[10px] text-gray-400 font-Cairo"><Loader2 className="animate-spin mx-auto mb-4" /> Analyzing Digital Footprint...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title={`Partnership Diagnostic: ${affiliate.referralCode}`} />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => navigate('/admin/affiliates')} className="bg-white px-6 py-3 rounded-xl border font-black uppercase italic text-[10px] shadow-sm flex items-center gap-2 hover:bg-black hover:text-white transition-all"><ArrowLeft size={14} /> Network Index</button>
                    <div className="flex gap-4">
                        <span className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase border shadow-sm ${affiliate.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{affiliate.status === 'active' ? 'Operational' : 'Restricted'}</span>
                        <button onClick={() => setShowPayoutModal(true)} disabled={stats.withdrawableBalance <= 100} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase italic text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"><Receipt size={16} /> Settle Assets</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                    <section className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8 flex flex-col justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gray-100 rounded-[2.5rem] flex items-center justify-center font-black text-3xl text-gray-400 group-hover:bg-black group-hover:text-white transition-all uppercase shadow-inner">{affiliate.fullName?.[0]}</div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">{affiliate.fullName}</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">Tier {affiliate.currentTier} Strategist <Award size={10} className="text-orange-600" /></p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-5 bg-gray-50 rounded-2xl border border-dashed"><p className="text-[10px] font-black text-gray-400 uppercase mb-2">Registry Relays</p><div className="space-y-2"><p className="text-sm font-black italic flex items-center gap-2 truncate"><Mail size={14} className="text-red-600" /> {affiliate.email}</p><p className="text-sm font-black italic flex items-center gap-2"><Phone size={14} className="text-red-600" /> {affiliate.phone || 'Silent'}</p></div></div>
                            <div className="p-5 bg-black text-white rounded-2xl shadow-xl"><p className="text-[10px] font-black text-red-600 uppercase mb-3 text-center">Authorized Wallets</p><div className="grid grid-cols-2 gap-4">
                                {affiliate.instaPayNumber ? <div className="text-center p-3 bg-white/10 rounded-xl"><p className="text-[8px] font-black uppercase opacity-50 mb-1">InstaPay</p><p className="text-[10px] font-black truncate">{affiliate.instaPayNumber}</p></div> : <div className="text-center p-3 opacity-20"><p className="text-[8px] font-black uppercase">NO IP LINK</p></div>}
                                {affiliate.walletNumber ? <div className="text-center p-3 bg-white/10 rounded-xl"><p className="text-[8px] font-black uppercase opacity-50 mb-1">Mobile</p><p className="text-[10px] font-black truncate">{affiliate.walletNumber}</p></div> : <div className="text-center p-3 opacity-20"><p className="text-[8px] font-black uppercase">NO WALLET</p></div>}
                            </div></div>
                        </div>
                    </section>

                    <section className="lg:col-span-2 grid grid-cols-2 gap-8">
                        <div className="bg-white p-10 rounded-[3rem] border shadow-sm relative overflow-hidden group hover:border-black transition-all">
                            <div className="flex justify-between items-start"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Intelligence</p><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div></div>
                            <h3 className="text-4xl font-black italic mt-6">{stats.totalEarned.toLocaleString()} <span className="text-[10px] not-italic opacity-40">EGP</span></h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-4">Lifetime Generated Capital</p>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all"><BarChart3 size={150} /></div>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border shadow-sm relative overflow-hidden group hover:border-black transition-all">
                            <div className="flex justify-between items-start"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maturity Pipeline</p><div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Clock size={20} /></div></div>
                            <h3 className="text-4xl font-black italic mt-6">{stats.pendingBalance.toLocaleString()} <span className="text-[10px] not-italic opacity-40">EGP</span></h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-4">Assets in Cooling Cycle</p>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all"><RotateCcw size={150} /></div>
                        </div>
                        <div className="bg-red-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden scale-[1.02] transform transition-all hover:scale-105">
                            <div className="flex justify-between items-start"><p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Liquid Reserve</p><div className="p-2 bg-white/20 rounded-lg"><CheckCircle2 size={20} /></div></div>
                            <h3 className="text-5xl font-black italic mt-6">{stats.withdrawableBalance.toLocaleString()} <span className="text-xs opacity-50 not-italic ml-2">EGP</span></h3>
                            <p className="text-[9px] font-bold text-black/40 uppercase mt-6 font-black">Settlement Authorization Enabled</p>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.1]"><Landmark size={150} /></div>
                        </div>
                        <div className="bg-black p-10 rounded-[3rem] text-white shadow-sm relative overflow-hidden group">
                            <div className="flex justify-between items-start"><p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Settled Assets</p><div className="p-2 bg-white/10 rounded-lg"><FileText size={20} /></div></div>
                            <h3 className="text-4xl font-black italic mt-6">{stats.paidOut.toLocaleString()} <span className="text-[10px] not-italic opacity-40">EGP</span></h3>
                            <p className="text-[9px] font-bold text-gray-500 uppercase mt-4">Transferred Registry Total</p>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.05]"><Activity size={150} /></div>
                        </div>
                    </section>
                </div>

                <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
                    <div className="p-10 border-b bg-gray-50/50 flex items-center justify-between"><div className="flex items-center gap-4"><Receipt className="text-red-600" /><h3 className="text-xl font-black uppercase italic">Conversion Registry</h3></div><span className="text-[10px] font-black uppercase bg-black text-white px-5 py-2 rounded-full shadow-lg">{transactions.length} Trace Logs</span></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-10 py-6">Operational ID</th>
                                    <th className="px-10 py-6">Temporal Stamp</th>
                                    <th className="px-10 py-6 text-center">Security State</th>
                                    <th className="px-10 py-6 text-right">Yield Capital</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-10 py-8">
                                            <button onClick={() => navigate(`/admin/order/${tx.orderId}`)} className="flex items-center gap-3 group/btn">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-[10px] group-hover/btn:bg-black group-hover/btn:text-white transition-all shadow-sm">#{tx.orderId.slice(-6).toUpperCase()}</div>
                                                <span className="text-xs font-black uppercase italic group-hover/btn:underline flex items-center gap-1">Trace Order <ExternalLink size={10} /></span>
                                            </button>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="text-sm font-black italic">{new Date(tx.$createdAt).toLocaleDateString()}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{new Date(tx.$createdAt).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            {tx.status === 'void' ? <span className="bg-red-50 text-red-600 px-5 py-2 rounded-xl text-[9px] font-black uppercase border border-red-100 italic shadow-sm">Terminated</span> :
                                                tx.maturityStatus === 'ready' ? <span className="bg-green-50 text-green-600 px-5 py-2 rounded-xl text-[9px] font-black uppercase border border-green-100 italic shadow-sm">Matured</span> :
                                                    <span className="bg-orange-50 text-orange-600 px-5 py-2 rounded-xl text-[9px] font-black uppercase border border-orange-100 italic shadow-sm">Cooling: {tx.daysLeft}d left</span>}
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <span className="text-lg font-black italic">{tx.commission?.toLocaleString()} <span className="text-[10px] not-italic opacity-40 ml-1">EGP</span></span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {showPayoutModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPayoutModal(false)}></div>
                    <div className="bg-white rounded-[3.5rem] w-full max-w-lg relative overflow-hidden flex flex-col shadow-2xl border-4 border-black">
                        <div className="bg-black p-12 text-white"><h3 className="text-2xl font-black uppercase italic tracking-wider">Settlement Provision</h3><p className="text-[10px] text-red-600 font-black uppercase tracking-[0.3em] mt-2">Financial Protocol Authorization</p></div>
                        <form onSubmit={handleRecordPayout} className="p-12 space-y-10">
                            <div className="bg-green-600 p-8 rounded-[2.5rem] text-white text-center shadow-inner relative overflow-hidden">
                                <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mb-4">Deployable Liquid Quantum</p>
                                <p className="text-4xl font-black italic">{stats.withdrawableBalance.toLocaleString()} <span className="text-xs opacity-50 not-italic">EGP</span></p>
                                <div className="absolute -right-4 bottom-0 opacity-10"><Wallet size={100} /></div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Remittance Value</label>
                                <div className="relative"><input type="number" required min="1" max={stats.withdrawableBalance} value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className="w-full p-8 bg-gray-50 border-2 rounded-[2rem] font-black text-4xl italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all text-center" placeholder="0.00" /><span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">EGP</span></div>
                                <p className="text-[9px] text-gray-400 font-bold italic text-center">Funds will be remitited via: <span className="text-black">{affiliate.instaPayNumber ? 'InstaPay Secure Relay' : 'Mobile Digital Wallet'}</span></p>
                            </div>
                            <button type="submit" disabled={payoutLoading} className="w-full bg-red-600 text-white py-6 rounded-[2rem] font-black uppercase italic text-sm shadow-2xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3">{payoutLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />} {payoutLoading ? 'Committing Settlement...' : 'Authorize Remittance'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAffiliateDetails;
