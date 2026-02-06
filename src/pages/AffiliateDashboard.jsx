import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    Copy,
    CheckCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Wallet,
    Settings,
    ShieldCheck,
    LogOut
} from 'lucide-react';

const AffiliateDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // State Declarations
    const [user, setUser] = useState(null);
    const [affiliate, setAffiliate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [copied, setCopied] = useState(false);
    const [updatingPayout, setUpdatingPayout] = useState(false);

    const [stats, setStats] = useState({
        totalSales: 0,
        totalEarnings: 0,
        withdrawableBalance: 0,
        pendingBalance: 0,
        commissionPercentage: 5
    });

    const [payoutData, setPayoutData] = useState({
        instaPayNumber: '',
        walletNumber: ''
    });

    // Auth & Data Fetching Effect
    useEffect(() => {
        let mounted = true;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!mounted) return;

            if (currentUser) {
                setUser(currentUser);
                try {
                    await fetchAffiliate(currentUser.uid);
                } catch (error) {
                    console.error("Fetch Affiliate Error:", error);
                }
            } else {
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    const fetchAffiliate = async (uid) => {
        try {
            const affDoc = await getDoc(doc(db, 'affiliates', uid));
            if (affDoc.exists()) {
                const data = { id: affDoc.id, ...affDoc.data() };
                setAffiliate(data);
                setPayoutData({
                    instaPayNumber: data.instaPayNumber || '',
                    walletNumber: data.walletNumber || ''
                });
                await fetchTransactions(affDoc.id, data);
            }
        } catch (error) {
            console.error("Error fetching affiliate data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async (affId, affData) => {
        try {
            const q = query(
                collection(db, `affiliates/${affId}/transactions`),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(list);

            const now = new Date();
            const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

            let withdrawable = 0;
            let pending = 0;

            list.forEach(tx => {
                let txDate = getSafeDate(tx.createdAt);

                if (txDate && !isNaN(txDate.getTime()) && txDate < fourteenDaysAgo) {
                    withdrawable += tx.commission || 0;
                } else {
                    pending += tx.commission || 0;
                }
            });

            setStats({
                totalSales: affData.referralCount || 0,
                totalEarnings: affData.totalEarnings || 0,
                withdrawableBalance: withdrawable,
                pendingBalance: pending,
                commissionPercentage: affData.commissionPercentage || 5
            });
        } catch (error) {
            console.error("Error fetching transactions:", error);
        }
    };

    const getSafeDate = (dateField) => {
        if (dateField?.toDate && typeof dateField.toDate === 'function') {
            return dateField.toDate();
        } else if (dateField instanceof Date) {
            return dateField;
        } else if (dateField) {
            return new Date(dateField);
        }
        return null;
    };

    const handleUpdatePayout = async (e) => {
        e.preventDefault();
        if (!payoutData.instaPayNumber.trim() && !payoutData.walletNumber.trim()) {
            toast.error("Please provide at least one payout method.");
            return;
        }

        setUpdatingPayout(true);
        try {
            await updateDoc(doc(db, 'affiliates', user.uid), {
                instaPayNumber: payoutData.instaPayNumber,
                walletNumber: payoutData.walletNumber
            });
            setAffiliate(prev => ({ ...prev, ...payoutData }));
            setShowSettings(false);
            toast.success("Payout details updated successfully!");
        } catch (error) {
            console.error("Error updating payout details:", error);
            toast.error("Failed to update payout details.");
        } finally {
            setUpdatingPayout(false);
        }
    };

    const copyLink = () => {
        if (!affiliate?.referralCode) return;
        const link = `https://zaitandfilters.com/?ref=${affiliate.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const getTierInfo = () => {
        if (!affiliate) return null;
        const sales = affiliate.referralCount || 0;
        if (sales < 10) return { next: 10, perc: 7, diff: 10 - sales };
        if (sales < 30) return { next: 30, perc: 10, diff: 30 - sales };
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!affiliate) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <AlertCircle className="h-12 w-12 text-orange-600 mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">ACCESS DENIED</h2>
            <p className="text-gray-500 mb-6">You are not registered as an affiliate.</p>
            <button onClick={() => window.location.href = '/affiliate-register'} className="bg-orange-600 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest text-xs">Join Program</button>
        </div>
    );

    const tier = getTierInfo();
    const progress = tier ? Math.min(100, ((affiliate.referralCount || 0) / tier.next) * 100) : 100;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-[0.2em] text-xs mb-2">
                            <ShieldCheck className="h-4 w-4" />
                            {t('partnerTier', { tier: affiliate.currentTier || 1 })}
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">
                            {t('welcome', { name: affiliate.fullName?.split(' ')[0] || 'Partner' })}
                        </h1>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-lg hover:bg-red-100 transition-all w-full md:w-auto"
                        >
                            <LogOut className="h-4 w-4" />
                            {t('signOut')}
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="flex items-center gap-2 font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl bg-white text-gray-900 border border-gray-100 shadow-xl hover:bg-gray-50 transition-all w-full md:w-auto"
                        >
                            <Settings className="h-4 w-4" />
                            {t('payoutSettings')}
                        </button>
                        <div className="bg-white p-2 rounded-2xl shadow-xl flex items-center gap-4 border border-gray-100 pr-6 w-full md:w-auto">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono font-bold text-gray-800 flex-1 md:min-w-[200px] text-sm overflow-hidden truncate">
                                https://zaitandfilters.com/?ref={affiliate.referralCode}
                            </div>
                            <button
                                onClick={copyLink}
                                className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-900 text-white hover:bg-black'}`}
                            >
                                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? t('linkCopied') : t('copyLink')}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Promo Code Coupon Section */}
                <div className="mb-10 max-w-2xl mx-auto">
                    <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl p-6 sm:p-8 relative group hover:border-gray-400 transition-all">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="text-center sm:text-right flex-1">
                                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                                    كود الخصم: خصم 5% لعملائك
                                </span>
                                <h3 className="text-3xl sm:text-4xl font-black text-[#000000] tracking-widest uppercase font-mono mb-2">
                                    {affiliate.referralCode || 'AFF5'}
                                </h3>
                                <p className="text-xs font-bold text-gray-500">
                                    هذا الكود يمنح العميل خصم 5% على جميع المنتجات
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(affiliate.referralCode || 'AFF5');
                                    const btn = document.getElementById('copy-coupon-btn');
                                    if (btn) {
                                        const originalText = btn.innerHTML;
                                        btn.innerHTML = `<span class="flex items-center gap-2">Copied! <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>`;
                                        btn.classList.remove('bg-black', 'text-white');
                                        btn.classList.add('bg-green-600', 'text-white');
                                        setTimeout(() => {
                                            btn.innerHTML = originalText;
                                            btn.classList.add('bg-black', 'text-white');
                                            btn.classList.remove('bg-green-600');
                                        }, 2000);
                                    }
                                }}
                                id="copy-coupon-btn"
                                className="shrink-0 bg-black text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center min-w-[140px]"
                            >
                                <span className="flex items-center gap-2">
                                    Copy / نسخ
                                    <Copy className="h-4 w-4" />
                                </span>
                            </button>
                        </div>

                        {/* Decorative Scissors/Cut Line */}
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-50 rounded-full border-r-2 border-gray-300 hidden sm:block"></div>
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-50 rounded-full border-l-2 border-gray-300 hidden sm:block"></div>
                    </div>
                </div>

                {/* Policy Disclaimer */}
                <div className="mb-10 bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                    <div className="bg-blue-600 p-4 rounded-2xl text-white flex-shrink-0">
                        <AlertCircle className="h-8 w-8" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <p className="text-blue-900 font-black text-lg mb-1 leading-tight">
                            {t('commissionPolicy')}
                        </p>
                    </div>
                </div>

                {/* Settings Section (Conditional) */}
                {showSettings && (
                    <div className="mb-10 bg-white rounded-3xl shadow-2xl p-8 border-2 border-orange-100 animate-in fade-in slide-in-from-top-4 duration-300">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                            <Wallet className="h-6 w-6 text-orange-600" />
                            {t('payoutSettings')}
                        </h3>
                        <form onSubmit={handleUpdatePayout} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">{t('instaPay')}</label>
                                <input
                                    type="text"
                                    value={payoutData.instaPayNumber}
                                    onChange={(e) => setPayoutData({ ...payoutData, instaPayNumber: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder:text-gray-400"
                                    placeholder="username@instapay"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">{t('mobileWallet')}</label>
                                <input
                                    type="text"
                                    value={payoutData.walletNumber}
                                    onChange={(e) => setPayoutData({ ...payoutData, walletNumber: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:outline-none transition-all font-bold text-black placeholder:text-gray-400"
                                    placeholder="01xxxxxxxxx"
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-4 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSettings(false)}
                                    className="px-8 py-4 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingPayout}
                                    className="bg-orange-600 text-white font-black px-10 py-4 rounded-xl hover:bg-orange-700 transition-all shadow-xl hover:shadow-orange-200 disabled:opacity-50 uppercase tracking-widest text-xs"
                                >
                                    {updatingPayout ? 'Updating...' : t('savePayout')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Gamification Progress */}
                {tier && (
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-12 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">{t('earningsBoost')}</h3>
                                <p className="text-gray-500 font-medium">
                                    {t('salesAway', { count: tier.diff, perc: tier.perc })}
                                </p>
                            </div>
                            <div className="w-full md:w-64">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                    <span>Progress</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <TrendingUp className="h-32 w-32" />
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp className="h-20 w-20" />
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{t('totalSales')}</p>
                        <h3 className="text-4xl font-black text-gray-900">{stats.totalSales}</h3>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Clock className="h-20 w-20" />
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{t('pendingBalance')}</p>
                        <div className="flex items-end gap-1">
                            <h3 className="text-4xl font-black text-gray-400">{stats.pendingBalance.toLocaleString()}</h3>
                            <span className="text-xs font-black text-gray-400 mb-1">EGP</span>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Wallet className="h-20 w-20" />
                        </div>
                        <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            {t('withdrawable')}
                            <CheckCircle className="h-3 w-3" />
                        </p>
                        <div className="flex items-end gap-1">
                            <h3 className="text-4xl font-black text-orange-600">{stats.withdrawableBalance.toLocaleString()}</h3>
                            <span className="text-xs font-black text-orange-400 mb-1">EGP</span>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CheckCircle className="h-20 w-20" />
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{t('yourCommission')}</p>
                        <h3 className="text-4xl font-black text-gray-900">{stats.commissionPercentage}%</h3>
                    </div>
                </div>

                {/* History */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{t('myOrders')}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('orderId')}</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('date')}</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('amount')}</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{t('yourCommission')}</th>
                                    <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.length > 0 ? transactions.map((tx) => {
                                    const now = new Date();
                                    const txDate = getSafeDate(tx.createdAt);
                                    const isWithdrawable = txDate && !isNaN(txDate.getTime()) && (now.getTime() - txDate.getTime()) > (14 * 24 * 60 * 60 * 1000);

                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <span className="font-mono font-bold text-gray-800 text-sm">{tx.orderId?.substring(0, 8)}...</span>
                                            </td>
                                            <td className="px-8 py-6 text-sm text-gray-500 font-medium">
                                                {txDate?.toLocaleDateString()}
                                            </td>
                                            <td className="px-8 py-6 font-bold text-gray-900">
                                                {tx.amount?.toLocaleString()} <span className="text-[10px] text-gray-400">EGP</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`flex items-center gap-1.5 font-black ${isWithdrawable ? 'text-orange-600' : 'text-gray-400'}`}>
                                                    +{tx.commission?.toLocaleString()}
                                                    <span className="text-[10px]">EGP</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest 
                                                    ${isWithdrawable ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {isWithdrawable ? t('withdrawable') : t('paymentPending')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                                            {t('noCommissions')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AffiliateDashboard;
