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



  const openWhatsApp = (phone: string, name: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `أهلاً يا أستاذ ${name}، بخصوص استفسارك على موقع زيت أند فلترز:\n\n"${message}"\n\n`
    );
    window.open(`https://wa.me/2${cleanPhone}?text=${text}`, '_blank');
  };



  return (
    <div style={{ direction: 'rtl', color: '#1a1a1a', fontFamily: 'sans-serif', padding: 'clamp(12px, 3vw, 20px)', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 640px) {
          .msg-desktop-table { display: none !important; }
          .msg-mobile-cards  { display: flex !important; }
        }
        @media (min-width: 641px) {
          .msg-mobile-cards { display: none !important; }
        }
      `}</style>

      <h1 style={{ color: '#27ae60', fontWeight: '900', marginBottom: '20px', fontSize: 'clamp(1.1rem, 5vw, 1.5rem)' }}>
        رسائل العملاء
        <span style={{ fontSize: '0.85rem', color: '#999', marginRight: '10px', fontWeight: '400' }}>
          ({messages.length} رسالة)
        </span>
      </h1>

      {/* ── Desktop Table ── */}
      <div className="msg-desktop-table" style={{ backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '600px' }}>
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
                    <button onClick={() => openWhatsApp(msg.phone, msg.full_name, msg.message)} style={whatsappBtnStyle}>
                      تواصل واتساب ✅
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '0.9rem', color: '#444', maxWidth: '350px' }}>{msg.message}</div>
                  </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {(msg.status === 'new' || !msg.status) && (
                          <button onClick={() => updateStatus(msg.id, 'read')}
                            style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>
                            ✓ قراءة
                          </button>
                        )}
                        <select value={msg.status || 'new'} onChange={(e) => updateStatus(msg.id, e.target.value)}
                          style={{ backgroundColor: '#f9f9f9', color: msg.status === 'new' || !msg.status ? '#27ae60' : '#888', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <option value="new">جديدة</option>
                          <option value="read">تمت القراءة</option>
                          <option value="replied">تم الرد</option>
                        </select>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteMessage(msg.id)}
                        style={{ color: '#ef4444', background: 'none', border: '1px solid #fee2e2', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        حذف
                      </button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="msg-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', background: '#fff', borderRadius: '12px' }}>جاري التحميل...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', background: '#fff', borderRadius: '12px' }}>لا توجد رسائل بعد</div>
        ) : messages.map((msg) => (
          <div key={msg.id} style={{ backgroundColor: msg.status === 'new' || !msg.status ? '#f0fdf4' : '#fff', borderRadius: '12px', border: `1px solid ${msg.status === 'new' || !msg.status ? '#bbf7d0' : '#eee'}`, padding: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            {/* Top row: name + date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: '800', color: '#1a1a1a', fontSize: '0.92rem' }}>{msg.full_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '2px' }}>{msg.phone}</div>
                {msg.email && <div style={{ fontSize: '0.72rem', color: '#aaa' }}>{msg.email}</div>}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#999', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {new Date(msg.created_at).toLocaleDateString('ar-EG')}
              </div>
            </div>
            {/* Message */}
            <div style={{ fontSize: '0.88rem', color: '#444', lineHeight: '1.5', background: '#f9fafb', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', border: '1px solid #f0f0f0' }}>
              {msg.message}
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(msg.status === 'new' || !msg.status) && (
                <button onClick={() => updateStatus(msg.id, 'read')}
                  style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}>
                  ✓ تحديد كمقروءة
                </button>
              )}
              <button onClick={() => openWhatsApp(msg.phone, msg.full_name, msg.message)} style={{ ...whatsappBtnStyle, fontSize: '0.8rem', padding: '7px 14px' }}>
                واتساب ✅
              </button>
              <select value={msg.status || 'new'} onChange={(e) => updateStatus(msg.id, e.target.value)}
                style={{ flex: 1, minWidth: '110px', backgroundColor: '#f9f9f9', color: msg.status === 'new' || !msg.status ? '#27ae60' : '#888', border: '1px solid #ddd', borderRadius: '8px', padding: '7px 10px', fontSize: '0.82rem', cursor: 'pointer' }}>
                <option value="new">جديدة</option>
                <option value="read">تمت القراءة</option>
                <option value="replied">تم الرد</option>
              </select>
              <button onClick={() => deleteMessage(msg.id)}
                style={{ color: '#ef4444', background: 'none', border: '1px solid #fee2e2', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



const thStyle: any = { padding: '14px 16px', fontSize: '0.88rem', fontWeight: '700' };
const tdStyle: any = { padding: '12px 16px', verticalAlign: 'top' };
const whatsappBtnStyle: any = {
  backgroundColor: '#25D366',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '5px 12px',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  cursor: 'pointer',
};