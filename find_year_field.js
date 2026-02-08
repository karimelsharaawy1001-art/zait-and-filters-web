import { Client, Databases, Query } from 'appwrite';
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
            [Query.equal('name', 'طقم مساعدين امامي'), Query.limit(10)]
        );
        response.documents.forEach((d, i) => {
            console.log(`Item ${i+1}: ${d.name} (${d.$id})`);
            console.log(`  Raw Data: `, JSON.stringify({
                name: d.name,
                make: d.make,
                carMake: d.carMake,
                model: d.model,
                carModel: d.carModel,
                yearRange: d.yearRange,
                carYear: d.carYear,
                yearStart: d.yearStart,
                yearEnd: d.yearEnd,
                year: d.year,
                years: d.years
            }, null, 2));
        });
    } catch (error) {
        console.error("Error:", error.message);
    }
}

check();
