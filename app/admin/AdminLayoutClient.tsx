'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type Props = { children: React.ReactNode };
interface Badges { messages: number; orders: number; abandonedCarts: number; }

export default function AdminLayoutClient({ children }: Props) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>({ messages: 0, orders: 0, abandonedCarts: 0 });
  const [collapsed, setCollapsed] = useState(false);

  async function fetchBadges() {
    try {
      const [messagesRes, ordersRes, cartsRes] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('abandoned_carts').select('id', { count: 'exact', head: true })
          .eq('contacted', false)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);
      setBadges({
        messages: messagesRes.count ?? 0,
        orders: ordersRes.count ?? 0,
        abandonedCarts: cartsRes.count ?? 0,
      });
    } catch (err) { console.error('Badge fetch error:', err); }
  }

  useEffect(() => {
    fetchBadges();
    const subs = [
      supabase.channel('sb-messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchBadges).subscribe(),
      supabase.channel('sb-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchBadges).subscribe(),
      supabase.channel('sb-carts').on('postgres_changes', { event: '*', schema: 'public', table: 'abandoned_carts' }, fetchBadges).subscribe(),
    ];
    const interval = setInterval(fetchBadges, 60_000);
    return () => { subs.forEach(s => supabase.removeChannel(s)); clearInterval(interval); };
  }, []);

  if (pathname === '/admin-login' || pathname === '/admin/login') return <>{children}</>;

  const sections = [
    {
      label: 'الرئيسية',
      items: [
        { name: 'الإحصائيات',     href: '/admin/dashboard',       icon: '📊', badge: 0 },
        { name: 'إدارة الطلبات',  href: '/admin/orders',          icon: '🛍️', badge: badges.orders },
        { name: 'إدارة الشحن',    href: '/admin/shipping',        icon: '🚚', badge: 0 },
      ]
    },
    {
      label: 'المنتجات',
      items: [
        { name: 'إضافة منتج',     href: '/admin/add-product',     icon: '➕', badge: 0 },
        { name: 'إدارة المنتجات', href: '/admin/products',        icon: '📦', badge: 0 },
        { name: 'إدارة الماركات', href: '/admin/brands',          icon: '🏎️', badge: 0 },
        { name: 'صور السيارات',   href: '/admin/car-images',      icon: '🚗', badge: 0 },
      ]
    },
    {
      label: 'التسويق',
      items: [
        { name: 'المدونة',         href: '/admin/blog',            icon: '📝', badge: 0 },
        { name: 'إعدادات الهيرو', href: '/admin/hero',            icon: '🖼️', badge: 0 },
        { name: 'أكواد الخصم',    href: '/admin/promo-codes',     icon: '🎫', badge: 0 },
        { name: 'إدارة المسوقين', href: '/admin/marketers',       icon: '👥', badge: 0 },
      ]
    },
    {
      label: 'العملاء',
      items: [
        { name: 'السلات المتروكة', href: '/admin/abandoned-carts', icon: '🛒', badge: badges.abandonedCarts },
        { name: 'رسائل العملاء',   href: '/admin/messages',        icon: '💬', badge: badges.messages },
      ]
    },
  ];

  const sidebarW = collapsed ? '64px' : '232px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', backgroundColor: '#f1f5f9', fontFamily: "'Cairo', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; }

        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          50%       { box-shadow: 0 0 0 4px rgba(220,38,38,0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .admin-sidebar {
          transition: width 0.22s cubic-bezier(0.4,0,0.2,1);
          scrollbar-width: thin;
          scrollbar-color: #e2e8f0 transparent;
        }
        .admin-sidebar::-webkit-scrollbar { width: 3px; }
        .admin-sidebar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

        .admin-main { transition: margin-right 0.22s cubic-bezier(0.4,0,0.2,1); }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 9px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          transition: background 0.12s, color 0.12s;
          position: relative;
          overflow: visible;
          white-space: nowrap;
          margin-bottom: 1px;
          font-family: 'Cairo', sans-serif;
        }
        .nav-item:hover { background: #f0fdf4; color: #15803d; }
        .nav-item.active {
          background: #dcfce7;
          color: #15803d;
          font-weight: 700;
          box-shadow: inset 2px 0 0 #16a34a;
        }
        .nav-item .nav-icon {
          font-size: 0.95rem;
          width: 20px;
          text-align: center;
          flex-shrink: 0;
          position: relative;
        }
        .nav-item .nav-label {
          flex: 1;
          animation: slideIn 0.18s ease;
        }
        .badge {
          min-width: 17px;
          height: 17px;
          padding: 0 5px;
          background: #dc2626;
          color: #fff;
          border-radius: 8px;
          font-size: 0.6rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: auto;
          flex-shrink: 0;
          animation: badgePulse 2.5s ease-in-out infinite;
        }
        .dot-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 6px;
          height: 6px;
          background: #dc2626;
          border-radius: 50%;
          animation: dotPulse 2s ease-in-out infinite;
          border: 1.5px solid #ffffff;
        }
        .section-label {
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #94a3b8;
          text-transform: uppercase;
          padding: 12px 9px 4px;
          font-family: 'Cairo', sans-serif;
        }
        .tooltip-wrap {
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1e293b;
          color: #f8fafc;
          padding: 5px 10px;
          border-radius: 7px;
          font-size: 0.72rem;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.12s;
          z-index: 200;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          font-family: 'Cairo', sans-serif;
          font-weight: 600;
        }
        .nav-item:hover .tooltip-wrap { opacity: 1; }

        .collapse-btn {
          width: 22px; height: 22px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          color: #94a3b8;
          font-size: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s;
          flex-shrink: 0;
        }
        .collapse-btn:hover { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }

        .logout-btn {
          width: 100%;
          padding: 8px;
          background: transparent;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: all 0.12s;
          font-family: 'Cairo', sans-serif;
          overflow: hidden;
          white-space: nowrap;
        }
        .logout-btn:hover { background: #fff5f5; color: #ef4444; border-color: #fecaca; }

        .divider { height: 1px; background: #f1f5f9; margin: 8px 0; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside
        className="admin-sidebar"
        style={{
          width: sidebarW,
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          padding: '14px 8px',
          position: 'fixed',
          height: '100vh',
          right: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '-1px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* ── Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '0 3px', flexShrink: 0, gap: '8px' }}>
          {!collapsed && (
            <div style={{ animation: 'slideIn 0.2s ease', minWidth: 0 }}>
              <div style={{ color: '#16a34a', fontWeight: '900', fontSize: '0.88rem', letterSpacing: '1.5px', fontStyle: 'italic', lineHeight: 1 }}>
                ZAIT & FILTERS
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.6rem', marginTop: '3px', fontWeight: '600', letterSpacing: '0.05em' }}>
                لوحة الإدارة
              </div>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'توسيع' : 'طي'}>
            {collapsed ? '◂' : '▸'}
          </button>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, paddingBottom: '56px' }}>
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed
                ? <div className="section-label">{section.label}</div>
                : <div className="divider" />
              }
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const hasBadge = item.badge > 0;
                return (
                  <Link key={item.href} href={item.href} className={`nav-item${isActive ? ' active' : ''}`}>
                    <span className="nav-icon">
                      {item.icon}
                      {collapsed && hasBadge && <span className="dot-badge" />}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="nav-label">{item.name}</span>
                        {hasBadge && <span className="badge">{item.badge > 99 ? '99+' : item.badge}</span>}
                      </>
                    )}
                    {collapsed && (
                      <span className="tooltip-wrap">
                        {item.name}{hasBadge ? ` · ${item.badge}` : ''}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Logout ── */}
        <div style={{ flexShrink: 0 }}>
          <div className="divider" />
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            <span>⎋</span>
            {!collapsed && <span style={{ animation: 'slideIn 0.2s ease' }}>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        className="admin-main"
        style={{
          flex: 1,
          marginRight: sidebarW,
          padding: '20px',
          backgroundColor: '#f1f5f9',
          minHeight: '100vh',
        }}
      >
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid #e2e8f0',
          minHeight: 'calc(100vh - 40px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}