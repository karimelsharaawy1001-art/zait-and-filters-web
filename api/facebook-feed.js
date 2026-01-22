const admin = require('firebase-admin');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

module.exports = async (req, res) => {
    try {
        // Fetch all active products
        const productsSnap = await db.collection('products').get();
        const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch site settings
        const settingsSnap = await db.collection('settings').doc('general').get();
        const settings = settingsSnap.exists ? settingsSnap.data() : {};
        const baseUrl = process.env.SITE_URL || 'https://zait-and-filters.com';

        // Generate Meta Catalog XML (RSS 2.0)
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
    <channel>
        <title>${settings.siteName || 'Zait &amp; Filters'}</title>
        <link>${baseUrl}</link>
        <description>${settings.siteDescription || 'Genuine Spirits &amp; Auto Filters'}</description>
`;

        products.forEach(product => {
            // Basic sanitization
            const title = (product.nameEn || product.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const description = (product.descriptionEn || product.description || 'Genuine auto part').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const price = product.price || 0;
            const link = `${baseUrl}/product/${product.id}`;
            const imageLink = product.images && product.images[0] ? product.images[0] : '';
            const availability = product.stock > 0 ? 'in stock' : 'out of stock';
            const id = product.id;
            const brand = product.brand || 'Zait &amp; Filters';

            xml += `        <item>
            <g:id>${id}</g:id>
            <g:title>${title}</g:title>
            <g:description>${description}</g:description>
            <g:link>${link}</g:link>
            <g:image_link>${imageLink}</g:image_link>
            <g:condition>new</g:condition>
            <g:availability>${availability}</g:availability>
            <g:price>${price} EGP</g:price>
            <g:brand>${brand}</g:brand>
        </item>
`;
        });

        xml += `    </channel>
</rss>`;

        // Set Headers and Send
        res.setHeader('Content-Type', 'text/xml');
        res.status(200).send(xml);

    } catch (error) {
        console.error('Error generating Facebook product feed:', error);
        res.status(500).send('Error generating Facebook product feed');
    }
};
