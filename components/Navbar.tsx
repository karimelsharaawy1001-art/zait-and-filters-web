'use client';
import { useState, useEffect } from 'react';
import {
  Search, ShoppingCart, User, Home, Store,
  Menu as MenuIcon, X, Info, PhoneCall, Settings, LogIn, LogOut,
  Handshake, Car, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/app/lib/supabase';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import SmartSearchBar from '@/components/SmartSearchBar';

export default function ProfessionalNavbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { cartItems } = useCart();
  const controls = useAnimation();
  const router = useRouter();

  const [garageMode, setGarageMode] = useState(false);
  const [userCar, setUserCar] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        fetchGarageData(data.user.id);
      }
    };
    checkUser();

    const savedMode = localStorage.getItem('garageMode') === 'true';
    setGarageMode(savedMode);

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) fetchGarageData(session.user.id);
      else {
        setUserCar(null);
        setGarageMode(false);
        localStorage.setItem('garageMode', 'false');
        window.dispatchEvent(new Event('garageModeChanged'));
      }
    });

    if (cartItems.length > 0) {
      controls.start({
        scale: [1, 1.2, 1],
        rotate: [0, -10, 10, 0],
        transition: { duration: 0.4 }
      });
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [cartItems.length, controls]);

  const fetchGarageData = async (userId: string) => {
    const { data } = await supabase
      .from('user_garage')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) setUserCar(data);
  };


  const toggleGarage = () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً لاستخدام جراجي');
      router.push('/login');
      return;
    }

    if (!userCar) {
      toast.custom((t) => (
        <div
          style={{
            direction: 'rtl',
            background: '#fff',
            padding: '14px 16px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            border: '1px solid #fee2e2',
            maxWidth: '280px',
            fontSize: '0.85rem',
            color: '#7f1d1d',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span>لا يوجد أي سيارة في جراجك حالياً.</span>
          <span>أضف سيارتك من صفحة حسابك الشخصي لاستخدام ميزة جراجي.</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/profile');
            }}
            style={{
              marginTop: '4px',
              padding: '8px 10px',
              borderRadius: '10px',
              border: 'none',
              background: '#15803d',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            الذهاب إلى حسابي
          </button>
        </div>
      ));
      return;
    }

    const newMode = !garageMode;
    setGarageMode(newMode);
    localStorage.setItem('garageMode', newMode.toString());
    window.dispatchEvent(new Event('garageModeChanged'));

    if (newMode) {
      toast.success(`تم تفعيل وضع جراجي لسيارة ${userCar.make}`);
    } else {
      toast('تم إيقاف وضع جراجي');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsSidebarOpen(false);
    setGarageMode(false);
    localStorage.setItem('garageMode', 'false');
    window.dispatchEvent(new Event('garageModeChanged'));
    router.push('/');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .desktop-links   { display: none !important; }
          .nav-content     { justify-content: space-between !important; padding: 0 10px !important; }
          .search-wrapper  { display: none !important; }
          .logo-text       { font-size: 1.5rem !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-cart-btn { display: flex !important; }
        }
      `}} />

      {/* --- Sidebar --- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              style={overlayStyle}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={sidebarStyle}
            >
              <div style={sidebarHeader}>
                <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>القائمة</span>
                <button onClick={() => setIsSidebarOpen(false)} style={closeBtn}><X size={24}/></button>
              </div>

              <div style={sidebarContent}>
                {/* Garage toggle in sidebar */}
                <button
                  onClick={() => { toggleGarage(); }}
                  style={{
                    ...sidebarLink,
                    backgroundColor: garageMode ? '#eefcf5' : 'transparent',
                    color: garageMode ? '#27ae60' : '#444',
                  }}
                >
                  <Car size={20} color={garageMode ? '#27ae60' : '#444'}/> 
                  جراجي {garageMode ? '(مفعل)' : ''}
                </button>

                <Link href="/" onClick={() => setIsSidebarOpen(false)} style={sidebarLink}>
                  <Home size={20}/> الرئيسية
                </Link>
                <Link href="/store" onClick={() => setIsSidebarOpen(false)} style={sidebarLink}>
                  <Store size={20}/> المتجر
                </Link>

                {/* Blog link in sidebar */}
                <Link href="/blog" onClick={() => setIsSidebarOpen(false)} style={sidebarLink}>
                  <BookOpen size={20}/> المدونة
                </Link>

                <Link href="/affiliate" onClick={() => setIsSidebarOpen(false)} style={{ ...sidebarLink, color: '#27ae60' }}>
                  <Handshake size={20}/> ابدأ الربح معنا
                </Link>

                <hr style={sidebarDivider} />
                {user ? (
                  <>
                    <Link href="/profile" onClick={() => setIsSidebarOpen(false)} style={sidebarLink}>
                      <User size={20}/> حسابي الشخصي
                    </Link>
                    {/* Hint button to manage garage from profile */}
                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        router.push('/profile');
                      }}
                      style={sidebarLink}
                    >
                      <Settings size={20}/> إعدادات جراجي
                    </button>
                    <button onClick={handleLogout} style={sidebarLogoutBtn}>
                      <LogOut size={20}/> تسجيل الخروج
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setIsSidebarOpen(false)} style={{ ...sidebarLink, color: '#27ae60' }}>
                    <LogIn size={20}/> تسجيل الدخول
                  </Link>
                )}
                <hr style={sidebarDivider} />
                <Link href="/about" onClick={() => setIsSidebarOpen(false)} style={sidebarLink}>
                  <Info size={20}/> عن زيت أند فلترز
                </Link>
                <Link href="/contact" onClick={() => setIsSidebarOpen(false)} style={sidebarLink}>
                  <PhoneCall size={20}/> اتصل بنا
                </Link>
              </div>

              <div style={sidebarFooter}>
                <p>زيت أند فلترز - v1.1.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Full-Screen Search Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileSearchOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 3001, background: '#fff', padding: '14px 16px', borderRadius: '0 0 20px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', direction: 'rtl' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontWeight: '900', fontSize: '0.95rem', color: '#1a1a1a' }}>البحث الذكي</span>
                <button onClick={() => setMobileSearchOpen(false)} style={{ marginRight: 'auto', background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#555" />
                </button>
              </div>
              <SmartSearchBar autoFocus onClose={() => setMobileSearchOpen(false)} compact={false} placeholder="مثال: تيل فرامل بوما — فلتر زيت كروز" />
              <p style={{ marginTop: '10px', fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>
                يفهم أسماء السيارات وأنواع القطع — جرّب: مساعدين النترا
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Top Navbar --- */}
      <nav style={navContainer} className="zf-navbar">
        <div style={navContent} className="nav-content">
          <button
            className="mobile-menu-btn"
            style={{ ...iconBtn, display: 'none' }}
            onClick={() => setIsSidebarOpen(true)}
          >
            <MenuIcon size={24} />
          </button>

          <Link href="/" style={logoStyle} className="logo-text">
            ZAIT <span style={{ color: '#27ae60' }}>& FILTERS</span>
          </Link>

          {/* ── Smart Search bar (desktop) ── */}
          <div className="search-wrapper" style={{ flex: 1, maxWidth: '420px' }}>
            <SmartSearchBar compact />
          </div>

          {/* ── Mobile search button ── */}
          <button
            className="mobile-menu-btn"
            style={{ ...iconBtn, display: 'none' }}
            onClick={() => setMobileSearchOpen(true)}
            aria-label="بحث"
          >
            <Search size={22} />
          </button>

          {/* ── Mobile cart button ── */}
          <Link
            href="/cart"
            className="mobile-cart-btn"
            style={{ ...iconBtn, display: 'none', position: 'relative', textDecoration: 'none' }}
            aria-label="السلة"
          >
            <motion.div animate={controls}><ShoppingCart size={22} /></motion.div>
            {cartItems.length > 0 && <span style={cartBadge}>{cartItems.reduce((sum: number, i: any) => sum + (parseInt(i.quantity) || 1), 0)}</span>}
          </Link>

          <div style={navLinks} className="desktop-links">
            <Link href="/store" style={linkItem}>المتجر</Link>

            {/* Blog link in desktop nav */}
            <Link href="/blog" style={linkItem}>المدونة</Link>

            <Link href="/affiliate" style={{ ...linkItem, color: '#27ae60' }}>
              ابدأ الربح معنا
            </Link>

            <div style={iconGroup}>
              <button 
                onClick={toggleGarage}
                style={{
                  ...garageToggleBtn,
                  backgroundColor: garageMode ? '#27ae60' : 'rgba(0,0,0,0.05)',
                  color: garageMode ? '#fff' : '#1a1a1a',
                  marginLeft: '10px',
                }}
                title={
                  userCar
                    ? `تصفية لسيارة ${userCar.make}`
                    : 'جراجي (أضف سيارة من حسابك الشخصي)'
                }
              >
                <Car size={18} />
                <span style={{ fontWeight: '900', fontSize: '0.85rem' }}>جراجي</span>
              </button>

              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link href="/profile" style={iconBtn} title="حسابي">
                    <User size={20} />
                  </Link>
                  <button onClick={handleLogout} style={logoutIconBtn} title="خروج">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link href="/login" style={loginLinkBtn}>
                  <LogIn size={18} /> دخول
                </Link>
              )}

              <Link
                href="/cart"
                style={{ ...iconBtn, position: 'relative', textDecoration: 'none', marginRight: '10px' }}
              >
                <motion.div animate={controls}><ShoppingCart size={22} /></motion.div>
                {cartItems.length > 0 && <span style={cartBadge}>{cartItems.reduce((sum: number, i: any) => sum + (parseInt(i.quantity) || 1), 0)}</span>}
              </Link>
            </div>
          </div>

          <Link
            href={user ? '/profile' : '/login'}
            className="mobile-menu-btn"
            style={{ ...iconBtn, display: 'none' }}
          >
            <User size={24}/>
          </Link>
        </div>
      </nav>

    </>
  );
}

// --- Styles ---
const navContainer: any = {
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  width: '100%',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
  padding: '15px 0',
  direction: 'rtl',
};
const navContent: any = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '20px',
};
const logoStyle: any = {
  fontSize: '2.1rem',
  fontWeight: '900',
  fontStyle: 'italic',
  textDecoration: 'none',
  color: '#1a1a1a',
  letterSpacing: '-1.5px',
  flexShrink: 0,
  textTransform: 'uppercase',
};
const navLinks: any = { display: 'flex', alignItems: 'center', gap: '25px' };
const linkItem: any = {
  textDecoration: 'none',
  color: '#444',
  fontSize: '0.95rem',
  fontWeight: 'bold',
};
const iconGroup: any = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  borderRight: '1px solid #eee',
  paddingRight: '15px',
};
const iconBtn: any = {
  background: 'none',
  border: 'none',
  color: '#1a1a1a',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};
const loginLinkBtn: any = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  background: '#1a1a1a',
  color: '#fff',
  padding: '6px 15px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontSize: '0.85rem',
  fontWeight: 'bold',
};
const logoutIconBtn: any = { ...iconBtn, color: '#ff4d4d' };
const cartBadge: any = {
  position: 'absolute',
  top: '-5px',
  right: '-8px',
  backgroundColor: '#27ae60',
  color: '#fff',
  fontSize: '10px',
  fontWeight: 'bold',
  borderRadius: '50%',
  width: '18px',
  height: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const overlayStyle: any = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)',
  zIndex: 2000,
};
const sidebarStyle: any = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: '280px',
  background: '#fff',
  zIndex: 2001,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-5px 0 25px rgba(0,0,0,0.1)',
  direction: 'rtl',
};
const sidebarHeader: any = {
  padding: '20px',
  borderBottom: '1px solid #eee',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
const sidebarContent: any = {
  flex: 1,
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};
const sidebarLink: any = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  textDecoration: 'none',
  color: '#444',
  fontWeight: 'bold',
  borderRadius: '10px',
  border: 'none',
  width: '100%',
  cursor: 'pointer',
  textAlign: 'right',
  fontSize: '1rem',
};
const sidebarLogoutBtn: any = {
  ...sidebarLink,
  background: 'none',
  border: 'none',
  color: '#ff4d4d',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'right',
};
const sidebarDivider: any = {
  border: 'none',
  borderTop: '1px solid #f5f5f5',
  margin: '10px 0',
};
const sidebarFooter: any = {
  padding: '20px',
  fontSize: '0.7rem',
  color: '#ccc',
  textAlign: 'center',
};
const closeBtn: any = {
  background: 'none',
  border: 'none',
  color: '#1a1a1a',
  cursor: 'pointer',
};
const garageToggleBtn: any = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};