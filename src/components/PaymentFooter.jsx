import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const PaymentFooter = () => {
    const [methods, setMethods] = useState([]);

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'payment_methods'));
                const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMethods(list);
            } catch (error) {
                console.error("Error fetching payment methods:", error);
            }
        };
        fetchMethods();
    }, []);

    if (methods.length === 0) return null;

    return (
        <div className="flex flex-wrap justify-center items-center gap-4 mt-8 pt-6 border-t border-gray-100/10">
            {methods.map((method) => (
                <div key={method.id} className="h-6 md:h-8 flex items-center group" title={method.name}>
                    <img
                        src={method.imageUrl}
                        alt={method.name}
                        className="h-full w-auto object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    />
                </div>
            ))}
        </div>
    );
};

export default PaymentFooter;
