import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Premium Breadcrumbs Component
 * @param {Object} props
 * @param {Array} props.extraSteps - Optional extra steps to append (e.g. {name: 'Product X', path: '/product/123'})
 */
const Breadcrumbs = ({ extraSteps = [] }) => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const isAr = i18n.language === 'ar';

    const pathnames = location.pathname.split('/').filter((x) => x);

    // Breadcrumb Schema (JSON-LD)
    const breadcrumbList = [
        {
            '@type': 'ListItem',
            position: 1,
            name: t('home'),
            item: window.location.origin
        }
    ];

    const breadcrumbs = [
        { name: <Home className="h-4 w-4" />, path: '/', label: t('home') }
    ];

    // Build breadcrumbs based on paths
    if (extraSteps.length === 0) {
        let currentPath = '';
        pathnames.forEach((value, index) => {
            currentPath += `/${value}`;

            // Skip some system paths or IDs if we're going to use extraSteps
            const isLast = index === pathnames.length - 1;
            const name = t(`nav.${value}`) || value.charAt(0).toUpperCase() + value.slice(1);

            breadcrumbs.push({
                name,
                path: currentPath,
                label: name
            });

            breadcrumbList.push({
                '@type': 'ListItem',
                position: breadcrumbList.length + 1,
                name: name,
                item: `${window.location.origin}${currentPath}`
            });
        });
    }
    // Add extra steps if provided
    extraSteps.forEach((step) => {
        breadcrumbs.push({
            name: step.name,
            path: step.path,
            label: step.name
        });

        breadcrumbList.push({
            '@type': 'ListItem',
            position: breadcrumbList.length + 1,
            name: step.name,
            item: `${window.location.origin}${step.path}`
        });
    });

    // Add JSON-LD to head
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbList
    };

    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <script type="application/ld+json">
                {JSON.stringify(schema)}
            </script>
            <ol className={`flex items-center flex-wrap gap-2 text-sm font-medium text-gray-500 ${isAr ? 'flex-row-reverse' : ''}`}>
                {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                        {index > 0 && (
                            <ChevronRight className={`h-4 w-4 mx-2 text-gray-300 ${isAr ? 'rotate-180' : ''}`} />
                        )}
                        {index === breadcrumbs.length - 1 ? (
                            <span className="text-[#FF8C00] font-bold truncate max-w-[200px]">
                                {crumb.name}
                            </span>
                        ) : (
                            <Link
                                to={crumb.path}
                                className="hover:text-gray-900 transition-colors flex items-center gap-1"
                            >
                                {crumb.name}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
