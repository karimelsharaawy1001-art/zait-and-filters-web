'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type Props = { children: React.ReactNode };
interface Badges { messages: number; orders: number; abandonedCarts: number; pendingReviews: number; pendingReturns: number; }

export default function AdminLayoutClient({ children }: Props) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>({ messages: 0, orders: 0, abandonedCarts: 0, pendingReviews: 0, pendingReturns: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function fetchBadges() {
    try {
      const [messagesRes, ordersRes, cartsRes, reviewsRes, returnsRes] = await Promise.all([
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('abandoned_carts').select('id', { count: 'exact', head: true })
          .eq('recovered', false)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('product_reviews').select('id', { count: 'exact', head: true })
          .eq('is_approved', false),
        supabase.from('return_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setBadges({
        messages: messagesRes.count ?? 0,
        orders: ordersRes.count ?? 0,
        abandonedCarts: cartsRes.count ?? 0,
        pendingReviews: reviewsRes.count ?? 0,
        pendingReturns: returnsRes.count ?? 0,
      });
    } catch (err) { console.error('Badge fetch error:', err); }
  }

  useEffect(() => {
    fetchBadges();
    const subs = [
      supabase.channel('sb-messages').on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, fetchBadges).subscribe(),
      supabase.channel('sb-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchBadges).subscribe(),
      supabase.channel('sb-carts').on('postgres_changes', { event: '*', schema: 'public', table: 'abandoned_carts' }, fetchBadges).subscribe(),
      supabase.channel('sb-returns').on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests' }, fetchBadges).subscribe(),
    ];
    const interval = setInterval(fetchBadges, 60_000);
    return () => { subs.forEach(s => supabase.removeChannel(s)); clearInterval(interval); };
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  if (pathname === '/admin-login' || pathname === '/admin/login') return <>{children}</>;

  const sections = [
    {
      label: 'الرئيسية',
      items: [
        { name: 'الإحصائيات',    href: '/admin/dashboard',      icon: '📊', badge: 0 },
        { name: 'تحليلات الزوار', href: '/admin/analytics',     icon: '📈', badge: 0 },
        { name: 'المتابعة الحية', href: '/admin/online-users',  icon: '👁️', badge: 0 },
        { name: 'إدارة الطلبات', href: '/admin/orders',         icon: '🛍️', badge: badges.orders },
        { name: 'الأرباح',       href: '/admin/profits',        icon: '💰', badge: 0 },
        { name: 'إدارة الشحن',   href: '/admin/shipping',       icon: '🚚', badge: 0 },
      ]
    },
    {
      label: 'المنتجات',
      items: [
        { name: 'إضافة منتج',            href: '/admin/add-product',    icon: '➕', badge: 0 },
        { name: 'إدارة المنتجات',        href: '/admin/products',       icon: '📦', badge: 0 },
        { name: 'إدارة الفئات والأقسام', href: '/admin/categories',     icon: '🗂️', badge: 0 },
        { name: 'إدارة الماركات',        href: '/admin/brands',         icon: '🏎️', badge: 0 },
        { name: 'صور السيارات',          href: '/admin/car-images',     icon: '🚗', badge: 0 },
        { name: 'نقل الصور لـ Cloudinary', href: '/admin/migrate-images', icon: '☁️', badge: 0 },
      ]
    },
    {
      label: 'التسويق',
      items: [
        { name: 'المدونة',             href: '/admin/blog',          icon: '📝', badge: 0 },
        { name: 'إعدادات الهيرو',     href: '/admin/hero',          icon: '🖼️', badge: 0 },
        { name: 'بانر الرئيسية',      href: '/admin/home-banner',   icon: '🏷️', badge: 0 },
        { name: 'أكواد الخصم',        href: '/admin/promo-codes',   icon: '🎫', badge: 0 },
        { name: 'Promoters',     href: '/admin/marketers',     icon: '👥', badge: 0 },
        { name: 'ترتيب منتجات العروض',href: '/admin/sale-order',    icon: '🔥', badge: 0 },
        { name: 'الأسئلة الشائعة',    href: '/admin/faqs',          icon: '❓', badge: 0 },
        { name: 'الإعلان المنبثق',   href: '/admin/promo-popup',   icon: '🪟', badge: 0 },
      ]
    },
    {
      label: 'العملاء',
      items: [
        { name: 'السلات المتروكة', href: '/admin/abandoned-carts', icon: '🛒', badge: badges.abandonedCarts },
        { name: 'رسائل العملاء',   href: '/admin/messages',        icon: '💬', badge: badges.messages },
        { name: 'التقييمات',       href: '/admin/reviews',         icon: '⭐', badge: badges.pendingReviews ?? 0 },
        { name: 'المحافظ والكاش باك', href: '/admin/wallets',      icon: '💰', badge: 0 },
        { name: 'طلبات الاسترجاع',    href: '/admin/returns',       icon: '🔄', badge: badges.pendingReturns },
        { name: 'إدارة المشرفين',     href: '/admin/users',         icon: '🛡️', badge: 0 },
      ]
    },
  ];

  const bottomTabs = [
    { name: 'إحصائيات', href: '/admin/dashboard',  icon: '📊', badge: 0 },
    { name: 'الطلبات',  href: '/admin/orders',      icon: '🛍️', badge: badges.orders },
    { name: 'منتج',     href: '/admin/add-product', icon: '➕', badge: 0 },
    { name: 'المنتجات', href: '/admin/products',    icon: '📦', badge: 0 },
    { name: 'القائمة',  href: '#', icon: '☰', badge: badges.messages + badges.abandonedCarts, isMenu: true },
  ];

  const sidebarW = collapsed ? '64px' : '232px';
  const totalBadges = badges.messages + badges.orders + badges.abandonedCarts;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', backgroundColor: '#f1f5f9', fontFamily: "'Cairo', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; }

        /* ── Hide any storefront nav/footer that might bleed in ── */
        body:has(.admin-layout) header,
        body:has(.admin-layout) footer,
        body:has(.admin-layout) nav:not(.admin-nav),
        body:has(.admin-layout) [class*="navbar"],
        body:has(.admin-layout) [class*="Navbar"],
        body:has(.admin-layout) [class*="footer"],
        body:has(.admin-layout) [class*="Footer"],
        body:has(.admin-layout) [class*="chat-widget"],
        body:has(.admin-layout) [class*="ChatWidget"] {
          display: none !important;
        }

        @keyframes badgePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          50%      { box-shadow: 0 0 0 4px rgba(220,38,38,0); }
        }
        @keyframes slideIn  { from { opacity:0; transform:translateX(4px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dotPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        .admin-sidebar {
          transition: width 0.22s cubic-bezier(0.4,0,0.2,1);
          scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent;
        }
        .admin-sidebar::-webkit-scrollbar { width: 3px; }
        .admin-sidebar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .admin-main { transition: margin-right 0.22s cubic-bezier(0.4,0,0.2,1); }

        .nav-item {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 9px; border-radius: 8px;
          text-decoration: none; font-size: 0.8rem; font-weight: 600;
          color: #64748b; transition: background 0.12s, color 0.12s;
          position: relative; overflow: visible; white-space: nowrap;
          margin-bottom: 1px; font-family: 'Cairo', sans-serif;
        }
        .nav-item:hover  { background: #f0fdf4; color: #15803d; }
        .nav-item.active { background: #dcfce7; color: #15803d; font-weight: 700; box-shadow: inset 2px 0 0 #16a34a; }
        .nav-item .nav-icon  { font-size: 0.95rem; width: 20px; text-align: center; flex-shrink: 0; position: relative; }
        .nav-item .nav-label { flex: 1; animation: slideIn 0.18s ease; }

        .badge {
          min-width: 17px; height: 17px; padding: 0 5px;
          background: #dc2626; color: #fff; border-radius: 8px;
          font-size: 0.6rem; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          margin-right: auto; flex-shrink: 0;
          animation: badgePulse 2.5s ease-in-out infinite;
        }
        .dot-badge {
          position: absolute; top: -2px; right: -2px;
          width: 6px; height: 6px; background: #dc2626; border-radius: 50%;
          animation: dotPulse 2s ease-in-out infinite; border: 1.5px solid #fff;
        }
        .section-label {
          font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em;
          color: #94a3b8; text-transform: uppercase; padding: 12px 9px 4px;
          font-family: 'Cairo', sans-serif;
        }
        .tooltip-wrap {
          position: absolute; left: calc(100% + 10px); top: 50%;
          transform: translateY(-50%); background: #1e293b; color: #f8fafc;
          padding: 5px 10px; border-radius: 7px; font-size: 0.72rem;
          white-space: nowrap; pointer-events: none; opacity: 0;
          transition: opacity 0.12s; z-index: 9999;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          font-family: 'Cairo', sans-serif; font-weight: 600;
        }
        .nav-item:hover .tooltip-wrap { opacity: 1; }

        .collapse-btn {
          width: 22px; height: 22px; background: #f8fafc;
          border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer;
          color: #94a3b8; font-size: 0.6rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s; flex-shrink: 0;
        }
        .collapse-btn:hover { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }

        .logout-btn {
          width: 100%; padding: 8px; background: transparent; color: #94a3b8;
          border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;
          font-size: 0.78rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: all 0.12s; font-family: 'Cairo', sans-serif;
          overflow: hidden; white-space: nowrap;
        }
        .logout-btn:hover { background: #fff5f5; color: #ef4444; border-color: #fecaca; }
        .divider { height: 1px; background: #f1f5f9; margin: 8px 0; }

        /* ── Mobile bottom tab bar ─────────────────────────────────────────
           z-index: 99999 ensures it sits above ANY storefront element        */
        .admin-bottom-bar {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0;
          z-index: 99999;                         /* ← beats everything */
          background: #fff; border-top: 2px solid #e2e8f0;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
          padding: 4px 0 env(safe-area-inset-bottom, 4px);
          height: 60px;
        }
        .admin-bottom-bar-inner {
          display: flex; height: 100%; align-items: stretch;
        }
        .bottom-tab {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 2px; flex: 1;
          text-decoration: none; color: #94a3b8;
          font-family: 'Cairo', sans-serif; font-size: 0.58rem; font-weight: 700;
          padding: 4px 2px; cursor: pointer; background: none; border: none;
          position: relative; transition: color 0.15s; border: none;
        }
        .bottom-tab.active { color: #16a34a; }
        .bottom-tab .tab-icon { font-size: 1.25rem; line-height: 1; }
        .tab-badge {
          position: absolute; top: 4px; right: calc(50% - 20px);
          min-width: 16px; height: 16px; padding: 0 4px;
          background: #dc2626; color: #fff; border-radius: 8px;
          font-size: 0.52rem; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff;
          animation: badgePulse 2.5s ease-in-out infinite;
        }

        /* ── Mobile drawer ── */
        .mobile-overlay {
          display: none; position: fixed; inset: 0; z-index: 99997;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
        }
        .mobile-drawer {
          position: fixed; bottom: 60px; left: 0; right: 0; z-index: 99998;
          background: #fff; border-radius: 20px 20px 0 0;
          max-height: calc(100vh - 60px); overflow-y: auto;
          padding: 12px 16px 16px;
          animation: slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
          scrollbar-width: thin;
        }
        .drawer-handle {
          width: 40px; height: 4px; background: #e2e8f0;
          border-radius: 2px; margin: 0 auto 16px;
        }
        .drawer-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 10px;
          text-decoration: none; color: #374151;
          font-family: 'Cairo', sans-serif; font-size: 0.88rem; font-weight: 600;
          margin-bottom: 2px; transition: background 0.12s; position: relative;
        }
        .drawer-nav-item:hover  { background: #f0fdf4; color: #15803d; }
        .drawer-nav-item.active { background: #dcfce7; color: #15803d; font-weight: 700; }
        .drawer-section-label {
          font-size: 0.65rem; font-weight: 700; color: #94a3b8;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 12px 14px 4px; font-family: 'Cairo', sans-serif;
        }

        /* ── Mobile top header ── */
        .admin-mobile-header {
          display: none;
          position: fixed; top: 0; left: 0; right: 0; z-index: 99996;
          background: #fff; border-bottom: 1px solid #e2e8f0;
          padding: 0 16px;
          height: 52px;
          align-items: center; justify-content: space-between;
          box-shadow: 0 1px 8px rgba(0,0,0,0.06);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .admin-sidebar        { display: none !important; }
          .admin-main           { margin-right: 0 !important; padding: 8px 8px 76px !important; }
          .admin-bottom-bar     { display: block !important; }
          .admin-mobile-header  { display: flex !important; }
          .admin-content-card   {
            margin-top: 58px !important;
            padding: 12px !important;
            border-radius: 12px !important;
            min-height: calc(100vh - 140px) !important;
          }
          /* ── Make every table in admin pages scroll horizontally ── */
          .admin-content-card .table-scroll-wrap {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          /* ── Reduce large headings on mobile ── */
          .admin-content-card h1 { font-size: clamp(1.1rem, 5vw, 1.5rem) !important; }
          /* ── Tighten modals on small screens ── */
          .admin-content-card [style*="padding: 40px"] { padding: 20px !important; }
          /* ── Two-col grids collapse to one col ── */
          .mobile-1col { grid-template-columns: 1fr !important; }
          /* ── Card min-width override ── */
          .mobile-min-w-auto { min-width: 0 !important; }
          /* ── Ensure images don't overflow ── */
          .admin-content-card img { max-width: 100%; }
        }
        @media (min-width: 769px) {
          .mobile-overlay { display: none !important; }
          .mobile-drawer  { display: none !important; }
        }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══════════════════════════════════════════════════ */}
      <aside
        className="admin-sidebar"
        style={{
          width: sidebarW, backgroundColor: '#fff',
          borderLeft: '1px solid #e2e8f0', padding: '14px 8px',
          position: 'fixed', height: '100vh', right: 0, zIndex: 100,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', overflowX: 'hidden',
          boxShadow: '-1px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '0 3px', flexShrink: 0, gap: '8px' }}>
          {!collapsed && (
            <div style={{ animation: 'slideIn 0.2s ease', minWidth: 0 }}>
              <div style={{ color: '#16a34a', fontWeight: '900', fontSize: '0.88rem', letterSpacing: '1.5px', fontStyle: 'italic', lineHeight: 1 }}>ZAIT & FILTERS</div>
              <div style={{ color: '#94a3b8', fontSize: '0.6rem', marginTop: '3px', fontWeight: '600' }}>لوحة الإدارة</div>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'توسيع' : 'طي'}>
            {collapsed ? '◂' : '▸'}
          </button>
        </div>

        {/* Nav */}
        <nav className="admin-nav" style={{ flex: 1, paddingBottom: '56px' }}>
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed ? <div className="section-label">{section.label}</div> : <div className="divider" />}
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
                    {collapsed && <span className="tooltip-wrap">{item.name}{hasBadge ? ` · ${item.badge}` : ''}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ flexShrink: 0 }}>
          <div className="divider" />
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            <span>⎋</span>
            {!collapsed && <span style={{ animation: 'slideIn 0.2s ease' }}>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ══ MOBILE TOP HEADER ════════════════════════════════════════════════ */}
      <div className="admin-mobile-header">
        <div style={{ color: '#16a34a', fontWeight: '900', fontSize: '0.92rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ZAIT & FILTERS
          {totalBadges > 0 && (
            <span style={{ background: '#dc2626', color: '#fff', borderRadius: '8px', fontSize: '0.58rem', fontWeight: '900', padding: '2px 7px', animation: 'badgePulse 2.5s ease-in-out infinite' }}>
              {totalBadges}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>لوحة الإدارة</div>
      </div>

      {/* ══ MOBILE DRAWER ════════════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} style={{ display: 'block' }} />
          <div className="mobile-drawer">
            <div className="drawer-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
              <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: '900', color: '#16a34a', fontSize: '0.92rem', fontStyle: 'italic' }}>ZAIT & FILTERS</span>
              <button
                onClick={() => supabase.auth.signOut()}
                style={{ background: '#fff5f5', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontFamily: "'Cairo', sans-serif", fontSize: '0.8rem', fontWeight: '700' }}
              >
                ⎋ خروج
              </button>
            </div>
            {sections.map((section) => (
              <div key={section.label}>
                <div className="drawer-section-label">{section.label}</div>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const hasBadge = item.badge > 0;
                  return (
                    <Link key={item.href} href={item.href} className={`drawer-nav-item${isActive ? ' active' : ''}`}>
                      <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ flex: 1 }}>{item.name}</span>
                      {hasBadge && (
                        <span style={{ background: '#dc2626', color: '#fff', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', padding: '2px 8px', animation: 'badgePulse 2.5s ease-in-out infinite' }}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
            <div style={{ height: '8px' }} />
          </div>
        </>
      )}

      {/* ══ MOBILE BOTTOM TAB BAR ════════════════════════════════════════════ */}
      <div className="admin-bottom-bar">
        <div className="admin-bottom-bar-inner">
          {bottomTabs.map((tab) => {
            const isActive = !tab.isMenu && pathname === tab.href;
            const hasBadge = tab.badge > 0;
            if (tab.isMenu) {
              return (
                <button
                  key="menu"
                  className={`bottom-tab${mobileMenuOpen ? ' active' : ''}`}
                  onClick={() => setMobileMenuOpen(o => !o)}
                >
                  <span className="tab-icon">{mobileMenuOpen ? '✕' : tab.icon}</span>
                  {hasBadge && !mobileMenuOpen && <span className="tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
                  <span>{mobileMenuOpen ? 'إغلاق' : tab.name}</span>
                </button>
              );
            }
            return (
              <Link key={tab.href} href={tab.href} className={`bottom-tab${isActive ? ' active' : ''}`}>
                <span className="tab-icon">{tab.icon}</span>
                {hasBadge && <span className="tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <main
        className="admin-main admin-layout"
        style={{
          flex: 1,
          marginRight: sidebarW,
          padding: '20px',
          backgroundColor: '#f1f5f9',
          minHeight: '100vh',
        }}
      >
        <div
          className="admin-content-card"
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #e2e8f0',
            minHeight: 'calc(100vh - 40px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}