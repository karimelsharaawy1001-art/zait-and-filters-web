'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { Loader2 } from 'lucide-react';


// Public routes inside /affiliate that don't require login
const PUBLIC_ROUTES = ['/affiliate', '/affiliate/login', '/affiliate/signup'];


export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Allow public pages to render without auth check
      if (PUBLIC_ROUTES.includes(pathname)) {
        setChecking(false);
        return;
      }

      // Protected route — verify session + marketer role
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/affiliate/login');
        return;
      }

      const { data: marketer } = await supabase
        .from('marketers')
        .select('id, status')
        .eq('user_id', session.user.id)
        .single();

      if (!marketer || marketer.status !== 'active') {
        await supabase.auth.signOut();
        router.replace('/affiliate/login');
        return;
      }

      setChecking(false);
    };

    checkAuth();
  }, [pathname]);

  // Show spinner while checking auth on protected routes
  if (checking && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div style={loaderWrapper}>
        <Loader2 size={36} className="animate-spin" color="#22c55e" />
        <span style={loaderText}>جاري التحقق من الهوية...</span>
      </div>
    );
  }

  return <>{children}</>;
}


const loaderWrapper: any = {
  minHeight: '100vh',
  background: '#0a1f1a',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '14px',
};
const loaderText: any = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.95rem',
  fontWeight: '600',
};