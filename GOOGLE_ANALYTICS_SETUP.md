# Google Analytics Setup Guide

This guide describes how to connect and verify Google Analytics (GA4) with your Zait & Filters storefront.

## 1. Get your Measurement ID (GA4)

1.  Sign in to [Google Analytics](https://analytics.google.com/).
2.  Click **Admin** (gear icon in the bottom left).
3.  In the **Property** column, click **Data Streams**.
4.  Select your **Web** stream (usually your website URL).
5.  Copy the **Measurement ID** at the top right (looks like `G-XXXXXXXXXX`).

## 2. Connect to your Storefront

1.  Log in to your website's **Admin Dashboard**.
2.  Go to **Integrations** -> **Google Analytics**.
3.  Paste your **Measurement ID** into the input field.
4.  Click **Save Configuration**.

## 3. Verify Connection

Our system automatically injects the tracking script and handles page tracking. You can verify it using any of these methods:

### Method A: Live Test Connection
In the Admin Dashboard (Google Analytics integration page), click the **Test Connection** button. It will verify if the ID is correctly stored and active in our system.

### Method B: Real-time Reports (Most Reliable)
1. Open your website in a regular browser tab.
2. Go to your Google Analytics dashboard.
3. Navigate to **Reports** -> **Real-time**.
4. You should see at least 1 active user (you) on the map within 60 seconds.

### Method C: Browser Console (Advanced)
1. Open your website.
2. Press `F12` to open Developer Tools.
3. Switch to the **Console** tab.
4. Type `window.dataLayer` and press Enter.
5. If you see an array containing your Google Analytics ID, it's working!

## Troubleshooting

- **No data in Reports?** Initial reports (non-real-time) can take up to 24-48 hours to populate.
- **Still not connecting?** Ensure you don't have an ad-blocker enabled in your browser, as they often block Google Analytics scripts.
