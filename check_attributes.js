import { Client, Databases } from 'appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

async function check() {
    try {
        const response = await fetch(`${process.env.VITE_APPWRITE_ENDPOINT}/databases/${process.env.VITE_APPWRITE_DATABASE_ID}/collections/${process.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID}`, {
            headers: {
                'X-Appwrite-Project': process.env.VITE_APPWRITE_PROJECT_ID
            }
        });
        const data = await response.json();
        console.log("Attributes:", data.attributes.map(a => (`${a.key} (${a.type})`)));
    } catch (error) {
        // Fallback: try to list one doc and check keys again
         const response = await databases.listDocuments(
            process.env.VITE_APPWRITE_DATABASE_ID,
            process.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID,
            []
        );
        console.log("Document Keys for doc 0:", Object.keys(response.documents[0]));
    }
}

check();
