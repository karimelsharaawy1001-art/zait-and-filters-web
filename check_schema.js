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
        const doc = response.documents[0];
        console.log("Found Document Keys:", Object.keys(doc));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

check();
