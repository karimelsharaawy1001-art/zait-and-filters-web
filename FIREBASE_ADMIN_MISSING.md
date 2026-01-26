# CRITICAL: Firebase Admin SDK Missing

## Root Cause Found

Your serverless function `/api/product-meta.js` requires `FIREBASE_SERVICE_ACCOUNT` environment variable, but it's **NOT configured in Vercel**.

### What You Have

`.env.local` contains **client SDK** credentials:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=zaitandfilters
VITE_FIREBASE_AUTH_DOMAIN=...
```

### What You Need

Serverless functions need **Admin SDK** credentials:
```
FIREBASE_SERVICE_ACCOUNT={
  "type": "service_account",
  "project_id": "zaitandfilters",
  "private_key": "...",
  "client_email": "..."
}
```

## Solution Options

### Option 1: Add Firebase Service Account to Vercel (RECOMMENDED)

**Steps:**

1. **Get Service Account:**
   - Go to: https://console.firebase.google.com/project/zaitandfilters/settings/serviceaccounts/adminsdk
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Add to Vercel:**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Add new variable:
     - Name: `FIREBASE_SERVICE_ACCOUNT`
     - Value: Paste the entire JSON content from downloaded file
     - Environments: Production, Preview, Development (check all)
   - Save

3. **Redeploy:**
   - Vercel will automatically redeploy
   - Or manually: Deployments → Latest → "..." → Redeploy

### Option 2: Use Firestore REST API (Alternative)

Modify the serverless function to use Firestore REST API instead of Admin SDK. This works with your existing client credentials.

**Pros:**
- No service account needed
- Works with existing credentials

**Cons:**
- Slightly slower
- More complex code

## Immediate Action Required

**You MUST do Option 1** to make the current implementation work.

Without `FIREBASE_SERVICE_ACCOUNT`, the serverless function will always return fallback HTML (generic logo).

## How to Verify

After adding the environment variable and redeploying:

```bash
# Test the function
curl -A "facebookexternalhit/1.1" \
  "https://zait-and-filters-web.vercel.app/api/product-meta?id=rZ5B8rHFUrpjSHvYfGrp"

# Should show product-specific data, not generic logo
```

## Why This Wasn't Obvious

- Local development uses `.env.local` (client SDK)
- Serverless functions need different credentials (Admin SDK)
- Vercel environment variables are separate from local `.env` files
- The function has fallback logic, so it doesn't crash - just returns generic data

---

**Next Step:** Add `FIREBASE_SERVICE_ACCOUNT` to Vercel environment variables.
