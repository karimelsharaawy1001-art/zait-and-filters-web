import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base URLs that always exist
  const baseUrls = [
    {
      url: 'https://zaitandfilters.com',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: 'https://zaitandfilters.com/store',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: 'https://zaitandfilters.com/brands',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ];

  // Only fetch products if Supabase is available (runtime)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: products } = await supabase
        .from('products')
        .select('id, updated_at')
        .eq('available', true)
        .limit(1000);

      const productUrls = products?.map((product) => ({
        url: `https://zaitandfilters.com/product/${product.id}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })) || [];

      return [...baseUrls, ...productUrls];
    }
  } catch (error) {
    console.log('Sitemap: Skipping dynamic URLs during build');
  }

  return baseUrls;
}
