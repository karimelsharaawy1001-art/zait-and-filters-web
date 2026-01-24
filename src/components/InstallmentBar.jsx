import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const PARTNERS = [
    { id: 'valu', name: 'Valu', logo: 'https://v-valu.com/assets/images/valu-logo.png' },
    { id: 'aman', name: 'Aman', logo: 'https://www.amancontent.com/uploads/aman_logo_89d38c6416.png' },
    { id: 'souhoola', name: 'Souhoola', logo: 'https://www.souhoola.com/assets/img/logo.png' },
    { id: 'takkah', name: 'Takkah', logo: 'https://takkah.com.eg/static/media/logo.2e66699a.svg' },
    { id: 'lucky', name: 'Lucky', logo: 'https://lucky.app/static/media/lucky-logo.e7e7e7e7.png' }
];

const InstallmentBar = ({ price = 0, showCalculator = false, forceActive = null }) => {
    const [enabledPartners, setEnabledPartners] = useState(forceActive || {});
    const [loading, setLoading] = useState(!forceActive);

    useEffect(() => {
        if (forceActive) {
            setEnabledPartners(forceActive);
            setLoading(false);
            return;
        }

        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'integrations');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEnabledPartners(docSnap.data().installmentPartners || {});
                }
            } catch (error) {
                console.error("Error fetching installment settings for bar:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [forceActive]);

    const activePartners = PARTNERS.filter(p => enabledPartners[p.id]);

    if (loading || activePartners.length === 0) return null;

    const installmentPrice = Math.round(price / 12);

    return (
        <div className="space-y-4">
            {showCalculator && price > 1000 && (
                <div className="bg-[#008a40]/5 border border-[#008a40]/10 rounded-2xl p-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                        تقدر تقسطه من خلال شركات التقسيط بداية من <span className="text-[#008a40] text-lg font-black">{installmentPrice}</span> جنيه في الشهر
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex flex-wrap items-center gap-4">
                    {activePartners.map(partner => (
                        <div key={partner.id} className="h-6 w-auto flex items-center justify-center grayscale hover:grayscale-0 transition-all">
                            <img
                                src={partner.logo}
                                alt={partner.name}
                                className="max-h-full max-w-[80px] object-contain"
                                title={partner.name}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InstallmentBar;
