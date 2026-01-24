// Quick test script to check if cars collection has data
// Run this in browser console on your site

import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

async function testCarsCollection() {
    console.log('=== TESTING CARS COLLECTION ===');
    try {
        const snapshot = await getDocs(collection(db, 'cars'));
        console.log('Total documents in cars collection:', snapshot.docs.length);

        if (snapshot.docs.length === 0) {
            console.warn('⚠️ CARS COLLECTION IS EMPTY!');
            console.log('Go to Admin Panel > Manage Cars and add some cars first.');
        } else {
            console.log('Cars found:');
            snapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                console.log(`${index + 1}.`, {
                    id: doc.id,
                    make: data.make,
                    model: data.model,
                    yearStart: data.yearStart,
                    yearEnd: data.yearEnd
                });
            });
        }
    } catch (error) {
        console.error('Error accessing cars collection:', error);
    }
}

// Auto-run
testCarsCollection();
