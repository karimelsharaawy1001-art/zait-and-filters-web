'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CloudUpload, Loader2, CheckCircle2, AlertTriangle, Download, Play, Square } from 'lucide-react';

interface Row { id: string; name?: string; oldUrl: string; newUrl?: string; ok: boolean; error?: string; }

export default function MigrateImagesPage() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [migrated, setMigrated] = useState(0);
  const [failed, setFailed] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const stopRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/migrate-images');
      const d = await r.json();
      if (d.ok) setRemaining(d.remaining);
      else setMsg(d.error || 'تعذّر جلب العدد');
    } catch { setMsg('تعذّر الاتصال بالخادم'); }
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  async function run() {
    setRunning(true); stopRef.current = false; setMsg(null);
    // Fresh run: reset counters and cursor. Already-migrated rows are skipped
    // by the server filter; previously-failed rows are retried.
    setTotal(remaining ?? 0);
    setMigrated(0); setFailed(0); setLog([]);
    let cursor = '';
    let localMigrated = 0, localFailed = 0;

    while (!stopRef.current) {
      let d: any;
      try {
        const r = await fetch('/api/admin/migrate-images', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 10, afterId: cursor }),
        });
        d = await r.json();
      } catch { setMsg('انقطع الاتصال — أعد المحاولة'); break; }

      if (!d.ok) { setMsg(d.error || 'حدث خطأ'); break; }

      localMigrated += d.migrated; localFailed += d.failed;
      setMigrated(localMigrated); setFailed(localFailed);
      setLog(prev => [...d.results, ...prev].slice(0, 500));
      cursor = d.lastId || cursor;

      if (d.processed === 0 || !d.hasMore) break;
    }
    setRunning(false);
    await refreshCount();
  }

  function stop() { stopRef.current = true; }

  function downloadBackup() {
    const rows = log.filter(r => r.ok).map(r => ({ id: r.id, oldUrl: r.oldUrl, newUrl: r.newUrl }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `image-migration-backup-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
  }

  const done = total > 0 ? migrated + failed : 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto', fontFamily: "'Cairo', sans-serif" }} dir="rtl">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 10 }}>
        <CloudUpload size={24} color="#15803d" /> نقل صور المنتجات إلى Cloudinary
      </h1>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>
        ينقل صور المنتجات المستضافة على روابط خارجية (غير Cloudinary) إلى حساب Cloudinary الخاص بنا، ويحدّث رابط الصورة تلقائياً. آمن للتكرار — يتخطى الصور المنقولة مسبقاً.
      </p>

      {msg && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>⚠️ {msg}</div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <Stat label="متبقّي" value={remaining ?? '—'} color="#c2410c" bg="#fff7ed" />
        <Stat label="تم نقلها" value={migrated} color="#15803d" bg="#f0fdf4" />
        <Stat label="فشلت" value={failed} color="#dc2626" bg="#fef2f2" />
      </div>

      {total > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ height: 12, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#15803d)', transition: 'width 0.3s' }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: 6, fontWeight: 700 }}>{done} / {total} ({pct}%)</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {!running ? (
          <button onClick={run} disabled={remaining === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: remaining === 0 ? '#e5e7eb' : 'linear-gradient(135deg,#15803d,#166534)', color: remaining === 0 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', cursor: remaining === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            <Play size={16} /> بدء النقل
          </button>
        ) : (
          <button onClick={stop}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Square size={15} /> إيقاف
          </button>
        )}
        {running && <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}><Loader2 size={16} className="animate-spin" /> جاري النقل...</span>}
        {log.some(r => r.ok) && (
          <button onClick={downloadBackup}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: '#fff', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 10, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={16} /> تحميل نسخة احتياطية (روابط قديمة/جديدة)
          </button>
        )}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #eee', fontWeight: 800, fontSize: '0.82rem', color: '#475569' }}>السجل</div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {log.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #f5f5f5', fontSize: '0.8rem' }}>
                {r.ok ? <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} /> : <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />}
                <span style={{ flex: 1, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || r.id}</span>
                {!r.ok && <span style={{ color: '#dc2626', fontSize: '0.72rem' }}>{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, bg }: { label: string; value: any; color: string; bg: string }) {
  return (
    <div style={{ flex: 1, minWidth: 120, background: bg, borderRadius: 12, padding: '12px 16px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color }}>{value}</div>
    </div>
  );
}
