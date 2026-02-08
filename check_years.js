import { Client, Databases } from 'appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

async function check() {
    try {
        const response = await databases.listDocuments(
            process.env.VITE_APPWRITE_DATABASE_ID,
            process.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID,
            []
        );
        response.documents.slice(0, 10).forEach((d, i) => {
            console.log(`Item ${i+1}: ${d.name}`);
            console.log(`  carYear: "${d.carYear}"`);
            console.log(`  yearRange: "${d.yearRange}"`);
            console.log(`  yearStart: ${d.yearStart}`);
            console.log(`  yearEnd: ${d.yearEnd}`);
            console.log(`  all keys: ${Object.keys(d).filter(k => k.toLowerCase().includes('year'))}`);
        });
    } catch (error) {
        console.error("Error:", error.message);
    }
}

check();
