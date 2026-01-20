import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Lock, Loader2 } from 'lucide-react';

const TrustPaymentSection = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActiveMethods = async () => {
            try {
                // Fetch ALL to avoid any potential indexing issues with query filtering/ordering
                const querySnapshot = await getDocs(collection(db, 'payment_methods'));
                const allMethods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter and sort in memory for maximum reliability
                const active = allMethods
                    .filter(m => m.isActive === true)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                setMethods(active);
            } catch (error) {
                console.error("Error fetching payment methods:", error);
                setMethods([]); // Ensure it's not stuck
            } finally {
                setLoading(false);
            }
        };

        fetchActiveMethods();
    }, []);

    if (loading) return null; // Keep it clean during load
    if (methods.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Lock size={14} className="text-gray-400" />
                <span className="text-[13px] font-black text-gray-800 uppercase tracking-tight">طرق دفع وتقسيط متاحة</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
                {methods.map((method) => (
                    <div
                        key={method.id}
                        className="bg-white p-1 rounded-lg border border-gray-50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-110 flex items-center justify-center"
                        style={{ height: '30px', minWidth: '50px' }}
                    >
                        <img
                            src={method.logoUrl}
                            alt={method.name}
                            className="h-full w-auto object-contain"
                            title={method.name}
                            loading="lazy"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.style.display = 'none';
                            }}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-orange-600 font-black text-[11px] uppercase tracking-widest bg-orange-50/50 py-2 rounded-xl border border-orange-100/50">
                <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
                توصيل خلال 2-5 أيام عمل
            </div>
        </div>
    );
};

export default TrustPaymentSection;
