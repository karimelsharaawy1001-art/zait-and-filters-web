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
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900">Review Moderation</h1>
                <p className="text-gray-500 font-medium">Manage and approve customer product reviews.</p>
            </div>

            {reviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 flex flex-col items-center">
                    <div className="bg-orange-50 p-6 rounded-full mb-6">
                        <MessageSquare className="h-10 w-10 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">All caught up!</h2>
                    <p className="text-gray-500 mt-2">There are no pending reviews to moderate.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {reviews.map((rev) => (
                        <div key={rev.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                            {/* Photo (If exists) */}
                            {rev.photoUrl ? (
                                <div className="md:w-48 h-48 md:h-auto flex-shrink-0 bg-gray-50">
                                    <img src={rev.photoUrl} alt="Review" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="md:w-48 h-48 md:h-auto flex-shrink-0 bg-gray-50 flex items-center justify-center text-gray-300">
                                    <AlertCircle className="w-10 h-10" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-black text-gray-900">{rev.userName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-gray-400" />
                                                <Link to={`/product/${rev.productId}`} className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1">
                                                    {rev.productName}
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`h-4 w-4 ${s <= rev.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-gray-600 text-sm font-medium italic mb-4">
                                        "{rev.comment}"
                                    </p>

                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        {rev.createdAt?.toDate().toLocaleString()}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => handleApprove(rev.id)}
                                        disabled={actionId === rev.id}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {actionId === rev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rev)}
                                        disabled={actionId === rev.id}
                                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {actionId === rev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Delete
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
