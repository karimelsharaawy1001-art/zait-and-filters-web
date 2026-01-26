import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

const db = admin.firestore();

// Detect if the request is from a crawler/bot
function isCrawler(userAgent) {
    if (!userAgent) return false;

    const crawlerPatterns = [
        'whatsapp',
        'facebookexternalhit',
        'twitterbot',
        'linkedinbot',
        'slackbot',
        'telegrambot',
        'discordbot',
        'pinterest',
        'googlebot',
        'bingbot',
        'yandexbot'
    ];

    const lowerUA = userAgent.toLowerCase();
    return crawlerPatterns.some(pattern => lowerUA.includes(pattern));
}

// Generate product description
function generateProductDescription(product, lang = 'ar') {
    const isAr = lang === 'ar';

    if (isAr) {
        return product.description || product.descriptionEn ||
            `${product.name} - ${product.partBrand || product.brand || ''} - قطع غيار أصلية مع ضمان`;
    } else {
        return product.descriptionEn || product.description ||
            `${product.nameEn || product.name} - ${product.brandEn || product.partBrand || product.brand || ''} - Original spare parts with warranty`;
    }
}

// Format warranty
function formatWarranty(months, lang = 'ar') {
    if (!months) return '';
    const isAr = lang === 'ar';

    if (months >= 12) {
        const years = Math.floor(months / 12);
        return isAr ? `ضمان ${years} ${years === 1 ? 'سنة' : 'سنوات'}` : `${years} Year${years > 1 ? 's' : ''} Warranty`;
    }
    return isAr ? `ضمان ${months} شهر` : `${months} Month${months > 1 ? 's' : ''} Warranty`;
}

// Ensure absolute URL
function ensureAbsoluteUrl(url, baseUrl = 'https://zait-and-filters-web.vercel.app') {
    if (!url) return `${baseUrl}/logo.png`;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Generate HTML with meta tags
function generateHTML(product, productId, baseUrl = 'https://zait-and-filters-web.vercel.app') {
    const productUrl = `${baseUrl}/product/${productId}`;

    // Determine language (default to Arabic)
    const lang = 'ar';

    // Product details
    const title = product.nameEn || product.name || 'Product';
    const titleAr = product.name || product.nameEn || 'منتج';
    const fullTitle = `${title} | ${titleAr} | Zait & Filters`;

    const description = generateProductDescription(product, 'en');
    const descriptionAr = generateProductDescription(product, 'ar');
    const fullDescription = `${description} | ${descriptionAr}`;

    // Get product image - ensure absolute URL
    const productImage = ensureAbsoluteUrl(
        product.image || product.imageUrl || product.images?.[0],
        baseUrl
    );

    // Build keywords
    const keywords = [
        product.category,
        product.subcategory,
        product.make,
        product.model,
        product.partBrand || product.brand,
        product.countryOfOrigin,
        'قطع غيار سيارات',
        'car parts',
        'spare parts'
    ].filter(Boolean).join(', ');

    // Price information
    const price = product.salePrice || product.price || '0';
    const currency = 'EGP';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Basic Meta Tags -->
    <title>${fullTitle}</title>
    <meta name="description" content="${fullDescription}">
    <meta name="keywords" content="${keywords}">
    
    <!-- Open Graph Meta Tags (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:type" content="product">
    <meta property="og:title" content="${fullTitle}">
    <meta property="og:description" content="${fullDescription}">
    <meta property="og:image" content="${productImage}">
    <meta property="og:image:secure_url" content="${productImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${title}">
    <meta property="og:url" content="${productUrl}">
    <meta property="og:site_name" content="Zait & Filters">
    <meta property="og:locale" content="ar_AR">
    <meta property="og:locale:alternate" content="en_US">
    
    <!-- Product-specific OG tags -->
    <meta property="product:price:amount" content="${price}">
    <meta property="product:price:currency" content="${currency}">
    ${product.partBrand || product.brand ? `<meta property="product:brand" content="${product.partBrand || product.brand}">` : ''}
    ${product.category ? `<meta property="product:category" content="${product.category}">` : ''}
    ${product.isActive ? '<meta property="product:availability" content="in stock">' : '<meta property="product:availability" content="out of stock">'}
    ${product.warranty_months ? `<meta property="product:condition" content="new">` : ''}
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${fullTitle}">
    <meta name="twitter:description" content="${fullDescription}">
    <meta name="twitter:image" content="${productImage}">
    <meta name="twitter:image:alt" content="${title}">
    <meta name="twitter:site" content="@zaitandfilters">
    
    <!-- Additional Meta Tags -->
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${productUrl}">
    <link rel="icon" type="image/png" href="${baseUrl}/logo.png">
    
    <!-- Schema.org structured data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "${title}",
        "image": "${productImage}",
        "description": "${description}",
        "brand": {
            "@type": "Brand",
            "name": "${product.partBrand || product.brand || 'Zait & Filters'}"
        },
        "offers": {
            "@type": "Offer",
            "url": "${productUrl}",
            "priceCurrency": "${currency}",
            "price": "${price}",
            "availability": "${product.isActive ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}",
            "seller": {
                "@type": "Organization",
                "name": "Zait & Filters"
            }
        }
        ${product.warranty_months ? `,"warranty": "${formatWarranty(product.warranty_months, 'en')}"` : ''}
    }
    </script>
    
    <!-- Redirect to SPA for actual browsing -->
    <meta http-equiv="refresh" content="0; url=${productUrl}">
    <script>
        // Immediate redirect for browsers (crawlers won't execute this)
        window.location.href = '${productUrl}';
    </script>
</head>
<body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <img src="${productImage}" alt="${title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #333; margin-bottom: 10px;">${title}</h1>
        <h2 style="color: #666; font-size: 1.2em; margin-bottom: 20px;">${titleAr}</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${description}</p>
        <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 2em; color: #e31e24; font-weight: bold; margin: 0;">${price} ${currency}</p>
            ${product.warranty_months ? `<p style="color: #22c55e; margin-top: 10px; font-weight: bold;">${formatWarranty(product.warranty_months, 'en')}</p>` : ''}
        </div>
        <p style="color: #999; font-size: 0.9em;">Redirecting to product page...</p>
        <a href="${productUrl}" style="display: inline-block; background: #e31e24; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold;">View Product</a>
    </div>
</body>
</html>`;
}

// Generate fallback HTML for errors
function generateFallbackHTML(baseUrl = 'https://zait-and-filters-web.vercel.app') {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>Zait & Filters | زيت اند فلترز - قطع غيار سيارات أصلية</title>
    <meta name="description" content="قطع غيار سيارات أصلية مع ضمان - Original car spare parts with warranty">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Zait & Filters | زيت اند فلترز">
    <meta property="og:description" content="قطع غيار سيارات أصلية مع ضمان - Original car spare parts with warranty">
    <meta property="og:image" content="${baseUrl}/logo.png">
    <meta property="og:url" content="${baseUrl}">
    <meta property="og:site_name" content="Zait & Filters">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Zait & Filters | زيت اند فلترز">
    <meta name="twitter:description" content="قطع غيار سيارات أصلية مع ضمان">
    <meta name="twitter:image" content="${baseUrl}/logo.png">
    
    <meta http-equiv="refresh" content="0; url=${baseUrl}">
    <script>window.location.href = '${baseUrl}';</script>
</head>
<body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
    <h1>Redirecting...</h1>
    <a href="${baseUrl}">Go to Zait & Filters</a>
</body>
</html>`;
}

export default async function handler(req, res) {
    const userAgent = req.headers['user-agent'] || '';
    const { id } = req.query;

    // Get base URL from request or use default
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'zait-and-filters-web.vercel.app';
    const baseUrl = `${protocol}://${host}`;

    console.log(`[Product Meta] Request for product: ${id}, User-Agent: ${userAgent.substring(0, 50)}...`);

    // If not a crawler, redirect to SPA immediately
    if (!isCrawler(userAgent)) {
        console.log('[Product Meta] Not a crawler, redirecting to SPA');
        return res.redirect(302, `/product/${id}`);
    }

    console.log('[Product Meta] Crawler detected, generating meta tags');

    // Fetch product from Firestore
    try {
        if (!id) {
            console.log('[Product Meta] No product ID provided');
            return res.status(200).setHeader('Content-Type', 'text/html').send(generateFallbackHTML(baseUrl));
        }

        const productDoc = await db.collection('products').doc(id).get();

        if (!productDoc.exists) {
            console.log(`[Product Meta] Product not found: ${id}`);
            return res.status(200).setHeader('Content-Type', 'text/html').send(generateFallbackHTML(baseUrl));
        }

        const product = productDoc.data();
        console.log(`[Product Meta] Product found: ${product.name || product.nameEn}`);

        const html = generateHTML(product, id, baseUrl);

        return res
            .status(200)
            .setHeader('Content-Type', 'text/html')
            .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
            .send(html);

    } catch (error) {
        console.error('[Product Meta] Error fetching product:', error);
        return res.status(200).setHeader('Content-Type', 'text/html').send(generateFallbackHTML(baseUrl));
    }
}
