#!/bin/bash

# Test script for product-meta serverless function
# This simulates what Facebook/WhatsApp crawlers do

echo "========================================="
echo "Testing Product Meta Tags Function"
echo "========================================="
echo ""

# Replace with your actual product ID
PRODUCT_ID="${1:-YOUR_PRODUCT_ID_HERE}"
BASE_URL="${2:-https://zait-and-filters-web.vercel.app}"

echo "Product ID: $PRODUCT_ID"
echo "Base URL: $BASE_URL"
echo ""

echo "========================================="
echo "Test 1: Simulating Facebook Crawler"
echo "========================================="
curl -A "facebookexternalhit/1.1" \
     -H "Accept: text/html" \
     "$BASE_URL/product/$PRODUCT_ID" \
     2>/dev/null | grep -E "(og:image|og:title|og:description)" | head -10

echo ""
echo "========================================="
echo "Test 2: Simulating WhatsApp Crawler"
echo "========================================="
curl -A "WhatsApp/2.0" \
     -H "Accept: text/html" \
     "$BASE_URL/product/$PRODUCT_ID" \
     2>/dev/null | grep -E "(og:image|og:title|og:description)" | head -10

echo ""
echo "========================================="
echo "Test 3: Checking for og:image specifically"
echo "========================================="
curl -A "facebookexternalhit/1.1" \
     "$BASE_URL/product/$PRODUCT_ID" \
     2>/dev/null | grep "og:image"

echo ""
echo "========================================="
echo "Test 4: Full HTML Head Section"
echo "========================================="
curl -A "facebookexternalhit/1.1" \
     "$BASE_URL/product/$PRODUCT_ID" \
     2>/dev/null | sed -n '/<head>/,/<\/head>/p' | head -50

echo ""
echo "========================================="
echo "Testing Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Check if og:image appears in the output above"
echo "2. Verify the image URL is absolute (starts with https://)"
echo "3. Test with Facebook Sharing Debugger:"
echo "   https://developers.facebook.com/tools/debug/"
echo ""
