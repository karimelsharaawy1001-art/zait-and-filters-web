'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // لا تظهر القائمة في صفحة تسجيل الدخول
  if (pathname === '/admin/login') return <>{children}</>;

  const menuItems = [
    { name: 'الإحصائيات', href: '/admin/dashboard', icon: '📊' },
    { name: 'إدارة الطلبات', href: '/admin/orders', icon: '🛍️' },
    { name: 'إدارة الشحن', href: '/admin/shipping', icon: '🚚' },
    { name: 'إضافة منتج', href: '/admin/add-product', icon: '➕' },
    { name: 'إدارة المنتجات', href: '/admin/products', icon: '📦' },
    { name: 'إدارة الماركات', href: '/admin/brands', icon: '🏎️' },
    /* --- القسم الجديد المضاف لـ Hero Section --- */
    { name: 'إعدادات الهيرو', href: '/admin/hero', icon: '🖼️' },
    /* ----------------------------------------- */
    { name: 'رسائل العملاء', href: '/admin/messages', icon: '💬' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', backgroundColor: '#000' }}>
      {/* Side Menu */}
      <aside style={{ 
        width: '260px', 
        backgroundColor: '#050505', 
        borderLeft: '1px solid #111', 
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        right: 0,
        zIndex: 100
      }}>
        <div style={{ marginBottom: '40px', padding: '0 10px' }}>
          <h2 style={{ color: '#2ecc71', fontWeight: '900', fontStyle: 'italic', fontSize: '1.2rem', letterSpacing: '1px' }}>ZAIT & FILTERS</h2>
          <p style={{ color: '#444', fontSize: '0.8rem', marginTop: '5px' }}>لوحة الإدارة الاحترافية</p>
        </div>

        <nav>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '12px 15px',
                marginBottom: '10px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? '#000' : '#888',
                backgroundColor: isActive ? '#2ecc71' : 'transparent',
                fontWeight: 'bold',
                transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* زر تسجيل الخروج الثابت في الأسفل */}
        <button 
          onClick={() => supabase.auth.signOut()}
          style={{
            position: 'absolute',
            bottom: '20px',
            width: 'calc(100% - 40px)',
            padding: '12px',
            backgroundColor: '#0a0a0a',
            color: '#ff4d4d',
            border: '1px solid #1a1a1a',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: '0.3s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#151515')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0a0a0a')}
        >
          <span>تسجيل الخروج</span>
          <span>🚪</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        marginRight: '260px', 
        padding: '30px',
        backgroundColor: '#000',
        minHeight: '100vh'
      }}>
        <div style={{ 
          background: '#050505', 
          borderRadius: '20px', 
          padding: '25px', 
          border: '1px solid #111',
          minHeight: 'calc(100vh - 60px)'
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}