'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function ContactUs() {
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const { error } = await supabase.from('contact_messages').insert([formData]);

    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      setFormData({ full_name: '', phone: '', email: '', message: '' });
    }
  };

  return (
    <main style={{ backgroundColor: '#f9fafb', color: '#1a1a1a', minHeight: '100vh', padding: '100px 20px', textAlign: 'center', direction: 'rtl' }}>
      <h1 style={{ color: '#2ecc71', fontSize: '3rem', fontWeight: '900', fontStyle: 'italic' }}>تواصل معنا</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '40px', borderRadius: '20px', border: '1px solid #e5e7eb' }}>

        {/* Success Banner */}
        {status === 'success' && (
          <div style={{ backgroundColor: '#052e16', border: '1px solid #16a34a', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#15803d', fontWeight: '900', marginBottom: '4px' }}>تم الإرسال بنجاح!</p>
              <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>فريق زيت أند فلترز هيتواصل معاك قريباً.</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {status === 'error' && (
          <div style={{ backgroundColor: '#2d0000', border: '1px solid #16a34a', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <p style={{ color: '#15803d', fontWeight: '900' }}>❌ عفواً، حدث خطأ أثناء الإرسال. حاول مرة أخرى.</p>
          </div>
        )}

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>الاسم بالكامل *</label>
          <input required type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} placeholder="اسمك الكريم" style={{ width: '100%', padding: '12px', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db', color: '#fff', borderRadius: '8px', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>رقم الموبايل *</label>
          <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="رقمك للتواصل" style={{ width: '100%', padding: '12px', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db', color: '#fff', borderRadius: '8px', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>البريد الإلكتروني <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>(اختياري)</span></label>
          <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@mail.com" style={{ width: '100%', padding: '12px', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db', color: '#fff', borderRadius: '8px', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: '30px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>نوع السيارة أو القطعة المطلوبة *</label>
          <textarea required rows={4} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="مثال: طقم تيل فرامل نيسان صني 2018" style={{ width: '100%', padding: '12px', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db', color: '#fff', borderRadius: '8px', outline: 'none', resize: 'none' }}></textarea>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{ width: '100%', padding: '15px', backgroundColor: status === 'loading' ? '#14532d' : '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '1.2rem', cursor: status === 'loading' ? 'not-allowed' : 'pointer', transition: '0.2s', opacity: status === 'loading' ? 0.8 : 1 }}
        >
          {status === 'loading' ? '⏳ جاري الإرسال...' : 'إرسال الطلب الآن'}
        </button>
      </form>
    </main>
  );
}
