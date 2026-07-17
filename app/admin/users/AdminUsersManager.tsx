'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminRow { id: string; email: string; }

export default function AdminUsersManager({
  admins,
  currentUserId,
}: {
  admins: AdminRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(payload: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/manage-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ ok: false, error: 'استجابة غير صالحة من الخادم' }));
      setMsg({ ok: !!data.ok, text: data.ok ? (data.message || 'تم بنجاح') : (data.error || 'حدث خطأ') });
      if (data.ok) {
        setEmail('');
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: 'تعذّر الاتصال بالخادم' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {msg && (
        <div
          style={{
            marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700,
            background: msg.ok ? '#f0fdf4' : '#f0fdf4',
            border: `1px solid ${msg.ok ? '#bbf7d0' : '#dcfce7'}`,
            color: msg.ok ? '#15803d' : '#16a34a',
          }}
        >
          {msg.ok ? `✅ ${msg.text}` : `⚠️ ${msg.text}`}
        </div>
      )}

      {/* Add admin form */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (!busy) call({ action: 'add', email }); }}
        style={{
          display: 'flex', gap: '10px', flexWrap: 'wrap',
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
          padding: '16px', marginBottom: '24px',
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني للمشرف الجديد"
          style={{
            flex: 1, minWidth: '220px', padding: '11px 14px',
            border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '0.9rem',
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '11px 22px', background: busy ? '#9ca3af' : 'linear-gradient(135deg, #15803d, #166534)',
            color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800,
            fontSize: '0.88rem', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {busy ? '...جارٍ' : '➕ إضافة مشرف'}
        </button>
      </form>

      {/* Current admins */}
      <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: '#1a1a1a' }}>
        المشرفون الحاليون ({admins.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {admins.map((a) => (
          <div
            key={a.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span style={{ fontSize: '1.1rem' }}>🛡️</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a1a1a', wordBreak: 'break-all' }}>
                {a.email}
                {a.id === currentUserId && (
                  <span style={{ marginRight: '8px', fontSize: '0.7rem', color: '#15803d', fontWeight: 800 }}>(أنت)</span>
                )}
              </span>
            </div>
            {a.id !== currentUserId && (
              <button
                onClick={() => { if (!busy) call({ action: 'remove', userId: a.id }); }}
                disabled={busy}
                style={{
                  padding: '7px 14px', background: '#f0fdf4', color: '#16a34a',
                  border: '1px solid #dcfce7', borderRadius: '9px', fontWeight: 700,
                  fontSize: '0.78rem', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                إزالة الأدمن
              </button>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>لا يوجد مشرفون.</div>
        )}
      </div>
    </div>
  );
}
