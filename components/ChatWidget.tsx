'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { X, Send, MessageCircle, ChevronDown, Headphones, MessageSquare } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { openTawkTo } from './TawkToProvider';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
}

interface Msg { from: 'bot' | 'user'; text: string; }

const FALLBACK_FAQS: FAQ[] = [
  { id: 1, question: 'مكانكوا فين؟', answer: 'المقر الإداري والمخازن في التجمع الخامس بالقاهرة.', is_active: true, sort_order: 1 },
  { id: 2, question: 'ضمان قطع الغيار؟', answer: 'ضمان استبدال على جميع قطع الغيار. مدة الضمان مكتوبة في تفاصيل كل قطعة.', is_active: true, sort_order: 2 },
  { id: 3, question: 'التوصيل بياخد قد إيه؟', answer: 'التوصيل خلال 2-5 أيام عمل. وفي توصيل إكسبريس داخل القاهرة والجيزة خلال 48 ساعة.', is_active: true, sort_order: 3 },
  { id: 4, question: 'في قطع غير أصلية؟', answer: 'كل قطع الغيار على الموقع أصلية من الوكيل الرسمي. مفيش أي قطع كوبي أو هاي كوبي.', is_active: true, sort_order: 4 },
  { id: 5, question: 'أقدر أجي أستلم الأوردر؟', answer: 'غير متاح الاستلام الشخصي. الطلب من الموقع أو الأبلكيشن والأوردر بيتشحن لباب بيتك.', is_active: true, sort_order: 5 },
  { id: 6, question: 'أتابع أوردري إزاي؟', answer: 'من حسابك هتلاقي رقم التتبع داخل الأوردر. لو مش موجود تواصل مع خدمة العملاء.', is_active: true, sort_order: 6 },
  { id: 7, question: 'أقدر أرجع القطعة؟', answer: 'متاح الاستبدال أو الاسترجاع خلال 14 يوم من تاريخ الاستلام، بشرط إن القطعة في حالتها الأصلية ومختومة (برشام الأمان سليم) ومعاها كل مكوناتها وتغليفها. في حالة الاستبدال للطلبات الخاطئة أو غير المتوافقة، بترجّع القطعة لنا الأول عشان نتأكد من حالتها، وبعدها نبعتلك البديل أو نرجّع لك المبلغ.', is_active: true, sort_order: 7 },
  { id: 8, question: 'الدفع عند الاستلام متاح؟', answer: 'أيوه، الدفع عند الاستلام متاح. وكمان تقدر تدفع عن طريق انستاباي أو الفيزا أو المحافظ الإلكترونية أو شركات التقسيط.', is_active: true, sort_order: 8 },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>(FALLBACK_FAQS);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: 'مرحباً بك في زيت أند فلترز 👋\nاختر سؤالك من الأسئلة الشائعة أو اكتب ما تبحث عنه.' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });
      if (data && data.length > 0) setFaqs(data);
    })();
  }, []);

  function findAnswer(q: string): string | null {
    const n = q.trim().toLowerCase();
    if (/مكان|عنوان|فين|تجمع/.test(n)) return getFaqAnswer(0);
    if (/ضمان|guarantee|warranty/.test(n)) return getFaqAnswer(1);
    if (/توصيل|شحن|بياخد|delivery|يوم|ساعة/.test(n)) return getFaqAnswer(2);
    if (/أصلي|كوبي|original|جودة/.test(n)) return getFaqAnswer(3);
    if (/استلم|أجي|pickup|فرع|منفذ/.test(n)) return getFaqAnswer(4);
    if (/تتبع|أتابع|tracking|اوردر|رقم/.test(n)) return getFaqAnswer(5);
    if (/رجع|استرجاع|استبدال|return|refund/.test(n)) return getFaqAnswer(6);
    if (/دفع عند الاستلام|كاش عند|استلام.*دفع|دفع.*استلام|cod|كاش/.test(n)) return getFaqAnswer(7);
    return null;
  }

  function getFaqAnswer(index: number): string | null {
    if (faqs[index]) return faqs[index].answer;
    if (FALLBACK_FAQS[index]) return FALLBACK_FAQS[index].answer;
    return null;
  }

  async function askAI(text: string): Promise<string | null> {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: msgs.slice(-6).map(m => ({ from: m.from, text: m.text })),
        }),
      });
      const data = await res.json();
      return data.reply || null;
    } catch {
      return null;
    }
  }

  function sendMsg(text: string) {
    if (!text.trim()) return;
    setMsgs(m => [...m, { from: 'user', text }]);
    setInput('');
    setTyping(true);

    const answer = findAnswer(text);
    if (answer) {
      setTimeout(() => {
        setTyping(false);
        setMsgs(m => [...m, { from: 'bot', text: answer }]);
      }, 700);
    } else {
      askAI(text).then(reply => {
        setTyping(false);
        setMsgs(m => [...m, {
          from: 'bot',
          text: reply ?? 'عذراً، لم أتمكن من إيجاد إجابة لسؤالك 😅\nيمكنك التحدث مع خدمة العملاء للمساعدة.',
        }]);
      });
    }
  }

  function selectFaq(faq: FAQ) {
    setMsgs(m => [...m, { from: 'user', text: faq.question }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, { from: 'bot', text: faq.answer }]);
    }, 600);
  }

  return (
    <>
      <style>{`
        @keyframes z-pop { 0%{transform:scale(0.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes z-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes z-blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }
        @keyframes z-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes z-slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        .z-fab { position:fixed; bottom:calc(env(safe-area-inset-bottom,0px) + 20px); right:20px; z-index:9998; }
        @media(min-width:640px){ .z-fab { bottom:24px; right:24px; } }

        .z-open-btn {
          width:56px; height:56px; border-radius:50%;
          background:linear-gradient(135deg,#e50914,#dc2626);
          border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 20px rgba(34,197,94,0.4);
          transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
          position:relative;
        }
        .z-open-btn:hover { transform:scale(1.06); box-shadow:0 6px 28px rgba(34,197,94,0.55); }
        .z-open-btn:active { transform:scale(0.95); }

        .z-badge {
          position:absolute; top:-3px; right:-3px;
          background:#ef4444; color:#fff; width:18px; height:18px;
          border-radius:50%; font-size:0.65rem; font-weight:900;
          display:flex; align-items:center; justify-content:center;
          border:2px solid #fff;
        }

        .z-window {
          position:fixed; bottom:calc(env(safe-area-inset-bottom,0px) + 84px); right:20px;
          width:364px; max-width:calc(100vw - 24px); height:530px; max-height:calc(100dvh - 120px);
          background:#1c1c1c; border-radius:20px;
          box-shadow:0 16px 56px rgba(0,0,0,0.16),0 2px 12px rgba(0,0,0,0.06);
          display:flex; flex-direction:column; overflow:hidden;
          z-index:9998; animation:z-pop 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @media(min-width:640px){ .z-window { right:24px; bottom:92px; } }

        .z-header {
          background:linear-gradient(135deg,#1a1a2e,#16213e);
          padding:16px 18px; display:flex; align-items:center; gap:12px; flex-shrink:0;
        }

        .z-msgs {
          flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px;
          background:#161616;
        }
        .z-msgs::-webkit-scrollbar { width:4px; }
        .z-msgs::-webkit-scrollbar-thumb { background:#d4d4d8; border-radius:4px; }

        .z-bubble-bot {
          background:#1c1c1c; color:#18181b;
          border-radius:4px 18px 18px 18px;
          padding:10px 14px; font-size:0.88rem; line-height:1.7;
          max-width:88%; white-space:pre-line; word-break:break-word;
          box-shadow:0 1px 4px rgba(0,0,0,0.06);
          animation:z-fadeIn 0.3s ease;
        }
        .z-bubble-user {
          background:linear-gradient(135deg,#e50914,#dc2626); color:#fff;
          border-radius:18px 4px 18px 18px;
          padding:10px 14px; font-size:0.88rem; line-height:1.6;
          max-width:88%; word-break:break-word; align-self:flex-end;
          box-shadow:0 1px 4px rgba(34,197,94,0.2);
          animation:z-fadeIn 0.3s ease;
        }

        .z-typing span {
          display:inline-block; width:7px; height:7px;
          border-radius:50%; background:#a1a1aa; margin:0 2px;
          animation:z-blink 1.4s infinite;
        }
        .z-typing span:nth-child(2){animation-delay:0.2s}
        .z-typing span:nth-child(3){animation-delay:0.4s}

        .z-faq-grid {
          display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;
          animation:z-slideUp 0.35s ease;
        }
        .z-faq-tile {
          background:#1c1c1c; border:1px solid #e4e4e7; border-radius:12px;
          padding:8px 14px; font-size:0.8rem; font-weight:600; color:#18181b;
          cursor:pointer; text-align:right; transition:all 0.15s;
          font-family:inherit; box-shadow:0 1px 3px rgba(0,0,0,0.04);
        }
        .z-faq-tile:hover {
          border-color:#e50914; color:#b91c1c; background:#1a0d0d;
          box-shadow:0 2px 8px rgba(34,197,94,0.12); transform:translateY(-1px);
        }

        .z-action-btn {
          display:inline-flex; align-items:center; gap:5px;
          padding:7px 13px; border-radius:10px; font-size:0.78rem;
          font-weight:700; border:none; cursor:pointer;
          transition:all 0.15s; font-family:inherit;
          white-space:nowrap;
        }
      `}</style>

      <div className="z-fab">
        {open && (
          <div className="z-window" dir="rtl">
            {/* Header */}
            <div className="z-header">
              <div style={{
                width:'36px', height:'36px', borderRadius:'10px',
                background:'rgba(255,255,255,0.1)', backdropFilter:'blur(4px)',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <MessageSquare size={18} color="#e50914" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'800', fontSize:'0.92rem', color:'#fff', letterSpacing:'0.01em' }}>
                  زيت أند فلترز
                </div>
                <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.6)', fontWeight:'500', marginTop:'1px' }}>
                  المساعد الذكي • متاح 24/7
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{
                  background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px',
                  width:'28px', height:'28px', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)',
                  transition:'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                <ChevronDown size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="z-msgs">
              {msgs.map((m, i) => (
                <div key={i}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', flexDirection:m.from === 'user' ? 'row-reverse' : 'row' }}>
                    <div className={m.from === 'bot' ? 'z-bubble-bot' : 'z-bubble-user'}>
                      {m.text}
                      {m.from === 'bot' && m.text.includes('خدمة العملاء') && (
                        <div style={{ display:'flex', gap:'6px', marginTop:'10px', flexWrap:'wrap' }}>
                          <button onClick={() => { setOpen(false); openTawkTo(); }} className="z-action-btn"
                            style={{ background:'#1e3a5f', color:'#fff' }}>
                            <Headphones size={13} /> خدمة العملاء
                          </button>
                          <Link href="/contact" className="z-action-btn"
                            style={{ background:'#1e3a5f', color:'#fff', textDecoration:'none' }}>
                            <MessageSquare size={13} /> تواصل معنا
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show FAQ tiles after the last bot message if no user message after it */}
                  {m.from === 'bot' && i === msgs.length - 1 && (
                    <div className="z-faq-grid">
                      {faqs.map(faq => (
                        <button key={faq.id} className="z-faq-tile" onClick={() => selectFaq(faq)}>
                          {faq.question}
                        </button>
                      ))}
                      <button onClick={() => { setOpen(false); openTawkTo(); }} className="z-faq-tile"
                        style={{ borderColor:'#1e3a5f', color:'#1e3a5f', background:'#f8faff' }}>
                        <Headphones size={12} style={{ marginLeft:'4px' }} /> خدمة العملاء
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
                  <div className="z-bubble-bot z-typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding:'10px 12px 14px', borderTop:'1px solid #f1f1f1',
              display:'flex', gap:'8px', flexShrink:0, background:'#1c1c1c',
            }}>
              <Link href="/contact"
                style={{
                  width:'40px', height:'40px', borderRadius:'12px',
                  background:'#0f172a', display:'flex', alignItems:'center',
                  justifyContent:'center', flexShrink:0, textDecoration:'none',
                  color:'#fff', transition:'transform 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <MessageSquare size={18} />
              </Link>
              <form onSubmit={e => { e.preventDefault(); sendMsg(input); }} style={{ flex:1, display:'flex', gap:'6px' }}>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  placeholder="اكتب سؤالك هنا..." dir="rtl"
                  style={{
                    flex:1, border:'1.5px solid #e4e4e7', borderRadius:'12px',
                    padding:'0 12px', fontSize:'0.85rem', outline:'none',
                    fontFamily:'inherit', background:'#161616', color:'#18181b',
                    height:'40px', transition:'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#e50914'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#e4e4e7'; e.target.style.background = '#161616'; }}
                />
                <button type="submit" disabled={!input.trim()}
                  style={{
                    width:'40px', height:'40px', borderRadius:'12px',
                    background: input.trim() ? 'linear-gradient(135deg,#e50914,#dc2626)' : '#e4e4e7',
                    border:'none', cursor: input.trim() ? 'pointer' : 'default',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: input.trim() ? '#fff' : '#a1a1aa', flexShrink:0,
                    transition:'all 0.15s',
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        )}

        <button className="z-open-btn" onClick={() => setOpen(o => !o)} aria-label="فتح المساعد">
          {open ? <X size={22} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
          {!open && unread > 0 && <span className="z-badge">{unread}</span>}
        </button>
      </div>
    </>
  );
}
