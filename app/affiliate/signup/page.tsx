'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { UserPlus, Loader2, ShieldCheck } from 'lucide-react';

export default function MarketerSignup() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. إنشاء الحساب في Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;

      const userId = authData.user?.id;

      // 2. توليد الأكواد أوتوماتيكياً
      // كود الخصم هيكون أول 3 حروف من اسمه + رقم عشوائي
      const generatedPromo = `ZF-${form.fullName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedRef = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 3. إضافة البيانات في جدول المسوقين
      const { error: profileError } = await supabase.from('marketers').insert([{
        id: userId,
        full_name: form.fullName,
        phone_number: form.phone,
        promo_code: generatedPromo,
        referral_id: generatedRef
      }]);
      if (profileError) throw profileError;

      // 4. إضافة الكود في جدول الكوبونات بخصم 5% أوتوماتيك
      await supabase.from('coupons').insert([{
        code: generatedPromo,
        discount_type: 'percentage',
        discount_value: 5,
        is_active: true
      }]);

      toast.success('مبروك! بقيت مسوق رسمي لزيت أند فلترز 🚀');
      router.push('/affiliate/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={formCard}>
        <div style={header}>
          <ShieldCheck size={40} color="#27ae60" />
          <h1 style={{ fontWeight: '900' }}>انضم لشركاء النجاح</h1>
          <p>سجل الآن وابدأ في كسب العمولات مع كل أوردر</p>
        </div>

        <form onSubmit={handleSignup} style={formStyle}>
          <input placeholder="الاسم بالكامل" required style={inp} onChange={e => setForm({...form, fullName: e.target.value})} />
          <input placeholder="رقم الموبايل" required style={inp} onChange={e => setForm({...form, phone: e.target.value})} />
          <input type="email" placeholder="البريد الإلكتروني" required style={inp} onChange={e => setForm({...form, email: e.target.value})} />
          <input type="password" placeholder="كلمة المرور" required style={inp} onChange={e => setForm({...form, password: e.target.value})} />
          
          <button disabled={loading} style={btn}>
            {loading ? <Loader2 className="animate-spin" /> : 'إنشاء حساب مسوق'}
          </button>
        </form>
      </div>
    </div>
  );
}

// التنسيقات (تليق ببراند زيت أند فلترز)
const container: any = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', direction: 'rtl' };
const formCard: any = { background: '#fff', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', maxWidth: '500px', width: '100%', border: '1px solid #eee' };
const header: any = { textAlign: 'center', marginBottom: '30px' };
const formStyle: any = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inp: any = { padding: '15px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '1rem' };
const btn: any = { padding: '15px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '1.1rem' };