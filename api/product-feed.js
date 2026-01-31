import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    try {
        // Set headers for XML response
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        // Fetch all products from Firestore
        const productsSnapshot = await db.collection('products').get();

        if (productsSnapshot.empty) {
            return res.status(200).send(generateEmptyFeed());
        }

        const products = [];
        productsSnapshot.forEach(doc => {
            const data = doc.data();
            // Only include products that are in stock and have required fields
            if (data.stock > 0 && data.name && data.price && data.image) {
                products.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        // Generate XML feed
        const xmlFeed = generateProductFeed(products, req.headers.host);

        res.status(200).send(xmlFeed);
    } catch (error) {
        console.error('Error generating product feed:', error);
        res.status(500).send(generateErrorFeed(error.message));
    }
}

function generateProductFeed(products, host) {
    const baseUrl = `https://${host}`;
    const now = new Date().toISOString();

    const productItems = products.map(product => {
        // Ensure price is a number
        const price = parseFloat(product.price) || 0;

        // Build product title with brand if available
        const title = product.brand
            ? `${product.brand} ${product.name}`.substring(0, 150)
            : product.name.substring(0, 150);

        // Build description
        const description = (product.description || product.name).substring(0, 5000);

        // Get image URL (ensure it's absolute)
        let imageUrl = product.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${baseUrl}${imageUrl}`;
        }

        // Build additional images if available
        let additionalImages = '';
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            additionalImages = product.images.slice(0, 10).map(img => {
                let imgUrl = img;
                if (!imgUrl.startsWith('http')) {
                    imgUrl = `${baseUrl}${imgUrl}`;
                }
                return `    <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`;
            }).join('\n');
        }

        // Determine availability
        const availability = product.stock > 0 ? 'in stock' : 'out of stock';

        // Build category/product_type
        const productType = [product.category, product.subcategory]
            .filter(Boolean)
            .join(' > ');

        // Build compatible vehicles (custom label)
        let customLabels = '';
        if (product.compatibleCars && Array.isArray(product.compatibleCars) && product.compatibleCars.length > 0) {
            const carInfo = product.compatibleCars.slice(0, 3).map(car => {
                return `${car.make || ''} ${car.model || ''} ${car.year || ''}`.trim();
            }).filter(Boolean).join(', ');

            if (carInfo) {
                customLabels = `    <g:custom_label_0>${escapeXml(carInfo)}</g:custom_label_0>`;
            }
        }

        return `  <item>
    <g:id>${escapeXml(product.id)}</g:id>
    <g:title>${escapeXml(title)}</g:title>
    <g:description>${escapeXml(description)}</g:description>
    <g:link>${baseUrl}/product/${product.id}</g:link>
    <g:image_link>${escapeXml(imageUrl)}</g:image_link>
${additionalImages}
    <g:availability>${availability}</g:availability>
    <g:price>${price.toFixed(2)} EGP</g:price>
    <g:brand>${escapeXml(product.brand || 'Generic')}</g:brand>
    <g:condition>new</g:condition>
    <g:product_type>${escapeXml(productType)}</g:product_type>
    <g:google_product_category>Vehicles &amp; Parts &gt; Vehicle Parts &amp; Accessories</g:google_product_category>
${customLabels}
    <g:identifier_exists>no</g:identifier_exists>
  </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ZAIT &amp; FILTERS - Auto Parts</title>
    <link>${baseUrl}</link>
    <description>High-quality auto parts, filters, and oils for all vehicle makes and models</description>
    <lastBuildDate>${now}</lastBuildDate>
${productItems}
  </channel>
</rss>`;
}

function generateEmptyFeed() {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ZAIT &amp; FILTERS - Auto Parts</title>
    <link>https://zaitandfilters.com</link>
    <description>High-quality auto parts, filters, and oils for all vehicle makes and models</description>
    <lastBuildDate>${now}</lastBuildDate>
  </channel>
</rss>`;
}

function generateErrorFeed(errorMessage) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Error</title>
    <description>Error generating feed: ${escapeXml(errorMessage)}</description>
  </channel>
</rss>`;
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
