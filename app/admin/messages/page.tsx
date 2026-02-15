'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function AdminMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    setLoading(true);
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setMessages(data);
    setLoading(false);
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setMessages(messages.map(m => m.id === id ? { ...m, status: newStatus } : m));
    }
  };

  const deleteMessage = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
      const { error } = await supabase.from('contact_messages').delete().eq('id', id);
      if (!error) setMessages(messages.filter(m => m.id !== id));
    }
  };

  // وظيفة فتح الواتساب
  const openWhatsApp = (phone: string, name: string) => {
    // تنظيف الرقم من أي مسافات أو رموز
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`أهلاً يا أستاذ ${name}، بخصوص استفسارك على موقع زيت أند فلترز...`);
    window.open(`https://wa.me/2${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div style={{ direction: 'rtl', color: '#fff', fontFamily: 'sans-serif', padding: '20px' }}>
      <h1 style={{ color: '#2ecc71', fontWeight: '900', marginBottom: '30px' }}>بريد الرسائل والطلبات</h1>

      <div style={{ backgroundColor: '#0a0a0a', borderRadius: '15px', border: '1px solid #111', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: '#111', color: '#2ecc71', borderBottom: '2px solid #222' }}>
              <th style={thStyle}>التاريخ</th>
              <th style={thStyle}>العميل</th>
              <th style={thStyle}>الرسالة</th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle}>إدارة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '50px' }}>جاري التحميل...</td></tr>
            ) : messages.map((msg) => (
              <tr key={msg.id} style={{ borderBottom: '1px solid #111', backgroundColor: msg.status === 'new' ? '#1a1a1a' : 'transparent' }}>
                <td style={tdStyle}>{new Date(msg.created_at).toLocaleDateString('ar-EG')}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold' }}>{msg.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>{msg.phone}</div>
                  {/* زرار الواتساب الجديد */}
                  <button 
                    onClick={() => openWhatsApp(msg.phone, msg.name)}
                    style={whatsappBtnStyle}
                  >
                    تواصل واتساب ✅
                  </button>
                </td>
                <td style={tdStyle}>
                  <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.85rem' }}>{msg.subject}</div>
                  <div style={{ fontSize: '0.9rem', color: '#bbb', maxWidth: '350px', marginTop: '5px' }}>{msg.message}</div>
                </td>
                <td style={tdStyle}>
                  <select 
                    value={msg.status} 
                    onChange={(e) => updateStatus(msg.id, e.target.value)}
                    style={{ backgroundColor: '#000', color: msg.status === 'new' ? '#2ecc71' : '#888', border: '1px solid #333', borderRadius: '5px', padding: '5px' }}
                  >
                    <option value="new">جديدة</option>
                    <option value="read">تمت القراءة</option>
                    <option value="replied">تم الرد</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => deleteMessage(msg.id)} style={{ color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer' }}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: '20px', fontSize: '0.9rem' };
const tdStyle = { padding: '15px 20px', verticalAlign: 'top' };
const whatsappBtnStyle = { 
  backgroundColor: '#25D366', 
  color: '#000', 
  border: 'none', 
  borderRadius: '5px', 
  padding: '4px 10px', 
  fontSize: '0.75rem', 
  fontWeight: 'bold', 
  cursor: 'pointer' 
};