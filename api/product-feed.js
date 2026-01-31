// Serverless function to generate Google Merchant Center product feed
// Uses Firestore REST API (no SDK dependencies needed)

const BASE_URL = 'https://zaitandfilters.com';

// Fetch all products from Firestore using REST API
async function fetchAllProducts(apiKey, projectId) {
    let products = [];
    let pageToken = null;

    try {
        do {
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products?key=${apiKey}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await fetch(firestoreUrl);

            if (!response.ok) {
                console.error(`[Product Feed] Firestore API error: ${response.status}`);
                break;
            }

            const data = await response.json();

            if (data.documents) {
                const fetched = data.documents
                    .map(doc => {
                        const id = doc.name.split('/').pop();
                        const fields = doc.fields;

                        // Extract product data
                        const name = fields.name?.stringValue || '';
                        const price = parseFloat(fields.price?.doubleValue || fields.price?.integerValue || 0);
                        const stock = parseInt(fields.stock?.integerValue || 0);
                        const image = fields.image?.stringValue || '';
                        const description = fields.description?.stringValue || name;
                        const brand = fields.brand?.stringValue || 'Generic';
                        const category = fields.category?.stringValue || '';
                        const subcategory = fields.subcategory?.stringValue || '';

                        // Extract images array if available
                        const images = fields.images?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [];

                        // Extract compatible cars if available
                        const compatibleCars = fields.compatibleCars?.arrayValue?.values?.map(car => {
                            const carFields = car.mapValue?.fields || {};
                            return {
                                make: carFields.make?.stringValue || '',
                                model: carFields.model?.stringValue || '',
                                year: carFields.year?.stringValue || carFields.year?.integerValue || ''
                            };
                        }) || [];

                        // Only include products with required fields and in stock
                        if (stock > 0 && name && price && image) {
                            return {
                                id,
                                name,
                                price,
                                stock,
                                image,
                                description,
                                brand,
                                category,
                                subcategory,
                                images,
                                compatibleCars
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                products = [...products, ...fetched];
            }

            pageToken = data.nextPageToken;
        } while (pageToken);

        return products;
    } catch (error) {
        console.error('[Product Feed] Error fetching products:', error);
        return [];
    }
}

function generateProductFeed(products) {
    const now = new Date().toISOString();

    const productItems = products.map(product => {
        // Build product title with brand
        const title = product.brand
            ? `${product.brand} ${product.name}`.substring(0, 150)
            : product.name.substring(0, 150);

        // Build description
        const description = product.description.substring(0, 5000);

        // Get image URL (ensure it's absolute)
        let imageUrl = product.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${BASE_URL}${imageUrl}`;
        }

        // Build additional images if available
        let additionalImages = '';
        if (product.images && product.images.length > 0) {
            additionalImages = product.images.slice(0, 10).map(img => {
                let imgUrl = img;
                if (!imgUrl.startsWith('http')) {
                    imgUrl = `${BASE_URL}${imgUrl}`;
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
        if (product.compatibleCars && product.compatibleCars.length > 0) {
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
    <g:link>${BASE_URL}/product/${product.id}</g:link>
    <g:image_link>${escapeXml(imageUrl)}</g:image_link>
${additionalImages}
    <g:availability>${availability}</g:availability>
    <g:price>${product.price.toFixed(2)} EGP</g:price>
    <g:brand>${escapeXml(product.brand)}</g:brand>
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
    <link>${BASE_URL}</link>
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
    <link>${BASE_URL}</link>
    <description>High-quality auto parts, filters, and oils for all vehicle makes and models</description>
    <lastBuildDate>${now}</lastBuildDate>
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

export default async function handler(req, res) {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters';

    if (!apiKey) {
        return res.status(500).send('<?xml version="1.0"?><error>API Key not configured</error>');
    }

    try {
        // Fetch all products
        const products = await fetchAllProducts(apiKey, projectId);

        // Generate feed
        const xmlFeed = products.length > 0
            ? generateProductFeed(products)
            : generateEmptyFeed();

        // Set headers
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800'); // Cache for 1 hour

        return res.status(200).send(xmlFeed);
    } catch (error) {
        console.error('[Product Feed] Error:', error);
        return res.status(500).send(`<?xml version="1.0"?><error>${escapeXml(error.message)}</error>`);
    }
}
