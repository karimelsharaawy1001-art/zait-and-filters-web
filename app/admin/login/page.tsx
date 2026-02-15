'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('بيانات الدخول غير صحيحة');
    } else {
      router.push('/admin/dashboard'); // هنوجهك للوحة التحكم بعد النجاح
    }
  };

  return (
    <main style={{ backgroundColor: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl' }}>
      <form onSubmit={handleLogin} style={{ backgroundColor: '#0a0a0a', padding: '40px', borderRadius: '15px', border: '1px solid #2ecc71', width: '400px' }}>
        <h2 style={{ color: '#2ecc71', textAlign: 'center', marginBottom: '30px', fontWeight: '900' }}>دخول الإدارة</h2>
        {error && <p style={{ color: '#ff4d4d', textAlign: 'center' }}>{error}</p>}
        
        <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px' }} required />
        <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '30px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px' }} required />
        
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2ecc71', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>دخول</button>
      </form>
    </main>
  );
}