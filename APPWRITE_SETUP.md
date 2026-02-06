# Appwrite Setup Guide 🚀

This guide will walk you through connecting your Zait & Filters project to Appwrite.

## Step 1: Create an Appwrite Account

1. Go to [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. Sign up for a free account (or log in if you already have one)
3. Create a new project called **"Zait & Filters"**

## Step 2: Get Your Project Credentials

Once your project is created:

1. Go to **Settings** in the left sidebar
2. Copy your **Project ID** (you'll need this for the `.env` file)
3. The API Endpoint is: `https://cloud.appwrite.io/v1`

## Step 3: Configure Environment Variables

Update your `.env` file with your Appwrite credentials:

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id-here
VITE_APPWRITE_DATABASE_ID=zait-filters-db
VITE_APPWRITE_STORAGE_BUCKET_ID=zait-filters-storage

# Collections
VITE_APPWRITE_PRODUCTS_COLLECTION_ID=products
VITE_APPWRITE_CATEGORIES_COLLECTION_ID=categories
VITE_APPWRITE_CARS_COLLECTION_ID=cars
VITE_APPWRITE_CAR_SPECS_COLLECTION_ID=car_specs
VITE_APPWRITE_USERS_COLLECTION_ID=users
VITE_APPWRITE_ORDERS_COLLECTION_ID=orders
VITE_APPWRITE_REVIEWS_COLLECTION_ID=reviews
VITE_APPWRITE_CONTACT_COLLECTION_ID=contact_messages
VITE_APPWRITE_AFFILIATES_COLLECTION_ID=affiliates
VITE_APPWRITE_AFFILIATE_TRANSACTIONS_COLLECTION_ID=affiliate_transactions
VITE_APPWRITE_PAYOUTS_COLLECTION_ID=payouts
VITE_APPWRITE_BLOG_COLLECTION_ID=blog_posts
VITE_APPWRITE_BRANDS_COLLECTION_ID=brands
VITE_APPWRITE_HERO_COLLECTION_ID=hero_slides
VITE_APPWRITE_POLICIES_COLLECTION_ID=policies
VITE_APPWRITE_SETTINGS_COLLECTION_ID=settings
VITE_APPWRITE_SHIPPING_COLLECTION_ID=shipping_rates
VITE_APPWRITE_PROMO_CODES_COLLECTION_ID=promo_codes
VITE_APPWRITE_PAYMENT_CONFIGS_COLLECTION_ID=payment_configs
VITE_APPWRITE_PAYMENT_PARTNERS_COLLECTION_ID=payment_methods
VITE_APPWRITE_ABANDONED_CARTS_COLLECTION_ID=abandoned_carts
```

## Step 4: Create Database

1. In your Appwrite Console, go to **Databases**
2. Click **Create Database**
3. Name it: `zait-filters-db`
4. Copy the Database ID and update `VITE_APPWRITE_DATABASE_ID` in your `.env`

## Step 5: Create Collections

For each collection, you'll need to:

1. Click **Create Collection**
2. Set the Collection ID (use the exact names from the `.env` file above)
3. Configure permissions (see below)
4. Add attributes (see schemas below)

### Permissions Setup

For each collection, set these permissions in the **Settings** tab:

**Read Access:**
- Role: Any
- Permission: Read

**Write Access (Create/Update/Delete):**
- Role: Users (for user-specific data)
- Role: Any (for public submissions like contact forms)

### Collection Schemas

#### Products Collection
```
- name (string, required)
- nameAr (string, required)
- description (string)
- descriptionAr (string)
- price (float, required)
- salePrice (float)
- category (string, required)
- subcategory (string)
- brand (string)
- images (string[])
- stock (integer, default: 0)
- carMake (string)
- carModel (string)
- carYear (string)
- featured (boolean, default: false)
- createdAt (datetime)
- updatedAt (datetime)
```

#### Categories Collection
```
- name (string, required)
- nameAr (string, required)
- slug (string, required)
- image (string)
- subcategories (string[])
- order (integer, default: 0)
```

#### Cars Collection
```
- make (string, required)
- model (string, required)
- year (string, required)
- image (string)
- createdAt (datetime)
```

#### Car Specs Collection
```
- make (string, required)
- model (string, required)
- year (string, required)
- engineType (string, required)
- motorOilViscosity (string, required)
- motorOilCapacity (float, required)
- transmissionFluidType (string, required)
- transmissionCapacity (float, required)
```

#### Users Collection
```
- email (string, required)
- fullName (string, required)
- phone (string)
- role (string, default: "customer")
- addresses (string[])
- createdAt (datetime)
```

#### Orders Collection
```
- orderNumber (string, required)
- userId (string, required)
- items (string[])
- total (float, required)
- status (string, required)
- paymentStatus (string, required)
- paymentMethod (string)
- shippingAddress (string)
- customerInfo (string)
- kilometers (integer)
- createdAt (datetime)
- updatedAt (datetime)
```

> **Note:** For complex nested objects (like `items`, `addresses`), store them as JSON strings and parse them in your application.

## Step 6: Create Storage Bucket

1. Go to **Storage** in the Appwrite Console
2. Click **Create Bucket**
3. Name it: `zait-filters-storage`
4. Copy the Bucket ID and update `VITE_APPWRITE_STORAGE_BUCKET_ID` in `.env`
5. Set permissions:
   - Read: Any
   - Create: Users
   - Update: Users
   - Delete: Users

## Step 7: Enable Authentication

1. Go to **Auth** in the Appwrite Console
2. Enable **Email/Password** authentication
3. (Optional) Enable **OAuth providers** if needed (Google, Facebook, etc.)

## Step 8: Test Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open your browser console and check for any Appwrite connection errors

3. Try logging in or creating a test product to verify the connection

## Step 9: Data Migration (Optional)

If you have existing Firebase data, you'll need to migrate it:

1. Export data from Firebase (use Firebase Console or scripts)
2. Transform the data to match Appwrite's structure
3. Import using Appwrite's REST API or Console

## Troubleshooting

### "Project not found" error
- Verify `VITE_APPWRITE_PROJECT_ID` matches your Appwrite project ID
- Check that the endpoint is correct: `https://cloud.appwrite.io/v1`

### "Collection not found" error
- Ensure all collection IDs in `.env` match exactly with Appwrite Console
- Collection IDs are case-sensitive

### "Unauthorized" errors
- Check collection permissions in Appwrite Console
- Ensure authentication is properly configured

### CORS errors
- Add your development URL (`http://localhost:5173`) to the Appwrite project's platforms
- Go to **Settings** → **Platforms** → **Add Platform** → **Web App**

## Next Steps

Once connected:
- ✅ Your admin panel will automatically use Appwrite
- ✅ All CRUD operations will sync with Appwrite Database
- ✅ Image uploads will use Appwrite Storage
- ✅ User authentication will use Appwrite Auth

---

**Need Help?** Check the [Appwrite Documentation](https://appwrite.io/docs) or reach out to the Appwrite community on Discord.
