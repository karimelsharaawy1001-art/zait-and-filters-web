export default function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    name: 'Zait and Filters | زيت أند فلترز',
    description: 'متجر قطع غيار السيارات الأصلية في مصر',
    url: 'https://zaitandfilters.com',
    logo: 'https://zaitandfilters.com/logo.png',
    image: 'https://zaitandfilters.com/og-image.jpg',
    telephone: '+201023862436',
    email: 'orders@sales.zaitandfilters.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'EG',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 30.0444,
      longitude: 31.2357,
    },
    priceRange: '$$',
    currenciesAccepted: 'EGP',
    paymentAccepted: 'Cash, Credit Card, Debit Card',
    openingHours: 'Mo-Sa 09:00-21:00',
    sameAs: [
      'https://www.facebook.com/zaitandfilters',
      'https://www.instagram.com/zaitandfilters',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Zait and Filters',
    url: 'https://zaitandfilters.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://zaitandfilters.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: 'https://zaitandfilters.com',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
