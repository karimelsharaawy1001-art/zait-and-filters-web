'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Store, Car, BookOpen, ShoppingCart, User, Menu as MenuIcon } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/app/lib/supabase';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function MobileBottomNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const [garageMode, setGarageMode] = useState(false);
  const [userCar, setUserCar] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const { cartItems } = useCart();
  const controls = useAnimation();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        const { data: garage } = await supabase.from('user_garage').select('*').eq('user_id', data.user.id).maybeSingle();
        if (garage) setUserCar(garage);
      }
    };
    checkUser();

    const saved = localStorage.getItem('garageMode') === 'true';
    setGarageMode(saved);

    const syncGarage = () => setGarageMode(localStorage.getItem('garageMode') === 'true');
    window.addEventListener('garageModeChanged', syncGarage);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      window.removeEventListener('garageModeChanged', syncGarage);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (cartItems.length > 0) {
      controls.start({ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0], transition: { duration: 0.4 } });
    }
  }, [cartItems.length, controls]);

  const toggleGarage = () => {
    if (!user) { toast.error('يرجى تسجيل الدخول أولاً'); router.push('/login'); return; }
    if (!userCar) { toast.error('أضف سيارتك من حسابك الشخصي'); return; }
    const next = !garageMode;
    setGarageMode(next);
    localStorage.setItem('garageMode', String(next));
    window.dispatchEvent(new Event('garageModeChanged'));
    toast(next ? `تم تفعيل جراجي لسيارة ${userCar.make}` : 'تم إيقاف وضع جراجي');
  };

  return (
    <nav style={navStyle}>
      <Link href="/" style={item}><Home size={22} /><span style={label}>الرئيسية</span></Link>
      <Link href="/store" style={item}><Store size={22} /><span style={label}>المتجر</span></Link>
      <button onClick={toggleGarage} style={{ ...item, background: 'none', border: 'none', cursor: 'pointer' }}>
        <Car size={22} color={garageMode ? '#27ae60' : '#555'} />
        <span style={{ ...label, color: garageMode ? '#27ae60' : '#555' }}>جراجي</span>
      </button>
      <Link href="/blog" style={item}><BookOpen size={22} /><span style={label}>المدونة</span></Link>
      <Link href="/cart" style={{ ...item, position: 'relative' }}>
        <motion.div animate={controls}><ShoppingCart size={22} /></motion.div>
        {cartItems.length > 0 && <span style={badge}>{cartItems.length}</span>}
        <span style={label}>السلة</span>
      </Link>
      <Link href={user ? '/profile' : '/login'} style={item}>
        <User size={22} /><span style={label}>حسابي</span>
      </Link>
      <button onClick={onOpenSidebar} style={{ ...item, background: 'none', border: 'none', cursor: 'pointer' }}>
        <MenuIcon size={22} /><span style={label}>المزيد</span>
      </button>
    </nav>
  );
}

const navStyle: any = {
  display: 'flex',
  width: '100%',
  backgroundColor: '#fff',
  borderTop: '1px solid #eee',
  padding: '8px 5px',
  paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
  justifyContent: 'space-around',
  alignItems: 'center',
  direction: 'rtl',
  boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
  flexShrink: 0,
};

const item: any = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px',
  textDecoration: 'none',
  color: '#555',
};

const label: any = {
  fontSize: '0.65rem',
  fontWeight: 'bold',
  color: '#555',
};

const badge: any = {
  position: 'absolute',
  top: '-5px',
  right: '5px',
  backgroundColor: '#27ae60',
  color: '#fff',
  fontSize: '9px',
  borderRadius: '50%',
  width: '15px',
  height: '15px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
