'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { LogIn, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';


export default function AffiliateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ── FIX 1: real Supabase Auth login ──
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // ── FIX 2: proper error check — data is always an object, must check session ──
      if (error || !data.session) {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      // ── FIX 3: verify the logged-in user is actually an affiliate marketer ──
      const { data: marketer, error: marketerError } = await supabase
        .from('marketers')
        .select('id, full_name, status')
        .eq('user_id', data.session.user.id)
        .single();

      if (marketerError || !marketer) {
        // valid auth user but not a marketer — sign them out and block access
        await supabase.auth.signOut();
        toast.error('هذا الحساب not registered as a Promoter');
        setLoading(false);
        return;
      }

      if (marketer.status !== 'active') {
        await supabase.auth.signOut();
        toast.error('حسابك موقوف، تواصل مع الإدارة');
        setLoading(false);
        return;
      }

      // ── All checks passed — redirect ──
      toast.success(`أهلاً ${marketer.full_name}! 👋`);
      router.push('/affiliate/dashboard');

    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('حدث خطأ، حاول مرة أخرى');
      setLoading(false);
    }
  };


  return (
    <div style={pageContainer}>
      <Link href="/affiliate" style={backButton}>
        <ArrowRight size={20} />
        <span>العودة</span>
      </Link>

      <div style={loginCard}>
        <div style={iconContainer}>
          <LogIn size={40} color="#22c55e" />
        </div>

        <h1 style={title}>Promoters Login</h1>
        <p style={subtitle}>سجل دخولك لإدارة حسابك وتتبع أرباحك</p>

        <form onSubmit={handleLogin} style={form}>
          <div style={inputGroup}>
            <label style={label}>البريد الإلكتروني</label>
            <div style={inputWrapper}>
              <Mail size={20} color="#6b7280" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="affiliate@example.com"
                style={input}
                required
              />
            </div>
          </div>

          <div style={inputGroup}>
            <label style={label}>كلمة المرور</label>
            <div style={inputWrapper}>
              <Lock size={20} color="#6b7280" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={input}
                required
              />
              {/* ── show/hide password toggle ── */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={eyeBtn}
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff size={18} color="#6b7280" />
                  : <Eye size={18} color="#6b7280" />}
              </button>
            </div>
          </div>

          <button type="submit" style={submitButton} disabled={loading}>
            {loading
              ? <><Loader2 size={20} className="animate-spin" /> جاري التحقق...</>
              : 'تسجيل الدخول'}
          </button>
        </form>

        <p style={switchText}>
          ليس لديك حساب مسوق؟{' '}
          <Link href="/affiliate/signup" style={switchLink}>
            سجل الآن
          </Link>
        </p>
      </div>
    </div>
  );
}


const pageContainer: any = { minHeight: '100vh', background: '#0a1f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl', position: 'relative' };
const backButton: any = { position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' };
const loginCard: any = { maxWidth: '450px', width: '100%', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '50px', border: '1px solid rgba(255, 255, 255, 0.1)' };
const iconContainer: any = { width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' };
const title: any = { fontSize: '2rem', fontWeight: '900', textAlign: 'center', color: '#fff', marginBottom: '10px' };
const subtitle: any = { textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '35px' };
const form: any = { display: 'flex', flexDirection: 'column', gap: '20px' };
const inputGroup: any = { display: 'flex', flexDirection: 'column', gap: '8px' };
const label: any = { color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' };
const inputWrapper: any = { display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '14px' };
const input: any = { flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' };
const eyeBtn: any = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px', flexShrink: 0 };
const submitButton: any = { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
const switchText: any = { textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', marginTop: '25px' };
const switchLink: any = { color: '#22c55e', fontWeight: 'bold', textDecoration: 'none' };
