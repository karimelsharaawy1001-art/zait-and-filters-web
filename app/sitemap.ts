import { MetadataRoute } from 'next';
import { supabase } from '@/app/lib/supabase';

const baseUrl = 'https://zaitandfilters.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all products
  const { data: products } = await supabase
    .from('products')
    .select('slug, id, updated_at')
    .eq('is_active', true);

  const productUrls = (products || []).map((p) => ({
    url: `${baseUrl}/products/${p.slug || p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Fetch all categories
  const { data: categories } = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true);

  const uniqueCategories = [...new Set((categories || []).map((p) => p.category).filter(Boolean))];

  const categoryUrls = uniqueCategories.map((cat) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/store`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...categoryUrls,
    ...productUrls,
  ];
}