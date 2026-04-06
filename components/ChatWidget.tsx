'use client';
import { useState, useEffect, useRef } from 'react';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  car_make: string | null;
  car_model: string | null;
  car_model_year: string | null;
  regular_price: number;
  sale_price: number;
  slug: string;
  image_url: string | null;
  link: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
}

const SUGGESTIONS = [
  'عايز أعرف حالة أوردري',
  'محتاج قطعة غيار لسيارتي',
  'ازاي أدفع؟',
  'بيتوصل لفين؟',
];

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, index }: { product: Product; index: number }) {
  const hasDiscount = product.sale_price > 0 && product.sale_price < product.regular_price;
  const price       = hasDiscount ? product.sale_price : product.regular_price;
  const discountPct = hasDiscount
    ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
    : 0;

  return (
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: '#fff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px 14px',
        marginBottom: '8px',
        transition: 'all 0.2s',
        cursor: 'pointer',
        direction: 'rtl',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#22c55e';
        el.style.boxShadow   = '0 4px 16px rgba(34,197,94,0.15)';
        el.style.transform   = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#e2e8f0';
        el.style.boxShadow   = 'none';
        el.style.transform   = 'translateY(0)';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '7px',
            background: 'linear-gradient(135deg,#22c55e,#15803d)',
            color: '#fff', fontSize: '0.7rem', fontWeight: '900',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <span style={{
            fontSize: '0.85rem', fontWeight: '800', color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {product.name}
          </span>
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#15803d', whiteSpace: 'nowrap' }}>
            {price.toLocaleString('ar-EG')} ج.م
          </div>
          {hasDiscount && (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through', textAlign: 'left' }}>
              {product.regular_price.toLocaleString('ar-EG')} ج.م
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '5px', marginTop: '9px', flexWrap: 'wrap' }}>
        {product.brand && (
          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: '700' }}>
            {product.brand}
          </span>
        )}
        {product.car_make && (
          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#15803d', fontSize: '0.72rem', fontWeight: '700' }}>
            {product.car_make}
          </span>
        )}
        {product.car_model && (
          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#faf5ff', color: '#7c3aed', fontSize: '0.72rem', fontWeight: '700' }}>
            {product.car_model}
          </span>
        )}
        {product.car_model_year && (
          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#fff7ed', color: '#c2410c', fontSize: '0.72rem', fontWeight: '700' }}>
            {product.car_model_year}
          </span>
        )}
        {hasDiscount && (
          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontSize: '0.72rem', fontWeight: '800' }}>
            خصم {discountPct}%
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '9px', paddingTop: '9px',
        borderTop: '1px dashed #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '800' }}>اضغط لعرض المنتج</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
        <span style={{
          fontSize: '0.68rem', color: '#cbd5e1', direction: 'ltr',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px',
        }}>
          {product.link.replace('https://', '')}
        </span>
      </div>
    </a>
  );
}

// ── Products List ─────────────────────────────────────────────────────────────
function ProductsList({ products }: { products: Product[] }) {
  return (
    <div style={{
      width: '100%', marginTop: '8px',
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: '16px', padding: '12px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        marginBottom: '10px', paddingBottom: '8px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '8px',
          background: 'linear-gradient(135deg,#22c55e,#15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>🛒</div>
        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#15803d' }}>
          {products.length} منتج متاح
        </span>
        <span style={{
          marginRight: 'auto', fontSize: '0.72rem', color: '#94a3b8',
          background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: '600',
        }}>
          اضغط على أي منتج للشراء
        </span>
      </div>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'أهلاً بيك! أنا شوكت، مساعدك الذكي في زيت اند فلترز 👋\nقولي إيه اللي تحتاجه — سواء تتابع أوردر، تلاقي قطعة غيار، أو تعرف الزيت المناسب لعربيتك 🔧',
    },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(text?: string) {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data     = await res.json();
      const reply    = data.reply    || 'معلش، حصل خطأ. جرب تاني.';
      const products = data.products || null;

      setMessages(prev => [...prev, { role: 'assistant', content: reply, products }]);
      if (!open) setUnread(prev => prev + 1);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'في مشكلة في الاتصال، جرب بعد شوية.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <>
      <style>{`
        @keyframes zf-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes zf-fadeup { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes zf-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes zf-dots   { 0%,80%,100%{opacity:0} 40%{opacity:1} }
        .zf-msg-user { animation: zf-fadeup 0.2s ease; }
        .zf-msg-bot  { animation: zf-fadeup 0.2s ease; }
        .zf-dot1 { animation: zf-dots 1.2s infinite 0s; }
        .zf-dot2 { animation: zf-dots 1.2s infinite 0.2s; }
        .zf-dot3 { animation: zf-dots 1.2s infinite 0.4s; }
        .zf-input:focus      { outline: none; }
        .zf-suggestion:hover { background: #e8f5e9 !important; }
        .zf-send:hover       { background: #1a6b3a !important; }
        .zf-close:hover      { background: rgba(255,255,255,0.25) !important; }
      `}</style>

      {/* ── Floating Button — message icon only, NO avatar ── */}
      <div
        onClick={() => setOpen(true)}
        style={{
          display: open ? 'none' : 'flex',
          position: 'fixed', bottom: '24px', left: '24px',
          width: '60px', height: '60px',
          background: 'linear-gradient(135deg, #22c55e, #15803d)',
          borderRadius: '50%', cursor: 'pointer', zIndex: 9999,
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(34,197,94,0.5)',
          animation: 'zf-bounce 2.5s ease-in-out infinite',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {unread > 0 && (
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#fff', border: '2px solid #fff' }}>
            {unread}
          </div>
        )}
      </div>

      {/* ── Chat Window ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '24px', zIndex: 9999,
          width: 'min(400px, calc(100vw - 32px))',
          height: 'min(620px, calc(100vh - 48px))',
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'zf-fadeup 0.25s ease',
          direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>

          {/* Header — شوكت avatar + name */}
          <div style={{ background: 'linear-gradient(135deg, #15803d, #22c55e)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)' }}>
              <img
                src="/shawkat.png"
                alt="شوكت"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '900', fontSize: '1rem', color: '#fff' }}>شوكت</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: '1px' }}>
                المساعد الذكي • زيت اند فلترز
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#86efac', animation: 'zf-pulse 2s infinite' }} />
                متاح دلوقتي
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="zf-close"
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', transition: 'background 0.15s', flexShrink: 0 }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f0fdf4' }}>
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'zf-msg-user' : 'zf-msg-bot'}>
                <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end', alignItems: 'flex-end', gap: '8px' }}>
                  {/* شوكت avatar next to bot messages */}
                  {msg.role === 'assistant' && (
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, marginBottom: '2px', border: '2px solid #22c55e' }}>
                      <img src="/shawkat.png" alt="شوكت" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '82%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: msg.role === 'user' ? '#dcfce7' : '#fff',
                    color: '#1a1a1a', fontSize: '0.88rem', lineHeight: '1.55',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                </div>

                {msg.role === 'assistant' && msg.products && msg.products.length > 0 && (
                  <div style={{ marginRight: '38px', marginTop: '6px' }}>
                    <ProductsList products={msg.products} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading dots — شوكت avatar */}
            {loading && (
              <div className="zf-msg-bot" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid #22c55e' }}>
                  <img src="/shawkat.png" alt="شوكت" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {['zf-dot1','zf-dot2','zf-dot3'].map(cls => (
                    <div key={cls} className={cls} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div style={{ padding: '10px 14px 0', background: '#fff', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} className="zf-suggestion"
                  style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', color: '#15803d', cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 14px', background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <input
              ref={inputRef} className="zf-input"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} placeholder="اكتب رسالتك هنا..."
              disabled={loading}
              style={{ flex: 1, height: '42px', padding: '0 14px', border: '1.5px solid #e5e5e5', borderRadius: '21px', fontSize: '0.88rem', color: '#1a1a1a', background: '#f9fafb', transition: 'border 0.15s' }}
              onFocus={e => e.target.style.borderColor = '#22c55e'}
              onBlur={e  => e.target.style.borderColor = '#e5e5e5'}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="zf-send"
              style={{ width: '42px', height: '42px', borderRadius: '50%', background: input.trim() && !loading ? '#22c55e' : '#e5e5e5', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? '#fff' : '#aaa'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}