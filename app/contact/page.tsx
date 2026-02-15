'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase'; // تأكد من المسار

export default function ContactUs() {
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('جاري الإرسال...');

    const { error } = await supabase.from('contact_messages').insert([formData]);

    if (error) {
      console.error(error);
      setStatus('عفواً، حدث خطأ أثناء الإرسال. حاول مرة أخرى.');
    } else {
      setStatus('تم إرسال طلبك بنجاح! فريق زيت أند فلترز هيتواصل معاك قريباً.');
      setFormData({ full_name: '', phone: '', email: '', message: '' }); // تصفير الفورم
    }
  };

  return (
    <main style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '100px 20px', textAlign: 'center', direction: 'rtl' }}>
      <h1 style={{ color: '#2ecc71', fontSize: '3rem', fontWeight: '900', fontStyle: 'italic' }}>تواصل معنا</h1>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#0a0a0a', padding: '40px', borderRadius: '20px', border: '1px solid #111' }}>
        
        {status && <p style={{ color: status.includes('بنجاح') ? '#2ecc71' : '#ff4d4d', marginBottom: '20px', fontWeight: 'bold' }}>{status}</p>}

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>الاسم بالكامل *</label>
          <input required type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} placeholder="اسمك الكريم" style={{ width: '100%', padding: '12px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>رقم الموبايل *</label>
          <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="رقمك للتواصل" style={{ width: '100%', padding: '12px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>البريد الإلكتروني <span style={{ color: '#666', fontSize: '0.8rem' }}>(اختياري)</span></label>
          <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@mail.com" style={{ width: '100%', padding: '12px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: '30px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>نوع السيارة أو القطعة المطلوبة *</label>
          <textarea required rows={4} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="مثال: طقم تيل فرامل نيسان صني 2018" style={{ width: '100%', padding: '12px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none', resize: 'none' }}></textarea>
        </div>

        <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#2ecc71', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer' }}>
          إرسال الطلب الآن
        </button>

      </form>
    </main>
  );
}