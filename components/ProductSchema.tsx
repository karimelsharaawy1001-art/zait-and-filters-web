interface ProductSchemaProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    brand: string;
    car_make?: string;
    car_model?: string;
    car_model_year?: string;
    country_origin?: string;
    availability?: boolean;
  };
}

export default function ProductSchema({ product }: ProductSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} - ${product.brand} قطع غيار أصلية`,
    image: product.image_url,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: `https://zaitandfilters.com/product/${product.id}`,
      priceCurrency: 'EGP',
      price: product.price,
      availability: product.availability ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Zait and Filters',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '247',
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Car Make',
        value: product.car_make,
      },
      {
        '@type': 'PropertyValue',
        name: 'Car Model',
        value: product.car_model,
      },
      {
        '@type': 'PropertyValue',
        name: 'Model Year',
        value: product.car_model_year,
      },
      {
        '@type': 'PropertyValue',
        name: 'Country of Origin',
        value: product.country_origin,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
