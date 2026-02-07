import React, { useEffect } from 'react';
import { databases } from '../appwrite';

/**
 * IntegrationsManager handles global third-party scripts and verification tags.
 * It is designed to be a non-lazy component mounted at the top level (App.jsx)
 * to ensure tracking and verification tags are injected as soon as the app initializes.
 */
const IntegrationsManager = () => {
    useEffect(() => {
        const fetchIntegrations = async () => {
            const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const SETTINGS_COLLECTION = import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';
            const DOC_ID = 'integrations';

            if (!DATABASE_ID) return;

            try {
                const data = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, DOC_ID);
                if (data) {
                    // 1. Google Site Verification (Meta Tag Method)
                    if (data.googleVerificationCode) {
                        let googleMeta = document.querySelector('meta[name="google-site-verification"]');
                        if (!googleMeta) {
                            googleMeta = document.createElement('meta');
                            googleMeta.name = 'google-site-verification';
                            document.head.appendChild(googleMeta);
                        }
                        // Clean the code (mirroring logic in SEO.jsx for consistency)
                        let code = data.googleVerificationCode;
                        if (code.includes('content="')) {
                            code = code.split('content="')[1].split('"')[0];
                        }
                        googleMeta.setAttribute('content', code);
                    }

                    // 2. Facebook Pixel
                    if (data.facebookPixelId) {
                        let fPixelScript = document.getElementById('facebook-pixel-script');
                        if (!fPixelScript) {
                            fPixelScript = document.createElement('script');
                            fPixelScript.id = 'facebook-pixel-script';
                            fPixelScript.innerHTML = `
                                !function(f,b,e,v,n,t,s)
                                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                                n.queue=[];t=b.createElement(e);t.async=!0;
                                t.src=v;s=b.getElementsByTagName(e)[0];
                                s.parentNode.insertBefore(t,s)}(window, document,'script',
                                'https://connect.facebook.net/en_US/fbevents.js');
                                fbq('init', '${data.facebookPixelId}');
                                fbq('track', 'PageView');
                            `;
                            document.head.appendChild(fPixelScript);

                            let noscript = document.getElementById('facebook-pixel-noscript');
                            if (!noscript) {
                                noscript = document.createElement('noscript');
                                noscript.id = 'facebook-pixel-noscript';
                                noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${data.facebookPixelId}&ev=PageView&noscript=1" />`;
                                document.head.appendChild(noscript);
                            }
                        }
                    }

                    // 3. Google Analytics (GA4)
                    if (data.googleAnalyticsId) {
                        let gaScript = document.getElementById('google-analytics-script');
                        if (!gaScript) {
                            gaScript = document.createElement('script');
                            gaScript.id = 'google-analytics-script';
                            gaScript.async = true;
                            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${data.googleAnalyticsId}`;
                            document.head.appendChild(gaScript);

                            const gaConfig = document.createElement('script');
                            gaConfig.id = 'google-analytics-config';
                            gaConfig.innerHTML = `
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${data.googleAnalyticsId}');
                            `;
                            document.head.appendChild(gaConfig);
                        }
                    }
                }
            } catch (error) {
                console.error('IntegrationsManager Error:', error);
            }
        };

        fetchIntegrations();
    }, []);

    return null;
};

export default IntegrationsManager;
