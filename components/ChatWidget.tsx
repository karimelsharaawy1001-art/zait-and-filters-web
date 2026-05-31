'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, ChevronDown } from 'lucide-react';

const WA_LINK = 'https://wa.me/201206777292?text=مرحبًا%20،%20أود%20الحصول%20على%20مزيد%20من%20المعلومات%20حول%20خدماتكم.';

const FAQS = [
  { q: 'مكانكوا فين؟', a: 'المقر الإداري والمخازن في التجمع الخامس بالقاهرة.' },
  { q: 'ضمان قطع الغيار؟', a: 'ضمان استبدال على جميع قطع الغيار. مدة الضمان مكتوبة في تفاصيل كل قطعة.' },
  { q: 'التوصيل بياخد قد إيه؟', a: 'التوصيل خلال 2-5 أيام عمل. وفي توصيل إكسبريس داخل القاهرة والجيزة خلال 48 ساعة.' },
  { q: 'في قطع غير أصلية؟', a: 'كل قطع الغيار على الموقع أصلية من الوكيل الرسمي. مفيش أي قطع كوبي أو هاي كوبي.' },
  { q: 'أقدر أجي أستلم الأوردر؟', a: 'غير متاح الاستلام الشخصي. الطلب من الموقع أو الأبلكيشن والأوردر بيتشحن لباب بيتك.' },
  { q: 'أتابع أوردري إزاي؟', a: 'من حسابك هتلاقي رقم التتبع داخل الأوردر. لو مش موجود تواصل مع خدمة العملاء.' },
  { q: 'أقدر أرجع القطعة؟', a: 'متاح الاستبدال أو الاسترجاع خلال 14 يوم من تاريخ الاستلام، بشرط إن القطعة في حالتها الأصلية مع تغليفها وملحقاتها.' },
];

interface Msg { from: 'bot' | 'user'; text: string; }

function BotAvatar() {
  return (
    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
      🤖
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: 'أهلاً! أنا شوكت 🤖، مساعدك الذكي في زيت أند فلترز.\nاختار سؤالك من القائمة أو اكتب سؤالك وهحاول أساعدك!' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  function findAnswer(q: string): string | null {
    const normalized = q.trim().toLowerCase();
    for (const faq of FAQS) {
      const keys = faq.q.toLowerCase();
      if (normalized.includes('ضمان') || keys.includes('ضمان') && normalized.includes('ضمان')) {
        if (normalized.includes('ضمان')) return faq.a;
      }
    }
    // Keyword matching
    if (/مكان|عنوان|فين|where|location|تجمع/.test(normalized)) return FAQS[0].a;
    if (/ضمان|guarantee|warranty/.test(normalized)) return FAQS[1].a;
    if (/توصيل|شحن|بياخد|delivery|shipping|يوم|ساعة/.test(normalized)) return FAQS[2].a;
    if (/أصلي|كوبي|original|fake|جودة/.test(normalized)) return FAQS[3].a;
    if (/استلم|أجي|أجيب|pickup|فرع|منفذ/.test(normalized)) return FAQS[4].a;
    if (/تتبع|أتابع|tracking|رقم|اوردر/.test(normalized)) return FAQS[5].a;
    if (/رجع|استرجاع|استبدال|return|refund/.test(normalized)) return FAQS[6].a;
    return null;
  }

  function sendMsg(text: string) {
    if (!text.trim()) return;
    setMsgs(m => [...m, { from: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const answer = findAnswer(text);
      setTyping(false);
      if (answer) {
        setMsgs(m => [...m, { from: 'bot', text: answer }]);
      } else {
        setMsgs(m => [...m, {
          from: 'bot',
          text: 'مش لاقي إجابة على سؤالك 😅\nتواصل معانا على واتساب وهنرد عليك في أقرب وقت!',
        }]);
      }
    }, 800);
  }

  function selectFaq(faq: typeof FAQS[0]) {
    setMsgs(m => [...m, { from: 'user', text: faq.q }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, { from: 'bot', text: faq.a }]);
    }, 600);
  }

  const WA_SVG = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  return (
    <>
      <style>{`
        @keyframes shawkat-pop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes shawkat-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes shawkat-blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }
        .shawkat-fab { position:fixed; bottom:calc(env(safe-area-inset-bottom,0px) + 20px); right:20px; z-index:9998; }
        @media(min-width:640px){ .shawkat-fab { bottom:24px; right:24px; } }
        .shawkat-open-btn {
          width:60px; height:60px; border-radius:50%;
          background:linear-gradient(135deg,#22c55e,#16a34a);
          border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 24px rgba(34,197,94,0.45);
          animation: shawkat-bounce 3s ease-in-out infinite;
          transition: transform 0.2s, box-shadow 0.2s;
          position:relative;
        }
        .shawkat-open-btn:hover { transform:scale(1.08); box-shadow:0 8px 32px rgba(34,197,94,0.6); animation:none; }
        .shawkat-badge {
          position:absolute; top:-4px; right:-4px;
          background:#ef4444; color:#fff;
          width:20px; height:20px; border-radius:50%;
          font-size:0.72rem; font-weight:900;
          display:flex; align-items:center; justify-content:center;
          border:2px solid #fff;
        }
        .shawkat-window {
          position:fixed; bottom:calc(env(safe-area-inset-bottom,0px) + 88px); right:20px;
          width:360px; max-width:calc(100vw - 24px);
          height:520px; max-height:calc(100dvh - 120px);
          background:#fff; border-radius:24px;
          box-shadow:0 12px 48px rgba(0,0,0,0.18);
          display:flex; flex-direction:column; overflow:hidden;
          z-index:9998;
          animation: shawkat-pop 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        @media(min-width:640px){ .shawkat-window { right:24px; bottom:96px; } }
        .shawkat-msgs { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; }
        .shawkat-msgs::-webkit-scrollbar { width:4px; }
        .shawkat-msgs::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
        .shawkat-bubble-bot { background:#f1f5f9; color:#0f172a; border-radius:18px 18px 18px 4px; padding:10px 14px; font-size:0.88rem; line-height:1.6; max-width:85%; white-space:pre-line; word-break:break-word; }
        .shawkat-bubble-user { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; border-radius:18px 18px 4px 18px; padding:10px 14px; font-size:0.88rem; line-height:1.6; max-width:85%; margin-right:auto; word-break:break-word; align-self:flex-end; }
        .shawkat-typing span { display:inline-block; width:7px; height:7px; border-radius:50%; background:#94a3b8; margin:0 2px; animation:shawkat-blink 1.4s infinite; }
        .shawkat-typing span:nth-child(2) { animation-delay:0.2s; }
        .shawkat-typing span:nth-child(3) { animation-delay:0.4s; }
        .shawkat-faq-btn { background:#fff; border:1.5px solid #e2e8f0; border-radius:20px; padding:7px 14px; font-size:0.8rem; font-weight:700; color:#0f172a; cursor:pointer; text-align:right; transition:all 0.15s; white-space:nowrap; font-family:inherit; flex-shrink:0; }
        .shawkat-faq-btn:hover { border-color:#22c55e; color:#15803d; background:#f0fdf4; }
      `}</style>

      <div className="shawkat-fab">
        {/* Chat window */}
        {open && (
          <div className="shawkat-window" dir="rtl">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#fff' }}>شوكت</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>مساعدك الذكي • متاح دايمًا</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="shawkat-msgs">
              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexDirection: m.from === 'user' ? 'row-reverse' : 'row' }}>
                  {m.from === 'bot' && <BotAvatar />}
                  <div className={m.from === 'bot' ? 'shawkat-bubble-bot' : 'shawkat-bubble-user'}>
                    {m.text}
                    {/* WhatsApp button inside bot messages that mention contact */}
                    {m.from === 'bot' && (m.text.includes('واتساب') || m.text.includes('خدمة العملاء')) && (
                      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', background: '#25D366', color: '#fff', padding: '7px 14px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '800', textDecoration: 'none', width: 'fit-content' }}>
                        {WA_SVG} تواصل عبر واتساب
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <BotAvatar />
                  <div className="shawkat-bubble-bot shawkat-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* FAQ quick buttons */}
            <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', marginBottom: '6px', paddingRight: '2px' }}>أسئلة شائعة</div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {FAQS.map((faq, i) => (
                  <button key={i} className="shawkat-faq-btn" onClick={() => selectFaq(faq)}>{faq.q}</button>
                ))}
              </div>
            </div>

            {/* Input + WhatsApp */}
            <div style={{ padding: '10px 12px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexShrink: 0 }}>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                title="تواصل عبر واتساب"
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none', color: '#fff', boxShadow: '0 2px 8px rgba(37,211,102,0.4)' }}>
                {WA_SVG}
              </a>
              <form onSubmit={e => { e.preventDefault(); sendMsg(input); }} style={{ flex: 1, display: 'flex', gap: '6px' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="اكتب سؤالك هنا..."
                  dir="rtl"
                  style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', height: '40px' }}
                  onFocus={e => { e.target.style.borderColor = '#22c55e'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                />
                <button type="submit" disabled={!input.trim()}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#e2e8f0', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: input.trim() ? '#fff' : '#94a3b8', transition: 'all 0.15s', flexShrink: 0 }}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* FAB button */}
        <button className="shawkat-open-btn" onClick={() => setOpen(o => !o)} aria-label="شوكت مساعدك الذكي">
          {open ? <X size={24} color="#fff" /> : <MessageCircle size={26} color="#fff" fill="#fff" />}
          {!open && unread > 0 && <span className="shawkat-badge">{unread}</span>}
        </button>
      </div>
    </>
  );
}
