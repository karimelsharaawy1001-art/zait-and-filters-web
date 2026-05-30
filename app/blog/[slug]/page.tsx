import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import BlogPostClient from './BlogPostClient';

const BASE_URL = 'https://zaitandfilters.com';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, content, cover_image, tags, author, created_at')
    .eq('slug', decodedSlug)
    .single();

  if (!post) {
    return {
      title: 'مقال | زيت أند فلترز',
      description: 'مدونة زيت أند فلترز لنصائح صيانة السيارات في مصر.',
    };
  }

  const canonicalUrl = `${BASE_URL}/blog/${slug}`;
  const description = post.excerpt ||
    (post.content ? post.content.slice(0, 160).replace(/\n/g, ' ') : '') ||
    'نصائح صيانة السيارات وقطع الغيار الأصلية في مصر من زيت أند فلترز.';

  const keywords = [
    ...(post.tags || []),
    'صيانة سيارات مصر', 'نصائح قطع غيار', 'زيت أند فلترز مدونة',
    'car maintenance egypt', post.title,
  ].filter(Boolean);

  return {
    title: `${post.title} | زيت أند فلترز`,
    description,
    keywords,
    authors: [{ name: post.author || 'زيت أند فلترز' }],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.title,
      description,
      url: canonicalUrl,
      siteName: 'زيت أند فلترز',
      locale: 'ar_EG',
      type: 'article',
      publishedTime: post.created_at,
      images: post.cover_image
        ? [{ url: post.cover_image, width: 1200, height: 630, alt: post.title }]
        : [{ url: `${BASE_URL}/og-image.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: post.cover_image ? [post.cover_image] : [`${BASE_URL}/og-image.jpg`],
    },
  };
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}
