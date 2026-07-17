'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<FAQ> | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { fetchFAQs(); }, []);

  async function fetchFAQs() {
    setLoading(true);
    const { data } = await supabase
      .from('faqs')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (data) setFaqs(data);
    setLoading(false);
  }

  async function save() {
    if (!editing?.question?.trim() || !editing?.answer?.trim()) return;
    setSaving(true);
    if (editing.id) {
      await supabase.from('faqs').update({
        question: editing.question,
        answer: editing.answer,
        is_active: editing.is_active ?? true,
      }).eq('id', editing.id);
    } else {
      const maxOrder = faqs.reduce((m, f) => Math.max(m, f.sort_order), 0);
      await supabase.from('faqs').insert({
        question: editing.question,
        answer: editing.answer,
        is_active: true,
        sort_order: maxOrder + 1,
      });
    }
    setSaving(false);
    setEditing(null);
    fetchFAQs();
  }

  async function remove(id: number) {
    if (!confirm('حذف هذا السؤال؟')) return;
    await supabase.from('faqs').delete().eq('id', id);
    fetchFAQs();
  }

  async function toggleActive(faq: FAQ) {
    await supabase.from('faqs').update({ is_active: !faq.is_active }).eq('id', faq.id);
    fetchFAQs();
  }

  async function moveUp(faq: FAQ, index: number) {
    if (index === 0) return;
    const prev = faqs[index - 1];
    await supabase.from('faqs').update({ sort_order: faq.sort_order }).eq('id', prev.id);
    await supabase.from('faqs').update({ sort_order: prev.sort_order }).eq('id', faq.id);
    fetchFAQs();
  }

  async function moveDown(faq: FAQ, index: number) {
    if (index === faqs.length - 1) return;
    const next = faqs[index + 1];
    await supabase.from('faqs').update({ sort_order: faq.sort_order }).eq('id', next.id);
    await supabase.from('faqs').update({ sort_order: next.sort_order }).eq('id', faq.id);
    fetchFAQs();
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>إدارة الأسئلة الشائعة</h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 0' }}>
            الأسئلة التي تظهر في شات بوت الموقع — يمكنك إضافتها وتعديلها وترتيبها
          </p>
        </div>
        <button
          onClick={() => setEditing({ question: '', answer: '', is_active: true })}
          style={{
            background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '10px 20px', fontWeight: 800, fontSize: '0.85rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={18} /> إضافة سؤال
        </button>
      </div>

      {/* Edit/Create Modal */}
      {editing && (
        <div
          onClick={() => setEditing(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '24px',
              width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>
              {editing.id ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
            </h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>السؤال</label>
              <input
                value={editing.question}
                onChange={e => setEditing(p => ({ ...p!, question: e.target.value }))}
                placeholder="مثال: التوصيل بياخد قد إيه؟"
                dir="rtl"
                style={{
                  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  padding: '10px 12px', fontSize: '0.9rem', fontFamily: 'inherit',
                  outline: 'none', background: '#f8fafc',
                }}
                onFocus={e => { e.target.style.borderColor = '#22c55e'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>الإجابة</label>
              <textarea
                value={editing.answer}
                onChange={e => setEditing(p => ({ ...p!, answer: e.target.value }))}
                placeholder="اكتب الإجابة هنا..."
                dir="rtl"
                rows={4}
                style={{
                  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  padding: '10px 12px', fontSize: '0.9rem', fontFamily: 'inherit',
                  outline: 'none', background: '#f8fafc', resize: 'vertical',
                }}
                onFocus={e => { e.target.style.borderColor = '#22c55e'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
              <button
                onClick={save}
                disabled={saving || !editing.question?.trim() || !editing.answer?.trim()}
                style={{
                  background: saving ? '#6b7280' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '10px 24px', fontWeight: 800, fontSize: '0.85rem',
                  cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  fontFamily: 'inherit',
                }}
              >
                {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {editing.id ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{
                  background: '#f1f5f9', color: '#6b7280', border: 'none',
                  borderRadius: '10px', padding: '10px 20px', fontWeight: 700,
                  fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#22c55e' }} />
        </div>
      ) : faqs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>لا توجد أسئلة بعد</div>
          <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>اضغط على "إضافة سؤال" لبدء إضافة الأسئلة الشائعة</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              style={{
                background: '#fff',
                border: `1.5px solid ${faq.is_active ? '#e2e8f0' : '#fee2e2'}`,
                borderRadius: '12px',
                overflow: 'hidden',
                opacity: faq.is_active ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 14px', cursor: 'pointer',
                }}
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
              >
                <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, minWidth: '28px' }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                  {faq.question}
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); moveUp(faq, index); }}
                    disabled={index === 0}
                    style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? '#e2e8f0' : '#6b7280', padding: '4px' }}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); moveDown(faq, index); }}
                    disabled={index === faqs.length - 1}
                    style={{ background: 'none', border: 'none', cursor: index === faqs.length - 1 ? 'default' : 'pointer', color: index === faqs.length - 1 ? '#e2e8f0' : '#6b7280', padding: '4px' }}
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); toggleActive(faq); }}
                    style={{
                      background: faq.is_active ? '#dcfce7' : '#f0fdf4',
                      border: 'none', borderRadius: '6px',
                      padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700,
                      cursor: 'pointer', color: faq.is_active ? '#15803d' : '#16a34a',
                      fontFamily: 'inherit',
                    }}
                  >
                    {faq.is_active ? 'ظاهر' : 'مخفي'}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setEditing({ ...faq }); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '6px' }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); remove(faq.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '6px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {expandedId === faq.id && (
                <div style={{ padding: '0 48px 12px 14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
