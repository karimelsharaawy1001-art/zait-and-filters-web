const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, firstName, lastName } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Fetch Mailchimp credentials from Firestore
        const docRef = db.collection('settings').doc('integrations');
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Mailchimp not configured in settings' });
        }

        const data = docSnap.data();
        const apiKey = data.mailchimpApiKey;
        const audienceId = data.mailchimpAudienceId;

        if (!apiKey || !audienceId) {
            return res.status(400).json({ error: 'Mailchimp API Key or Audience ID is missing' });
        }

        // Mailchimp API keys end with like "-us2", "-us3" etc.
        const dc = apiKey.split('-')[1];
        if (!dc) {
            return res.status(400).json({ error: 'Invalid Mailchimp API Key format' });
        }

        const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

        const response = await axios.post(
            url,
            {
                email_address: email,
                status: 'subscribed',
                merge_fields: {
                    FNAME: firstName || '',
                    LNAME: lastName || ''
                }
            },
            {
                headers: {
                    Authorization: `apikey ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.status(200).json({ success: true, message: 'Member subscribed successfully' });

    } catch (error) {
        // Handle case where user is already subscribed
        if (error.response && error.response.data && error.response.data.title === 'Member Exists') {
            return res.status(200).json({ success: true, message: 'Member already subscribed' });
        }

        console.error('Mailchimp Subscription Error:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Failed to subscribe member to Mailchimp',
            details: error.response ? error.response.data.detail : error.message
        });
    }
};
