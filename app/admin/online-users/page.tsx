'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Eye, Globe, ShoppingCart, User, Smartphone, Monitor,
  Clock, Mail, Phone, Wifi, ExternalLink, RefreshCw,
  Search, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface UserSession {
  id: string;
  session_id: string;
  user_id: string | null;
  page_title: string;
  current_page: string;
  previous_page: string | null;
  referrer: string | null;
  device_type: string;
  cart_items_count: number;
  cart_total: number;
  cart_item_names: string[];
  user_name: string;
  user_email: string;
  user_phone: string;
  is_online: boolean;
  last_active_at: string;
  started_at: string;
}

const ITEMS_PER_PAGE = 20;

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 10000) return 'الآن';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `منذ ${secs}ث`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `منذ ${mins}د`;
  return `منذ ${Math.floor(mins / 60)}س`;
}

function sessionDuration(start: string): string {
  const diff = Date.now() - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'لحظات';
  if (mins < 60) return `${mins}د`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}س ${m}د` : `${h}س`;
}

function pageLabel(path: string): { label: string; detail?: string } {
  if (path === '/' || path === '') return { label: 'الرئيسية' };
  if (path.startsWith('/store')) return { label: 'المتجر' };
  if (path.startsWith('/products/')) {
    const slug = path.replace('/products/', '').split('/')[0].split('?')[0];
    return { label: 'صفحة منتج', detail: decodeURIComponent(slug).replace(/-/g, ' ') };
  }
  if (path.startsWith('/categories/')) {
    const name = path.replace('/categories/', '').split('/')[0].split('?')[0];
    return { label: 'تصنيف', detail: decodeURIComponent(name) };
  }
  if (path.startsWith('/cart')) return { label: 'سلة التسوق' };
  if (path.startsWith('/checkout')) return { label: 'إتمام الشراء' };
  if (path.startsWith('/orders/')) return { label: 'الطلبات' };
  if (path.startsWith('/profile')) return { label: 'الملف الشخصي' };
  if (path.startsWith('/login')) return { label: 'تسجيل الدخول' };
  if (path.startsWith('/blog')) return { label: 'المدونة' };
  if (path.startsWith('/about')) return { label: 'عن المتجر' };
  if (path.startsWith('/contact')) return { label: 'اتصل بنا' };
  return { label: path.split('?')[0] };
}

function formatPagePath(path: string): string {
  try {
    const url = new URL(path, 'https://zaitandfilters.com');
    return url.pathname + url.search;
  } catch {
    return path;
  }
}

export default function OnlineUsersPage() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'with-cart'>('online');
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [page, setPage] = useState(1);

  const now = Date.now();
  const twoMinAgo = new Date(now - 2 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();

  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .gt('last_active_at', fiveMinAgo)
      .order('last_active_at', { ascending: false });
    if (error) console.error('fetchSessions error:', error);
    if (data) setSessions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    const sub = supabase
      .channel('sb-user-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, fetchSessions)
      .subscribe();
    const interval = setInterval(fetchSessions, 10000);
    return () => { supabase.removeChannel(sub); clearInterval(interval); };
  }, [fetchSessions]);

  const filtered = useMemo(() => {
    let result = sessions.filter(s => new Date(s.last_active_at).getTime() > now - 5 * 60 * 1000);
    if (filter === 'online') result = result.filter(s => new Date(s.last_active_at).getTime() > now - 2 * 60 * 1000);
    if (filter === 'with-cart') result = result.filter(s => s.cart_items_count > 0 && new Date(s.last_active_at).getTime() > now - 2 * 60 * 1000);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.user_name.toLowerCase().includes(q) ||
        s.user_email.toLowerCase().includes(q) ||
        s.user_phone.toLowerCase().includes(q) ||
        s.current_page.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sessions, filter, search, now]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [filter, search]);

  const activeCount = sessions.filter(s => new Date(s.last_active_at).getTime() > now - 2 * 60 * 1000).length;
  const cartCount = sessions.filter(s => s.cart_items_count > 0 && new Date(s.last_active_at).getTime() > now - 2 * 60 * 1000).length;

  const filters = [
    { key: 'online' as const, label: 'المتصلون الآن', count: activeCount },
    { key: 'with-cart' as const, label: 'بسلة تسوق', count: cartCount },
    { key: 'all' as const, label: 'آخر 5 دقائق', count: filtered.length },
  ];

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Eye size={28} color="#16a34a" />
            <span style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, background: '#22c55e', borderRadius: '50%', animation: 'pulse-dot 2s ease-in-out infinite' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#1e293b' }}>المتابعة الحية</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>تتبع زوار المتجر في الوقت الفعلي</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#64748b' }}>
          <RefreshCw size={14} style={{ animation: 'spin 2s linear infinite' }} />
          <span>تحديث تلقائي</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .session-card { animation: fadeIn 0.3s ease; }
      `}</style>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0',
              background: filter === f.key ? '#dcfce7' : '#fff',
              color: filter === f.key ? '#15803d' : '#64748b',
              fontWeight: filter === f.key ? 700 : 600, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: "'Cairo', sans-serif", transition: 'all 0.15s',
            }}
          >
            {f.label}
            <span style={{
              background: filter === f.key ? '#15803d' : '#e2e8f0',
              color: filter === f.key ? '#fff' : '#64748b',
              borderRadius: 10, padding: '0 7px', fontSize: 11, fontWeight: 700,
            }}>{f.count}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '6px 30px 6px 10px', borderRadius: 20, border: '1px solid #e2e8f0',
              fontSize: 12, outline: 'none', width: 180, fontFamily: "'Cairo', sans-serif",
              background: '#fff',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 14 }}>جاري التحميل...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <Wifi size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>لا يوجد زوار نشطين</div>
          <div style={{ fontSize: 13 }}>سيتم تحديث القائمة تلقائياً عند دخول زوار جدد</div>
        </div>
      )}

      {/* Sessions grid */}
      {!loading && filtered.length > 0 && (
        <>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {paged.map(s => {
              const isActive = new Date(s.last_active_at).getTime() > now - 2 * 60 * 1000;
              const hasCart = s.cart_items_count > 0;
              const hasUser = s.user_name || s.user_email || s.user_phone;
              return (
                <div
                  key={s.id}
                  className="session-card"
                  onClick={() => setSelectedSession(s)}
                  style={{
                    background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                    padding: 14, cursor: 'pointer',
                    transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
                    boxShadow: isActive ? '0 0 0 1px #bbf7d0' : 'none',
                  }}
                >
                  {/* Status bar */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: isActive ? '#22c55e' : '#e2e8f0',
                  }} />

                  {/* Top row: user info + status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: hasUser ? '#dcfce7' : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {hasUser ? <User size={14} color="#15803d" /> : <Globe size={14} color="#94a3b8" />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.user_name || 'زائر'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(s.last_active_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s.device_type === 'mobile' ? <Smartphone size={13} color="#64748b" /> : <Monitor size={13} color="#64748b" />}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isActive ? '#22c55e' : '#cbd5e1',
                        flexShrink: 0,
                      }} />
                    </div>
                  </div>

                  {/* Page title */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{
                      background: '#f0f9ff', borderRadius: 8, padding: '8px 10px',
                      border: '1px solid #bae6fd',
                      display: 'flex', alignItems: 'flex-start', gap: 6,
                    }}>
                      <Globe size={13} color="#0369a1" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: '#0369a1',
                        }}>
                          {(() => { const p = pageLabel(s.current_page); return p.label; })()}
                        </div>
                        {(s.page_title || (() => { const p = pageLabel(s.current_page); return p.detail; })()) && (
                          <div style={{
                            fontSize: 11, color: '#0284c7', marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {s.page_title || (() => { const p = pageLabel(s.current_page); return p.detail; })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Duration + last active */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} color="#94a3b8" />
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{sessionDuration(s.started_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#22c55e' : '#cbd5e1' }} />
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(s.last_active_at)}</span>
                    </div>
                  </div>

                  {/* Cart info — always shown, highlighted only when has items */}
                  <div style={{
                    marginTop: 10, borderRadius: 8, padding: '8px 10px',
                    background: hasCart ? '#fefce8' : '#f8fafc',
                    border: hasCart ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShoppingCart size={14} color={hasCart ? '#d97706' : '#cbd5e1'} />
                      <span style={{
                        fontSize: 12, fontWeight: hasCart ? 700 : 500,
                        color: hasCart ? '#92400e' : '#94a3b8',
                      }}>
                        {hasCart
                          ? `${s.cart_items_count} ${s.cart_items_count > 10 ? 'قطعة' : s.cart_items_count > 1 ? 'قطع' : 'قطعة'}`
                          : 'السلة فارغة'}
                      </span>
                    </div>
                    {hasCart && (
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#d97706' }}>
                        {Number(s.cart_total).toFixed(2)} ج.م
                      </span>
                    )}
                  </div>

                  {/* Contact info */}
                  {(s.user_name || s.user_email || s.user_phone) && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {s.user_email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                          <Mail size={10} />
                          {s.user_email}
                        </span>
                      )}
                      {s.user_phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                          <Phone size={10} />
                          {s.user_phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1, fontFamily: "'Cairo', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#64748b',
                }}
              >
                <ChevronRight size={14} /> السابق
              </button>
              <span style={{ fontSize: 12, color: '#64748b' }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1, fontFamily: "'Cairo', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#64748b',
                }}
              >
                التالي <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Session detail modal */}
      {selectedSession && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)', padding: 20,
          }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%',
              padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye size={20} color="#16a34a" />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1e293b' }}>تفاصيل الزائر</h2>
              </div>
              <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#15803d" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{selectedSession.user_name || 'زائر'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {selectedSession.user_email || selectedSession.user_phone ? `${selectedSession.user_email} ${selectedSession.user_phone ? `· ${selectedSession.user_phone}` : ''}` : 'معلومات غير متوفرة'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoBox label="الحالة" value={new Date(selectedSession.last_active_at).getTime() > now - 120000 ? 'نشط' : 'غير نشط'} color={new Date(selectedSession.last_active_at).getTime() > now - 120000 ? '#15803d' : '#94a3b8'} />
                <InfoBox label="الجهاز" value={selectedSession.device_type === 'mobile' ? 'جوال' : 'كمبيوتر'} />
                <InfoBox label="مدة الجلسة" value={sessionDuration(selectedSession.started_at)} />
                <InfoBox label="آخر نشاط" value={timeAgo(selectedSession.last_active_at)} />
              </div>

              <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>الصفحة الحالية</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1', marginBottom: 2 }}>
                  {(() => { const p = pageLabel(selectedSession.current_page); return p.label; })()}
                </div>
                {(selectedSession.page_title || (() => { const p = pageLabel(selectedSession.current_page); return p.detail; })()) && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0284c7', marginBottom: 6 }}>
                    {selectedSession.page_title || (() => { const p = pageLabel(selectedSession.current_page); return p.detail; })()}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#64748b', direction: 'ltr', textAlign: 'left', wordBreak: 'break-all' }}>
                  {formatPagePath(selectedSession.current_page)}
                </div>
              </div>

              {selectedSession.referrer && (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>المصدر</div>
                  <div style={{ fontSize: 12, color: '#475569', direction: 'ltr', textAlign: 'left', wordBreak: 'break-all' }}>
                    {selectedSession.referrer}
                  </div>
                </div>
              )}

              {(selectedSession.cart_items_count > 0) && (
                <div style={{ padding: 12, background: '#fefce8', borderRadius: 10, border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <ShoppingCart size={14} color="#d97706" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                      سلة التسوق ({selectedSession.cart_items_count} {selectedSession.cart_items_count > 10 ? 'قطعة' : 'قطع'})
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#d97706' }}>
                    {Number(selectedSession.cart_total).toFixed(2)} ج.م
                  </div>
                  {selectedSession.cart_item_names.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selectedSession.cart_item_names.map((name, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedSession(null)}
              style={{
                width: '100%', marginTop: 20, padding: '10px', borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: '#64748b',
                fontFamily: "'Cairo', sans-serif", transition: 'background 0.12s',
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || '#1e293b' }}>{value}</div>
    </div>
  );
}
