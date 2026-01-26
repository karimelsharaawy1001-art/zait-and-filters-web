import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import {
    ref,
    deleteObject
} from 'firebase/storage';
import { db, storage } from '../../firebase';
import {
    Star,
    Check,
    Trash2,
    Clock,
    User,
    Package,
    ExternalLink,
    Loader2,
    MessageSquare,
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { getOptimizedImage } from '../../utils/cloudinaryUtils';

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    useEffect(() => {
        const q = query(
            collection(db, 'reviews'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pendingList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReviews(pendingList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reviews:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApprove = async (id) => {
        setActionId(id);
        try {
            await updateDoc(doc(db, 'reviews', id), {
                status: 'approved'
            });
            toast.success("Review approved successfully!");
        } catch (error) {
            console.error("Error approving review:", error);
            toast.error("Failed to approve review.");
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (review) => {
        if (!window.confirm("Are you sure you want to permanently delete this review?")) return;

        setActionId(review.id);
        try {
            // 1. Delete photo from Storage if exists
            if (review.photoUrl) {
                try {
                    // Extract path from URL or use a structured path if known
                    // Simplified: just try to delete if URL exists
                    const photoRef = ref(storage, review.photoUrl);
                    await deleteObject(photoRef);
                } catch (err) {
                    console.warn("Could not delete photo from storage (might already be gone):", err);
                }
            }

            // 2. Delete document from Firestore
            await deleteDoc(doc(db, 'reviews', review.id));
            toast.success("Review deleted.");
        } catch (error) {
            console.error("Error deleting review:", error);
            toast.error("Failed to delete review.");
        } finally {
            setActionId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing moderation node...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="mb-12">
                <h1 className="text-4xl font-black text-white tracking-tight uppercase poppins">Moderation Hub</h1>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Audit and authorize customer feedback loops</p>
            </div>

            {reviews.length === 0 ? (
                <div className="bg-admin-card rounded-[2.5rem] p-20 text-center border border-admin-border flex flex-col items-center shadow-admin mt-10">
                    <div className="bg-[#ffffff05] p-10 rounded-full mb-8 border border-admin-border">
                        <MessageSquare className="h-12 w-12 text-gray-700" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight poppins">Frequency Stabilized</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-4">All pending reviews have been processed</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-10">
                    {reviews.map((rev) => (
                        <div key={rev.id} className="bg-admin-card rounded-[2.5rem] border border-admin-border shadow-admin overflow-hidden flex flex-col md:flex-row group transition-all duration-500 hover:scale-[1.01]">
                            {/* Photo (If exists) */}
                            {rev.photoUrl ? (
                                <div className="md:w-56 h-56 md:h-auto flex-shrink-0 bg-[#ffffff03] relative overflow-hidden">
                                    <img src={getOptimizedImage(rev.photoUrl, 'f_auto,q_auto,w_600')} alt={`Review by ${rev.userName}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-admin-bg/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </div>
                            ) : (
                                <div className="md:w-56 h-56 md:h-auto flex-shrink-0 bg-[#ffffff03] flex items-center justify-center text-gray-700 border-r border-[#ffffff0d]">
                                    <AlertCircle className="w-12 h-12 opacity-20" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 p-8 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-1.5 bg-admin-accent/10 rounded-lg">
                                                    <User className="w-4 h-4 text-admin-accent" />
                                                </div>
                                                <span className="text-[11px] font-black text-white uppercase tracking-widest">{rev.userName}</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-[#ffffff03] px-3 py-2 rounded-xl border border-admin-border">
                                                <Package className="w-3.5 h-3.5 text-gray-500" />
                                                <Link to={`/product/${rev.productId}`} className="text-[9px] font-black text-admin-accent hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
                                                    {rev.productName}
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`h-3.5 w-3.5 ${s <= rev.rating ? 'fill-admin-accent text-admin-accent' : 'text-gray-800'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="relative mb-6">
                                        <MessageSquare className="absolute -top-2 -left-2 w-8 h-8 text-white/5" />
                                        <p className="text-admin-text-secondary text-sm font-bold leading-relaxed italic relative">
                                            "{rev.comment}"
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <Clock className="w-3.5 h-3.5" />
                                        {rev.createdAt?.toDate().toLocaleString()}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => handleApprove(rev.id)}
                                        disabled={actionId === rev.id}
                                        className="flex-1 bg-admin-accent/10 hover:bg-admin-accent text-admin-accent hover:text-white border border-admin-accent/20 rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-50"
                                    >
                                        {actionId === rev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Authorize
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rev)}
                                        disabled={actionId === rev.id}
                                        className="flex-1 bg-admin-red/10 hover:bg-admin-red text-admin-red hover:text-white border border-admin-red/20 rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-50"
                                    >
                                        {actionId === rev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Purge
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminReviews;
