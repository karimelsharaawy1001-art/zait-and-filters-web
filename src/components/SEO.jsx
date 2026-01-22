import React, { useEffect } from 'react';

/**
 * SEO Component to manage page-level metadata
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Meta description
 * @param {string} props.keywords - Meta keywords
 */
const SEO = ({ title, description, keywords }) => {
    useEffect(() => {
        if (title) {
            document.title = title;
        }

        // Update Meta Description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (description) {
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.name = 'description';
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', description);
        }

        // Update Meta Keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (keywords) {
            if (!metaKeywords) {
                metaKeywords = document.createElement('meta');
                metaKeywords.name = 'keywords';
                document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute('content', keywords);
        }
    }, [title, description, keywords]);

    // Dynamic Integrations Head Logic (Search Console, etc)
    useEffect(() => {
        let unsubscribe = () => { };

        import('../firebase').then(({ db }) => {
            const { doc, onSnapshot } = require('firebase/firestore');
            unsubscribe = onSnapshot(doc(db, 'settings', 'integrations'), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // 1. Google Site Verification
                    if (data.googleVerificationCode) {
                        let googleMeta = document.querySelector('meta[name="google-site-verification"]');
                        if (!googleMeta) {
                            googleMeta = document.createElement('meta');
                            googleMeta.name = 'google-site-verification';
                            document.head.appendChild(googleMeta);
                        }
                        // Clean the code (some users paste the whole tag)
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
                            // Main script
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

                            // No-script fallback
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
                            // External script
                            gaScript = document.createElement('script');
                            gaScript.id = 'google-analytics-script';
                            gaScript.async = true;
                            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${data.googleAnalyticsId}`;
                            document.head.appendChild(gaScript);

                            // Inline config script
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
            });
        });

        return () => unsubscribe();
    }, []);

    return null;
};

export default SEO;
