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
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    if (data) setMessages(data);
    setLoading(false);
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('فشل تحديث الحالة: ' + error.message);
      return;
    }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
  };

  // ✅ FIXED: now checks count to confirm actual DB deletion
  const deleteMessage = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
      const { error, count } = await supabase
        .from('contact_messages')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        alert('فشل الحذف: ' + error.message);
        return;
      }

      if (count === 0) {
        alert('لم يتم الحذف — تحقق من صلاحيات RLS في Supabase');
        return;
      }

      setMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`أهلاً يا أستاذ ${name}، بخصوص استفسارك على موقع زيت أند فلترز...`);
    window.open(`https://wa.me/2${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div style={{ direction: 'rtl', color: '#1a1a1a', fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#27ae60', fontWeight: '900', marginBottom: '30px' }}>
        بريد الرسائل والطلبات
        <span style={{ fontSize: '0.9rem', color: '#999', marginRight: '12px', fontWeight: '400' }}>
          ({messages.length} رسالة)
        </span>
      </h1>

      <div style={{ backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', color: '#27ae60', borderBottom: '2px solid #eee' }}>
              <th style={thStyle}>التاريخ</th>
              <th style={thStyle}>العميل</th>
              <th style={thStyle}>الرسالة</th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle}>إدارة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>جاري التحميل...</td></tr>
            ) : messages.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>لا توجد رسائل بعد</td></tr>
            ) : messages.map((msg) => (
              <tr key={msg.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: msg.status === 'new' || !msg.status ? '#f0fdf4' : '#fff' }}>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(msg.created_at).toLocaleDateString('ar-EG')}</span>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold', color: '#1a1a1a' }}>{msg.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>{msg.phone}</div>
                  {msg.email && <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '8px' }}>{msg.email}</div>}
                  <button
                    onClick={() => openWhatsApp(msg.phone, msg.full_name)}
                    style={whatsappBtnStyle}
                  >
                    تواصل واتساب ✅
                  </button>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: '0.9rem', color: '#444', maxWidth: '350px' }}>{msg.message}</div>
                </td>
                <td style={tdStyle}>
                  <select
                    value={msg.status || 'new'}
                    onChange={(e) => updateStatus(msg.id, e.target.value)}
                    style={{ backgroundColor: '#f9f9f9', color: msg.status === 'new' || !msg.status ? '#27ae60' : '#888', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="new">جديدة</option>
                    <option value="read">تمت القراءة</option>
                    <option value="replied">تم الرد</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    style={{ color: '#ef4444', background: 'none', border: '1px solid #fee2e2', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: any = { padding: '16px 20px', fontSize: '0.9rem', fontWeight: '700' };
const tdStyle: any = { padding: '15px 20px', verticalAlign: 'top' };
const whatsappBtnStyle: any = {
  backgroundColor: '#25D366',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '5px 12px',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  cursor: 'pointer'
};
