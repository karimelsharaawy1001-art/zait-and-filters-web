'use client';
import { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, User, Home, Store, Package, 
  Menu as MenuIcon, X, Info, PhoneCall, ShieldCheck, Settings, LogIn, LogOut 
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; 
import { supabase } from '@/app/lib/supabase';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function ProfessionalNavbar() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null); 
  const { cartItems } = useCart();
  const controls = useAnimation();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    if (cartItems.length > 0) {
      controls.start({
        scale: [1, 1.2, 1],
        rotate: [0, -10, 10, 0],
        transition: { duration: 0.4 }
      });
    }

    return () => authListener.subscription.unsubscribe();
  }, [cartItems.length, controls]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsSidebarOpen(false);
    router.push('/');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .desktop-links { display: none !important; }
          .mobile-bottom-nav { display: flex !important; }
          .nav-content { justify-content: space-between !important; padding: 0 10px !important; }
          .search-wrapper { display: none !important; }
          /* تكبير اللوجو في الموبايل أيضاً ليكون واضحاً */
          .logo-text { font-size: 1.5rem !important; } 
          .mobile-menu-btn { display: flex !important; }
        }
      `}} />

      {/* --- القائمة الجانبية (Sidebar) --- */}
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
                <span style={{fontWeight:'900', fontSize:'1.2rem'}}>القائمة</span>
                <button onClick={() => setIsSidebarOpen(false)} style={closeBtn}><X size={24}/></button>
              </div>
              
              <div style={sidebarContent}>
                <Link href="/" onClick={()=>setIsSidebarOpen(false)} style={sidebarLink}><Home size={20}/> الرئيسية</Link>
                <Link href="/store" onClick={()=>setIsSidebarOpen(false)} style={sidebarLink}><Store size={20}/> المتجر</Link>
                <Link href="/my-orders" onClick={()=>setIsSidebarOpen(false)} style={sidebarLink}><Package size={20}/> طلباتي</Link>
                <hr style={sidebarDivider} />
                {user ? (
                  <>
                    <Link href="/profile" onClick={()=>setIsSidebarOpen(false)} style={sidebarLink}><User size={20}/> حسابي الشخصي</Link>
                    <button onClick={handleLogout} style={sidebarLogoutBtn}><LogOut size={20}/> تسجيل الخروج</button>
                  </>
                ) : (
                  <Link href="/login" onClick={()=>setIsSidebarOpen(false)} style={{...sidebarLink, color: '#27ae60'}}><LogIn size={20}/> تسجيل الدخول</Link>
                )}
                <hr style={sidebarDivider} />
                <Link href="/about" onClick={()=>setIsSidebarOpen(false)} style={sidebarLink}><Info size={20}/> عن زيت أند فلترز</Link>
                <Link href="/contact" onClick={()=>setIsSidebarOpen(false)} style={sidebarLink}><PhoneCall size={20}/> اتصل بنا</Link>
              </div>
              <div style={sidebarFooter}>
                <p>زيت أند فلترز - v1.1.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- بار التنقل العلوي --- */}
      <nav style={navContainer}>
        <div style={navContent} className="nav-content">
          <button className="mobile-menu-btn" style={{...iconBtn, display:'none'}} onClick={() => setIsSidebarOpen(true)}><MenuIcon size={24} /></button>

          {/* اللوجو الجديد المعدل (مايل، أكبر، وأوضح) */}
          <Link href="/" style={logoStyle} className="logo-text">
            ZAIT <span style={{ color: '#27ae60' }}>& FILTERS</span>
          </Link>

          <div style={{ ...searchWrapper, borderColor: isSearchFocused ? '#27ae60' : '#eee' }} className="search-wrapper">
            <Search size={18} color={isSearchFocused ? '#27ae60' : '#999'} />
            <input 
              type="text" 
              placeholder="ابحث عن قطعة غيار..." 
              style={searchInput}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </div>

          <div style={navLinks} className="desktop-links">
            <Link href="/store" style={linkItem}>المتجر</Link>
            <Link href="/my-orders" style={linkItem}>طلباتي</Link>
            <div style={iconGroup}>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <Link href="/profile" style={iconBtn} title="حسابي"><User size={20} /></Link>
                   <button onClick={handleLogout} style={logoutIconBtn} title="خروج"><LogOut size={18} /></button>
                </div>
              ) : (
                <Link href="/login" style={loginLinkBtn}><LogIn size={18} /> دخول</Link>
              )}
              <Link href="/cart" style={{ ...iconBtn, position: 'relative', textDecoration: 'none', marginRight: '10px' }}>
                <motion.div animate={controls}><ShoppingCart size={22} /></motion.div>
                {cartItems.length > 0 && <span style={cartBadge}>{cartItems.length}</span>}
              </Link>
            </div>
          </div>

          <Link href={user ? "/profile" : "/login"} className="mobile-menu-btn" style={{...iconBtn, display:'none'}}>
            <User size={24}/>
          </Link>
        </div>
      </nav>

      {/* --- بار التنقل السفلي للموبايل --- */}
      <div style={mobileBottomNav} className="mobile-bottom-nav">
        <Link href="/" style={bottomNavItem}><Home size={22} /><span>الرئيسية</span></Link>
        <Link href="/store" style={bottomNavItem}><Store size={22} /><span>المتجر</span></Link>
        <Link href="/cart" style={{ ...bottomNavItem, position: 'relative' }}>
          <motion.div animate={controls}><ShoppingCart size={22} /></motion.div>
          {cartItems.length > 0 && <span style={cartBadgeMobile}>{cartItems.length}</span>}
          <span>السلة</span>
        </Link>
        <Link href="/my-orders" style={bottomNavItem}><Package size={22} /><span>طلباتي</span></Link>
        <button onClick={() => setIsSidebarOpen(true)} style={bottomNavItemBtn}><MenuIcon size={22} /><span>المزيد</span></button>
      </div>
    </>
  );
}

// --- التنسيقات المعدلة ---
const navContainer: any = { position: 'sticky', top: 0, zIndex: 1000, width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', padding: '15px 0', direction: 'rtl' };
const navContent: any = { maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' };

// التعديل الأساسي للوجو هنا
const logoStyle: any = { 
  fontSize: '2.1rem',      // تكبير الخط بشكل ملحوظ
  fontWeight: '900',       // خط سميك جداً ليكون أوضح
  fontStyle: 'italic',     // جعل الخط مائلاً (Italic)
  textDecoration: 'none', 
  color: '#1a1a1a', 
  letterSpacing: '-1.5px', // تضييق المسافات يعطي مظهر "اللوجو" الاحترافي
  flexShrink: 0,
  textTransform: 'uppercase' // جعل الحروف كبيرة لزيادة الوضوح
};

const searchWrapper: any = { flex: 1, maxWidth: '400px', display: 'flex', alignItems: 'center', backgroundColor: '#f5f5f5', padding: '8px 16px', borderRadius: '12px', border: '1px solid transparent', transition: 'all 0.3s ease', gap: '10px' };
const searchInput: any = { width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '0.9rem' };
const navLinks: any = { display: 'flex', alignItems: 'center', gap: '25px' };
const linkItem: any = { textDecoration: 'none', color: '#444', fontSize: '0.95rem', fontWeight: 'bold' };
const iconGroup: any = { display: 'flex', alignItems: 'center', gap: '12px', borderRight: '1px solid #eee', paddingRight: '15px' };
const iconBtn: any = { background: 'none', border: 'none', color: '#1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const loginLinkBtn: any = { display: 'flex', alignItems: 'center', gap: '5px', background: '#1a1a1a', color: '#fff', padding: '6px 15px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' };
const logoutIconBtn: any = { ...iconBtn, color: '#ff4d4d' };
const cartBadge: any = { position: 'absolute', top: '-5px', right: '-8px', backgroundColor: '#27ae60', color: '#fff', fontSize: '10px', fontWeight: 'bold', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const overlayStyle: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 2000 };
const sidebarStyle: any = { position: 'fixed', top: 0, right: 0, bottom: 0, width: '280px', background: '#fff', zIndex: 2001, display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', direction: 'rtl' };
const sidebarHeader: any = { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sidebarContent: any = { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' };
const sidebarLink: any = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', textDecoration: 'none', color: '#444', fontWeight: 'bold', borderRadius: '10px' };
const sidebarLogoutBtn: any = { ...sidebarLink, background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', width: '100%', textAlign: 'right' };
const sidebarDivider: any = { border: 'none', borderTop: '1px solid #f5f5f5', margin: '10px 0' };
const sidebarFooter: any = { padding: '20px', fontSize: '0.7rem', color: '#ccc', textAlign: 'center' };
const closeBtn: any = { background: 'none', border: 'none', color: '#1a1a1a', cursor: 'pointer' };
const mobileBottomNav: any = { display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTop: '1px solid #eee', padding: '10px 5px', justifyContent: 'space-around', alignItems: 'center', zIndex: 1001, direction: 'rtl' };
const bottomNavItem: any = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#666', fontSize: '0.7rem', fontWeight: 'bold' };
const bottomNavItemBtn: any = { ...bottomNavItem, background:'none', border:'none' };
const cartBadgeMobile: any = { position: 'absolute', top: '-5px', right: '5px', backgroundColor: '#27ae60', color: '#fff', fontSize: '9px', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' };