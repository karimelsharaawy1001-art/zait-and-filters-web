'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { Clock, Tag, ArrowLeft } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/images';

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (data) setPosts(data);
      setLoading(false);
    }
    fetchPosts();
  }, []);

  if (loading) return <div style={loaderStyle}>جاري التحميل...</div>;

  return (
    <div style={{ direction: 'rtl', maxWidth: '1100px', margin: '0 auto', padding: '50px 20px', background: '#f9fafb', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <p style={{ color: '#15803d', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px' }}>المدونة</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1a1a1a', margin: '0 0 12px' }}>نصايح وعلوم عربيتك 🚗</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>كل حاجة محتاج تعرفها عن صيانة سيارتك</p>
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '1.1rem' }}>لا توجد مقالات بعد — قريباً! 🛢️</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <div style={cardStyle}>
                {post.cover_image && (
                  <div style={{ height: '200px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                    <img src={optimizeImageUrl(post.cover_image)} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '22px' }}>
                  {post.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {post.tags.map((tag: string, i: number) => (
                        <span key={i} style={tagStyle}><Tag size={11} /> {tag}</span>
                      ))}
                    </div>
                  )}
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1a1a1a', margin: '0 0 10px', lineHeight: 1.5 }}>{post.title}</h2>
                  {post.excerpt && <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 16px' }}>{post.excerpt}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} /> {new Date(post.created_at).toLocaleDateString('ar-EG')}
                    </span>
                    <span style={{ color: '#15803d', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      اقرأ أكثر <ArrowLeft size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const loaderStyle: any = { textAlign: 'center', padding: '100px', color: '#15803d', fontWeight: '900', fontSize: '1.3rem', direction: 'rtl' };
const cardStyle: any = { background: '#ffffff', borderRadius: '20px', border: '1px solid #e5e7eb', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' };
const tagStyle: any = { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #f0fdf4' };
