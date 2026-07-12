'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/images';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      const decodedSlug = decodeURIComponent(slug as string);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', decodedSlug)
        .single();
      if (error) console.error('Supabase error:', error.message);
      if (data) setPost(data);
      setLoading(false);
    }
    fetchPost();
  }, [slug]);

  if (loading) return <div style={loaderStyle}>جاري التحميل...</div>;
  if (!post) return <div style={loaderStyle}>المقال مش موجود 😕</div>;

  return (
    <div style={{ direction: 'rtl', background: '#161616', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: '700', textDecoration: 'none', marginBottom: '30px', fontSize: '0.9rem' }}>
          <ArrowRight size={16} /> العودة للمدونة
        </Link>
        {post.cover_image && (
          <div style={{ borderRadius: '24px', overflow: 'hidden', marginBottom: '35px', maxHeight: '400px' }}>
            <img src={optimizeImageUrl(post.cover_image)} alt={post.title} style={{ width: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.82rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={14} /> {new Date(post.created_at).toLocaleDateString('ar-EG')}
          </span>
          {post.tags?.map((tag: string, i: number) => (
            <span key={i} style={tagStyle}><Tag size={11} /> {tag}</span>
          ))}
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: '900', color: '#f5f5f5', lineHeight: 1.4, margin: '0 0 30px' }}>{post.title}</h1>
        <div style={{ background: '#1c1c1c', borderRadius: '24px', padding: '40px', border: '1px solid #2a2a2a', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#cbd5e1', lineHeight: 2, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
            {post.content}
          </div>
        </div>
        <div style={{ marginTop: '30px', background: '#1a0d0d', borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid #2a0f10' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '1.2rem' }}>ز</div>
          <div>
            <div style={{ fontWeight: '800', color: '#f5f5f5', fontSize: '0.95rem' }}>{post.author}</div>
            <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: '600' }}>فريق زيت أند فلترز</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const loaderStyle: any = { textAlign: 'center', padding: '100px', color: '#f87171', fontWeight: '900', fontSize: '1.3rem', direction: 'rtl' };
const tagStyle: any = { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#1a0d0d', color: '#f87171', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #2a0f10' };
