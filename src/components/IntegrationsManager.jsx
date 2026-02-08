import React, { useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * IntegrationsManager handles global third-party scripts and verification tags.
 * It is designed to be a non-lazy component mounted at the top level (App.jsx)
 * to ensure tracking and verification tags are injected as soon as the app initializes.
 */
const IntegrationsManager = () => {
    useEffect(() => {
        const fetchIntegrations = async () => {
            try {
                // Fetch from Firestore 'settings/integrations'
                const docRef = doc(db, 'settings', 'integrations');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // 1. Google Site Verification (Meta Tag Method)
                    if (data.googleVerificationCode) {
                        let googleMeta = document.querySelector('meta[name="google-site-verification"]');
                        if (!googleMeta) {
                            googleMeta = document.createElement('meta');
                            googleMeta.name = 'google-site-verification';
                            document.head.appendChild(googleMeta);
                        }

                        let code = data.googleVerificationCode;
                        if (code.includes('content="')) {
                            code = code.split('content="')[1].split('"')[0];
                        }
                        googleMeta.setAttribute('content', code);
                    }

                    // 2. Facebook Pixel
                    if (data.facebookPixelId) {
                        if (!document.getElementById('facebook-pixel-script')) {
                            const fPixelScript = document.createElement('script');
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

                            const noscript = document.createElement('noscript');
                            noscript.id = 'facebook-pixel-noscript';
                            noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${data.facebookPixelId}&ev=PageView&noscript=1" />`;
                            document.head.appendChild(noscript);
                        }
                    }

                    // 3. Google Analytics (GA4)
                    if (data.googleAnalyticsId) {
                        if (!document.getElementById('google-analytics-script')) {
                            const gaScript = document.createElement('script');
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
                console.error('IntegrationsManager Firestore Error:', error);
            }
        };

        fetchIntegrations();
    }, []);

    return null;
};

export default IntegrationsManager;
