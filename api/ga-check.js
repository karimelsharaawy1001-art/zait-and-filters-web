export default async function handler(req, res) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Origin', '*');
    res.setHeader('Access-Control-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 2. Environment Variables
        const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
        const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
        const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
        const collectionId = process.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';

        // 3. Request Data
        const params = req.method === 'GET' ? req.query : req.body;
        const tagName = params.tagName || 'google-analytics';
        const expectedValue = params.expectedValue;

        // 4. Verification Logic (Appwrite REST API)
        const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents/integrations`;

        console.log(`[GA-CHECK] Checking Appwrite at: ${url}`);

        const response = await fetch(url, {
            headers: {
                'X-Appwrite-Project': projectId
            }
        });

        if (!response.ok) {
            const status = response.status;
            const text = await response.text();

            return res.status(200).json({
                status: 'api_error',
                httpStatus: status,
                msg: text,
                diagnostics: {
                    projectId,
                    databaseId,
                    collectionId
                }
            });
        }

        const data = await response.json();
        const savedId = data.googleAnalyticsId;

        if (!savedId) {
            return res.status(200).json({ status: 'not_found' });
        }

        if (expectedValue && savedId !== expectedValue) {
            return res.status(200).json({ status: 'mismatch', saved: savedId });
        }

        return res.status(200).json({ status: 'found', id: savedId });

    } catch (err) {
        console.error("[GA-CHECK] Fatal Error:", err);
        return res.status(200).json({
            status: 'fatal_error',
            error: err.message,
            stack: err.stack
        });
    }
}
