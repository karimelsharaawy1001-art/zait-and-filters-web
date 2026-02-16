'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AffiliateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Add your affiliate login logic here
    setTimeout(() => {
      toast.success('تم تسجيل الدخول بنجاح!');
      router.push('/affiliate/dashboard');
      setLoading(false);
    }, 1500);
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

        <h1 style={title}>تسجيل دخول المسوقين</h1>
        <p style={subtitle}>سجل دخولك لإدارة حسابك وتتبع أرباحك</p>

        <form onSubmit={handleLogin} style={form}>
          <div style={inputGroup}>
            <label style={label}>البريد الإلكتروني</label>
            <div style={inputWrapper}>
              <Mail size={20} color="#666" />
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
              <Lock size={20} color="#666" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={input}
                required
              />
            </div>
          </div>

          <button type="submit" style={submitButton} disabled={loading}>
            {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
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
const submitButton: any = { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };
const switchText: any = { textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', marginTop: '25px' };
const switchLink: any = { color: '#22c55e', fontWeight: 'bold', textDecoration: 'none' };
