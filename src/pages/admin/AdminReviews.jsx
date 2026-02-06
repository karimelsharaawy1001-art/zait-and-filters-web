import React, { useState, useEffect } from 'react';
import { databases, storage } from '../../appwrite';
import { Query, ID } from 'appwrite';
import {
    Star, Check, Trash2, Clock, User, Package, ExternalLink, Loader2, MessageSquare, AlertCircle, ShieldCheck, ThumbsUp, TrendingUp, Filter, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import AdminHeader from '../../components/AdminHeader';

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const REVIEWS_COLLECTION = import.meta.env.VITE_APPWRITE_REVIEWS_COLLECTION_ID || 'reviews';

    const fetchPendingReviews = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, REVIEWS_COLLECTION, [Query.equal('status', 'pending'), Query.orderDesc('$createdAt')]);
            setReviews(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) { toast.error("Moderation logs unreachable"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPendingReviews(); }, [DATABASE_ID]);

    const handleApprove = async (id) => {
        setActionId(id);
        try {
            await databases.updateDocument(DATABASE_ID, REVIEWS_COLLECTION, id, { status: 'approved' });
            setReviews(prev => prev.filter(r => r.id !== id));
            toast.success("Feedback loop authorized");
        } catch (error) { toast.error("Authorization failure"); }
        finally { setActionId(null); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge this feedback record?")) return;
        setActionId(id);
        try {
            await databases.deleteDocument(DATABASE_ID, REVIEWS_COLLECTION, id);
            setReviews(prev => prev.filter(r => r.id !== id));
            toast.success("Record purged");
        } catch (error) { toast.error("Purge failure"); }
        finally { setActionId(null); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Moderation Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Sentiment Registry</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Auditing {reviews.length} Pending Feedback Loops</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><MessageSquare size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Incoming</p><h3 className="text-2xl font-black italic">{reviews.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><ThumbsUp size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Avg Rating</p><h3 className="text-2xl font-black italic">4.8 <span className="text-[10px] opacity-40 italic">Global</span></h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">SLA Pace</p><h3 className="text-2xl font-black italic">2.4 <span className="text-[10px] opacity-40 italic">Hours</span></h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><TrendingUp size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Trend</p><h3 className="text-2xl font-black italic">+5.2%</h3></div></div>
                </div>

                {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div> : reviews.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed flex flex-col items-center">
                        <div className="bg-gray-50 p-10 rounded-full mb-8"><ShieldCheck className="h-12 w-12 text-gray-300" /></div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Frequency Stabilized</h2>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-4">All sentiment protocols have been audited</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {reviews.map(rev => (
                            <div key={rev.id} className="bg-white rounded-[3rem] border shadow-sm overflow-hidden flex flex-col md:flex-row group transition-all duration-500 hover:scale-[1.02] hover:border-black">
                                <div className="md:w-56 h-56 md:h-auto flex-shrink-0 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                                    {rev.photoUrl ? <img src={rev.photoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" /> : <AlertCircle className="w-12 h-12 opacity-10" />}
                                    <div className="absolute top-4 left-4 flex gap-1 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-2xl">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-2.5 w-2.5 ${s <= rev.rating ? 'fill-red-600 text-red-600' : 'text-white/20'}`} />)}
                                    </div>
                                </div>
                                <div className="flex-1 p-10 flex flex-col justify-between space-y-8">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 group-hover:bg-black group-hover:text-white transition-all uppercase">{rev.userName?.[0]}</div>
                                                <div><h4 className="font-black text-sm uppercase italic">{rev.userName}</h4><p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Behavioral Signature</p></div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex items-center gap-4"><Package size={16} className="text-orange-600" /><Link to={`/product/${rev.productId}`} className="text-[10px] font-black uppercase italic hover:underline truncate">{rev.productName}</Link><ExternalLink size={12} className="text-gray-300 ml-auto" /></div>
                                        <div className="relative"><p className="text-sm font-bold leading-relaxed italic text-gray-600 line-clamp-3">"{rev.comment}"</p></div>
                                    </div>
                                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                        <div className="flex items-center gap-3 text-[9px] font-black uppercase text-gray-400 tracking-widest"><Clock size={12} /> {new Date(rev.$createdAt).toLocaleString()}</div>
                                        <div className="flex gap-3">
                                            <button onClick={() => handleApprove(rev.id)} disabled={actionId === rev.id} className="p-3 bg-green-50 text-green-600 border border-green-100 rounded-xl shadow-lg hover:bg-green-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"><Check size={18} /></button>
                                            <button onClick={() => handleDelete(rev.id)} disabled={actionId === rev.id} className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl shadow-lg hover:bg-red-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminReviews;
