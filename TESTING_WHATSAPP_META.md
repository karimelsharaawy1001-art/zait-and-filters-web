# Quick Testing Guide - WhatsApp Meta Tags

## After Deployment

### 1. Test with Facebook Sharing Debugger (Recommended First Step)

```
URL: https://developers.facebook.com/tools/debug/

Steps:
1. Enter your product URL: https://your-domain.vercel.app/product/[PRODUCT_ID]
2. Click "Debug"
3. Check for:
   ✅ Product image (not generic logo)
   ✅ Product name in title
   ✅ Product description
   ✅ og:type = "product"
```

### 2. Test with WhatsApp

```
Steps:
1. Copy a product URL from your site
2. Open WhatsApp (web or mobile)
3. Paste URL in any chat
4. Wait 2-3 seconds for preview
5. Verify product image, name, and description appear
```

### 3. Clear WhatsApp Cache (If Needed)

If WhatsApp still shows old preview:
- Add `?v=2` to URL: `https://domain.com/product/abc123?v=2`
- Or use Facebook debugger to force re-scrape
- Or wait 24-48 hours for cache expiry

### 4. Test Crawler Detection

```bash
# Simulate WhatsApp crawler (should return HTML with meta tags)
curl -A "WhatsApp/2.0" https://your-domain.vercel.app/product/[PRODUCT_ID]

# Simulate browser (should redirect to SPA)
curl -L https://your-domain.vercel.app/product/[PRODUCT_ID]
```

### 5. Check Vercel Function Logs

```
1. Go to Vercel Dashboard
2. Select your project
3. Click "Functions" tab
4. Click on "product-meta"
5. View logs for any errors
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Still shows generic logo | Clear WhatsApp cache (add `?v=2` to URL) |
| Image not loading | Check image size < 300KB |
| 500 error | Check Vercel function logs |
| Redirect loop | Check `vercel.json` route order |

## Environment Variables Required

Ensure these are set in Vercel:
- `FIREBASE_SERVICE_ACCOUNT` (JSON string)

## Expected Behavior

- **Crawlers**: See HTML with meta tags
- **Browsers**: Redirect to React SPA
- **WhatsApp**: Show product preview with image, name, description
