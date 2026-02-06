export default async function handler(req, res) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 2. Environment Variables
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zaitandfilters';
        const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';

        // 3. Request Data
        const params = req.method === 'GET' ? req.query : req.body;
        const tagName = params.tagName || 'google-analytics';
        const expectedValue = params.expectedValue;

        // 4. Verification Logic
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/integrations${apiKey ? `?key=${apiKey}` : ''}`;

        console.log(`[GA-CHECK] Checking settings at: ${url.replace(apiKey, 'REDACTED')}`);

        const response = await fetch(url);

        if (!response.ok) {
            const status = response.status;
            const text = await response.text();

            // Return detailed diagnostic info
            return res.status(200).json({
                status: 'api_error',
                httpStatus: status,
                msg: text,
                diagnostics: {
                    projectId,
                    hasApiKey: !!apiKey,
                    method: req.method
                }
            });
        }

        const data = await response.json();

        // Manual parsing of Firestore REST format
        const fields = data.fields || {};
        const savedId = fields.googleAnalyticsId?.stringValue;

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
