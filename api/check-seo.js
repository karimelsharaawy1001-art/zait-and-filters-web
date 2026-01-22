const axios = require('axios');

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

    const { targetUrl, tagName, expectedValue } = req.body;

    if (!targetUrl || !tagName) {
        return res.status(400).json({ error: 'Missing targetUrl or tagName' });
    }

    try {
        console.log(`Checking SEO for ${targetUrl}, Tag: ${tagName}`);

        const response = await axios.get(targetUrl, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;

        let match;
        if (tagName === 'facebook-pixel') {
            // Check for fbq('init', 'ID') in scripts
            const pixelRegex = new RegExp(`fbq\\(['"]init['"]\\s*,\\s*['"](\\d+)['"]\\)`, 'i');
            match = html.match(pixelRegex);
        } else if (tagName === 'google-analytics') {
            // Check for gtag/js?id=G-XXX or gtag('config', 'G-XXX')
            const gaRegex = new RegExp(`googletagmanager\\.com/gtag/js\\?id=([G|UA]-[A-Z0-9-]+)`, 'i');
            const gaConfigRegex = new RegExp(`gtag\\(['"]config['"]\\s*,\\s*['"]([G|UA]-[A-Z0-9-]+)['"]\\)`, 'i');
            match = html.match(gaRegex) || html.match(gaConfigRegex);
        } else if (tagName === 'mailchimp') {
            // Special case for Mailchimp: we can't "see" it in the source code easily
            // We just return 'simulation_active' to indicate the logic is wired up
            return res.status(200).json({ status: 'simulation_active' });
        } else {
            // Default: Check for meta tags
            const metaRegex = new RegExp(`<meta[^>]*name=["']${tagName}["'][^>]*content=["']([^"']+)["']`, 'i');
            const altMetaRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${tagName}["']`, 'i');
            match = html.match(metaRegex) || html.match(altMetaRegex);
        }

        if (match) {
            const foundValue = match[1];
            console.log(`Found ${tagName} with value: ${foundValue}`);

            if (expectedValue && foundValue !== expectedValue) {
                return res.status(200).json({
                    status: 'mismatch',
                    found: foundValue,
                    expected: expectedValue
                });
            }

            return res.status(200).json({
                status: 'found',
                value: foundValue
            });
        } else {
            console.log(`Tag/Script ${tagName} not found`);
            return res.status(200).json({ status: 'not_found' });
        }

    } catch (error) {
        console.error('Error checking SEO:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch the website',
            details: error.message
        });
    }
};
