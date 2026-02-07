import React, { useEffect } from 'react';
import { databases } from '../appwrite';

/**
 * SEO Component to manage page-level metadata including Open Graph tags
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Meta description
 * @param {string} props.keywords - Meta keywords
 * @param {string} props.image - OG image URL
 * @param {string} props.url - Canonical URL
 * @param {string} props.type - OG type (website, product, article, etc.)
 * @param {Object} props.schema - JSON-LD Schema object
 */
const SEO = ({ title, description, keywords, image, url, type = 'website', schema }) => {
    useEffect(() => {
        // ... previous metadata logic ...
        // Update Page Title
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

        // Open Graph Tags
        const ogTags = {
            'og:title': title,
            'og:description': description,
            'og:image': image || 'https://zait-and-filters-web.vercel.app/logo.png',
            'og:url': url || window.location.href,
            'og:type': type,
            'og:site_name': 'Zait & Filters'
        };

        Object.entries(ogTags).forEach(([property, content]) => {
            if (content) {
                let metaTag = document.querySelector(`meta[property="${property}"]`);
                if (!metaTag) {
                    metaTag = document.createElement('meta');
                    metaTag.setAttribute('property', property);
                    document.head.appendChild(metaTag);
                }
                metaTag.setAttribute('content', content);
            }
        });

        // Twitter Card Tags
        const twitterTags = {
            'twitter:card': 'summary_large_image',
            'twitter:title': title,
            'twitter:description': description,
            'twitter:image': image || 'https://zait-and-filters-web.vercel.app/logo.png'
        };

        Object.entries(twitterTags).forEach(([name, content]) => {
            if (content) {
                let metaTag = document.querySelector(`meta[name="${name}"]`);
                if (!metaTag) {
                    metaTag = document.createElement('meta');
                    metaTag.setAttribute('name', name);
                    document.head.appendChild(metaTag);
                }
                metaTag.setAttribute('content', content);
            }
        });

        // Canonical URL
        if (url) {
            let linkCanonical = document.querySelector('link[rel="canonical"]');
            if (!linkCanonical) {
                linkCanonical = document.createElement('link');
                linkCanonical.setAttribute('rel', 'canonical');
                document.head.appendChild(linkCanonical);
            }
            linkCanonical.setAttribute('href', url);
        }

    }, [title, description, keywords, image, url, type]);

    // JSON-LD Schema Structured Data
    useEffect(() => {
        if (!schema) return;

        let script = document.getElementById('json-ld-schema');
        if (!script) {
            script = document.createElement('script');
            script.id = 'json-ld-schema';
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }

        script.innerHTML = JSON.stringify(schema);

        return () => {
            const existingScript = document.getElementById('json-ld-schema');
            if (existingScript) {
                existingScript.remove();
            }
        };
    }, [schema]);

    return null;
};

export default SEO;
