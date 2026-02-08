import { Client, Databases, Query } from 'appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

async function audit() {
    try {
        const response = await databases.listDocuments(
            process.env.VITE_APPWRITE_DATABASE_ID,
            process.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID,
            [Query.limit(20)]
        );
        
        console.log("Total Found in this batch:", response.documents.length);
        response.documents.forEach((doc, i) => {
            console.log(`--- Product [${i}] ${doc.name} (${doc.$id}) ---`);
            console.log("make:", doc.make, "| carMake:", doc.carMake);
            console.log("model:", doc.model, "| carModel:", doc.carModel);
            console.log("yearStart:", doc.yearStart, "| yearEnd:", doc.yearEnd);
            console.log("yearRange:", doc.yearRange, "| carYear:", doc.carYear);
            console.log("isActive:", doc.isActive, "(type: " + typeof doc.isActive + ")");
        });
    } catch (error) {
        console.error("Audit Error:", error.message);
    }
}

audit();
