'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LogIn, Loader2, Lock } from 'lucide-react';

export default function MarketerLogin() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      toast.success('أهلاً بك مجدداً! 🎯');
      router.push('/affiliate/dashboard');
    } catch (err: any) {
      toast.error('خطأ في الدخول: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={formCard}>
        <div style={header}>
          <Lock size={40} color="#27ae60" />
          <h1 style={{ fontWeight: '900', marginTop: '15px' }}>دخول المسوقين</h1>
          <p>ادخل لحسابك لمتابعة أرباحك وعمولاتك</p>
        </div>
        <form onSubmit={handleLogin} style={formStyle}>
          <input type="email" placeholder="البريد الإلكتروني" required style={inp} onChange={e => setForm({...form, email: e.target.value})} />
          <input type="password" placeholder="كلمة المرور" required style={inp} onChange={e => setForm({...form, password: e.target.value})} />
          <button disabled={loading} style={btn}>
            {loading ? <Loader2 className="animate-spin" /> : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

const container: any = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', direction: 'rtl' };
const formCard: any = { background: '#fff', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', maxWidth: '450px', width: '100%', border: '1px solid #eee' };
const header: any = { textAlign: 'center', marginBottom: '30px' };
const formStyle: any = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inp: any = { padding: '15px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '1rem' };
const btn: any = { padding: '15px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '1.1rem' };