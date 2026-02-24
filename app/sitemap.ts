import { MetadataRoute } from 'next';
import { supabase } from '@/app/lib/supabase';

export const revalidate = 3600; // regenerate every 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://zaitandfilters.com';

  // ── Fetch all products ──
  const { data: products } = await supabase
    .from('products')
    .select('id, created_at, updated_at');

  // ── Fetch all unique categories ──
  const { data: categoryRows } = await supabase
    .from('products')
    .select('category');

  const uniqueCategories = [
    ...new Set(categoryRows?.map((p) => p.category?.trim()).filter(Boolean)),
  ];

  // ── Static pages ──
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/store`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/checkout`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // ── Product pages ──
  const productPages: MetadataRoute.Sitemap = (products ?? []).map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: new Date(product.updated_at || product.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // ── Category pages ──
  const categoryPages: MetadataRoute.Sitemap = uniqueCategories.map((cat) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(cat as string)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
