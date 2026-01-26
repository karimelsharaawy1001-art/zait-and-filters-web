import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only once)
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();

export default async function middleware(request) {
    const url = new URL(request.url);

    // Only process product pages
    if (!url.pathname.startsWith('/product/')) {
        return;
    }

    // Check if request is from a crawler
    const userAgent = request.headers.get('user-agent') || '';
    const isCrawler = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot/i.test(userAgent);

    if (!isCrawler) {
        return; // Let normal requests pass through
    }

    // Extract product ID from URL
    const productId = url.pathname.split('/product/')[1];

    if (!productId) {
        return;
    }

    try {
        // Fetch product from Firestore
        const productDoc = await db.collection('products').doc(productId).get();

        if (!productDoc.exists) {
            return;
        }

        const product = productDoc.data();

        // Prepare meta tag values
        const title = `${product.name || product.nameEn || 'منتج'} | Zait & Filters`;
        const description = (product.description || product.descriptionEn || 'قطع غيار أصلية بضمان').substring(0, 200);
        const imageUrl = product.imageUrl || product.images?.[0] || 'https://zait-and-filters-web.vercel.app/logo.png';
        const pageUrl = request.url;

        // Fetch the original HTML
        const response = await fetch(request.url, {
            headers: request.headers,
        });

        let html = await response.text();

        // Create meta tags HTML
        const metaTags = `
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Zait & Filters" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <!-- Additional Product Meta -->
    <meta property="product:price:amount" content="${product.salePrice || product.price}" />
    <meta property="product:price:currency" content="EGP" />
    ${product.partBrand ? `<meta property="product:brand" content="${product.partBrand}" />` : ''}
    `;

        // Insert meta tags before </head>
        html = html.replace('</head>', `${metaTags}</head>`);

        // Also update the title tag
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

        return new Response(html, {
            status: 200,
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'public, max-age=3600', // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error('Error in middleware:', error);
        // On error, let the request pass through normally
        return;
    }
}

export const config = {
    matcher: '/product/:path*',
};
