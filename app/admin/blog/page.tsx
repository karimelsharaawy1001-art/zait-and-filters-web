'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Plus, Trash2, Eye, EyeOff, Save, X, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';


const emptyPost = { title: '', slug: '', excerpt: '', content: '', cover_image: '', tags: '', published: false };


export default function AdminBlog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [form, setForm] = useState(emptyPost);
  const [saving, setSaving] = useState(false);


  async function fetchPosts() {
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
  }

  useEffect(() => {
    fetchPosts();
  }, []);


  function openNew() {
    setForm(emptyPost);
    setEditingPost(null);
    setShowForm(true);
  }

  function openEdit(post: any) {
    setForm({ ...post, tags: post.tags?.join(', ') || '' });
    setEditingPost(post);
    setShowForm(true);
  }

  function handleTitleChange(title: string) {
    const slug = title.trim()
      .replace(/\s+/g, '-')
      .replace(/[^\u0621-\u064Aa-zA-Z0-9-]/g, '')
      .toLowerCase();
    setForm(f => ({ ...f, title, slug }));
  }

  async function savePost() {
    if (!form.title || !form.slug) { toast.error('العنوان والـ slug مطلوبين'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };
      if (editingPost) {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', editingPost.id);
        if (error) throw error;
        toast.success('تم تحديث المقال ✅');
      } else {
        const { error } = await supabase.from('blog_posts').insert(payload);
        if (error) throw error;
        toast.success('تم نشر المقال ✅');
      }
      setShowForm(false);
      fetchPosts();
    } catch (err: any) {
      toast.error('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(post: any) {
    const { error } = await supabase.from('blog_posts').update({ published: !post.published }).eq('id', post.id);
    if (error) { toast.error('فشل التحديث'); return; }
    toast.success(post.published ? 'تم إخفاء المقال' : 'تم نشر المقال ✅');
    fetchPosts();
  }

  async function deletePost(id: string) {
    if (!confirm('هل أنت متأكد من حذف المقال؟')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) { toast.error('فشل الحذف'); return; }
    toast.success('تم الحذف ✅');
    fetchPosts();
  }


  return (
    <div style={{ padding: 'clamp(14px, 4vw, 30px)', direction: 'rtl', maxWidth: '1100px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)', fontWeight: '900', margin: 0 }}>📝 إدارة المدونة</h1>
        <button onClick={openNew} style={greenBtn}><Plus size={18} /> مقال جديد</button>
      </div>

      {/* Posts Table */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #eee', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: '#fcfcfc', borderBottom: '1px solid #eee' }}>
              <th style={th}>العنوان</th>
              <th style={th}>Slug</th>
              <th style={th}>التاريخ</th>
              <th style={th}>الحالة</th>
              <th style={th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr key={post.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={td}><div style={{ fontWeight: '700', color: '#1a1a1a' }}>{post.title}</div></td>
                <td style={td}><code style={{ fontSize: '0.8rem', color: '#888', background: '#f8f9fa', padding: '3px 8px', borderRadius: '6px' }}>{post.slug}</code></td>
                <td style={td}><span style={{ fontSize: '0.82rem', color: '#888' }}>{new Date(post.created_at).toLocaleDateString('ar-EG')}</span></td>
                <td style={td}>
                  <span style={{ background: post.published ? '#f0fdf4' : '#fff7ed', color: post.published ? '#15803d' : '#c2410c', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                    {post.published ? 'منشور' : 'مخفي'}
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEdit(post)} style={iconBtn}><Edit2 size={15} /></button>
                    <button onClick={() => togglePublish(post)} style={iconBtn}>{post.published ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button onClick={() => deletePost(post.id)} style={delBtn}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '750px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '28px', padding: '35px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ margin: 0, fontWeight: '900' }}>{editingPost ? 'تعديل المقال' : 'مقال جديد'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: '#f8f9fa', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>العنوان *</label>
                <input value={form.title} onChange={e => handleTitleChange(e.target.value)} style={inputStyle} placeholder="مثال: إمتى أغير زيت عربيتي؟" />
              </div>
              <div>
                <label style={labelStyle}>Slug (رابط المقال) *</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} placeholder="mta-aghyr-zyt-arbyty" dir="ltr" />
              </div>
              <div>
                <label style={labelStyle}>صورة الغلاف (URL)</label>
                <input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} style={inputStyle} placeholder="https://..." dir="ltr" />
              </div>
              <div>
                <label style={labelStyle}>المقدمة (excerpt)</label>
                <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="ملخص قصير للمقال يظهر في القائمة..." />
              </div>
              <div>
                <label style={labelStyle}>محتوى المقال *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} style={{ ...inputStyle, minHeight: '250px', resize: 'vertical', lineHeight: '1.8' }} placeholder="اكتب محتوى المقال هنا..." />
              </div>
              <div>
                <label style={labelStyle}>التاجات (افصل بينهم بفاصلة)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inputStyle} placeholder="مثال: زيت, صيانة, فلتر" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="published" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="published" style={{ cursor: 'pointer', fontWeight: '700', color: '#555' }}>نشر المقال فوراً</label>
              </div>
              <button onClick={savePost} disabled={saving} style={{ ...greenBtn, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
                <Save size={18} /> {saving ? 'جاري الحفظ...' : 'حفظ المقال'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const th: any = { padding: '16px 20px', fontSize: '0.82rem', color: '#888', fontWeight: 'bold' };
const td: any = { padding: '16px 20px', fontSize: '0.92rem', color: '#333', verticalAlign: 'middle' };
const iconBtn: any = { background: '#f8f9fa', border: '1px solid #eee', color: '#555', padding: '8px', borderRadius: '10px', cursor: 'pointer' };
const delBtn: any = { background: '#fff5f5', border: '1px solid #ffebeb', color: '#e74c3c', padding: '8px', borderRadius: '10px', cursor: 'pointer' };
const greenBtn: any = { display: 'flex', alignItems: 'center', gap: '8px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 22px', cursor: 'pointer', fontWeight: '800', fontSize: '0.95rem' };
const labelStyle: any = { fontSize: '0.8rem', fontWeight: '700', color: '#666', display: 'block', marginBottom: '5px' };
const inputStyle: any = { background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '10px 14px', fontSize: '0.92rem', color: '#1a1a1a', width: '100%', outline: 'none', boxSizing: 'border-box' as const };
