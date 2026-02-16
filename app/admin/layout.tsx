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
    { name: 'إعدادات الهيرو', href: '/admin/hero', icon: '🖼️' },
    { name: 'أكواد الخصم', href: '/admin/promo-codes', icon: '🎫' },
    /* --- الزرار الجديد المضاف لإدارة المسوقين --- */
    { name: 'إدارة المسوقين', href: '/admin/marketers', icon: '👥' },
    /* ----------------------------------------- */
    { name: 'السلات المتروكة', href: '/admin/abandoned-carts', icon: '🛒' },
    { name: 'رسائل العملاء', href: '/admin/messages', icon: '💬' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', backgroundColor: '#f8fafc' }}>
      {/* Side Menu - تم تعديل الألوان للوضع الفاتح */}
      <aside style={{ 
        width: '260px', 
        backgroundColor: '#ffffff', 
        borderLeft: '1px solid #e2e8f0', 
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        right: 0,
        zIndex: 100,
        boxShadow: '-2px 0 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ marginBottom: '40px', padding: '0 10px' }}>
          <h2 style={{ color: '#27ae60', fontWeight: '900', fontStyle: 'italic', fontSize: '1.2rem', letterSpacing: '1px' }}>ZAIT & FILTERS</h2>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '5px' }}>لوحة الإدارة الاحترافية</p>
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
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive ? '#fff' : '#475569',
                backgroundColor: isActive ? '#27ae60' : 'transparent',
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
            backgroundColor: '#fff5f5',
            color: '#ff4d4d',
            border: '1px solid #ffebeb',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: '0.3s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fff0f0')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff5f5')}
        >
          <span>تسجيل الخروج</span>
          <span>🚪</span>
        </button>
      </aside>

      {/* Main Content Area Area - تم تعديل الألوان للوضع الفاتح */}
      <main style={{ 
        flex: 1, 
        marginRight: '260px', 
        padding: '30px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh'
      }}>
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          padding: '30px', 
          border: '1px solid #e2e8f0',
          minHeight: 'calc(100vh - 60px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
