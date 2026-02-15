'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, Mail, Lock, Loader2, ArrowRight, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    try {
      if (isSignUp) {
        // 1. إنشاء الحساب في نظام الـ Auth (Email & Password)
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password 
        });
        
        if (authError) throw authError;

        // 2. إذا نجح إنشاء الحساب، نقوم بحفظ الاسم والموبايل في جدول الـ profiles
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: authData.user.id, 
                full_name: fullName, 
                phone_number: phone 
              }
            ]);

          if (profileError) throw profileError;
        }

        toast.success('تم إنشاء الحساب! افحص بريدك الإلكتروني للتفعيل');
        setIsSignUp(false); // تحويل العميل لصفحة تسجيل الدخول بعد النجاح
      } else {
        // تسجيل الدخول
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('مرحباً بك مجدداً في زيت أند فلترز');
        router.push('/'); 
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={authCard}>
        <h1 style={title}>{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h1>
        <p style={subTitle}>استمتع بتجربة تسوق أسرع وتابع طلباتك بسهولة</p>

        <form onSubmit={handleAuth} style={form}>
          {/* حقول إضافية تظهر فقط في حالة الـ Sign Up */}
          {isSignUp && (
            <>
              <div style={inputGroup}>
                <User size={18} style={icon} />
                <input 
                  name="fullName" 
                  type="text" 
                  placeholder="الاسم بالكامل" 
                  required 
                  style={inp} 
                />
              </div>
              <div style={inputGroup}>
                <Phone size={18} style={icon} />
                <input 
                  name="phone" 
                  type="tel" 
                  placeholder="رقم الموبايل" 
                  required 
                  pattern="[0-9]{11}"
                  style={inp} 
                />
              </div>
            </>
          )}

          <div style={inputGroup}>
            <Mail size={18} style={icon} />
            <input name="email" type="email" placeholder="البريد الإلكتروني" required style={inp} />
          </div>
          <div style={inputGroup}>
            <Lock size={18} style={icon} />
            <input name="password" type="password" placeholder="كلمة المرور" required style={inp} />
          </div>

          <button disabled={loading} type="submit" style={btn}>
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'إنشاء الحساب' : 'دخول')}
          </button>
        </form>

        <div style={toggleArea}>
          <button onClick={() => setIsSignUp(!isSignUp)} style={toggleBtn}>
            {isSignUp ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ اشترك الآن'}
          </button>
        </div>
      </div>
    </div>
  );
}

// التنسيقات ثابتة ومتوافقة مع الهوية البصرية لـ زيت أند فلترز
const container: any = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fcfcfc', padding: '20px', direction: 'rtl' };
const authCard: any = { background: '#fff', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', width: '100%', maxWidth: '450px', textAlign: 'center' };
const title: any = { fontSize: '1.8rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '10px' };
const subTitle: any = { color: '#888', fontSize: '0.9rem', marginBottom: '30px' };
const form: any = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputGroup: any = { position: 'relative', display: 'flex', alignItems: 'center' };
const icon: any = { position: 'absolute', right: '15px', color: '#ccc', zIndex: 10 };
const inp: any = { width: '100%', padding: '15px 45px 15px 15px', borderRadius: '15px', border: '1px solid #eee', background: '#f9f9f9', outline: 'none', fontSize: '1rem', transition: '0.3s' };
const btn: any = { padding: '15px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const toggleArea: any = { marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '20px' };
const toggleBtn: any = { background: 'none', border: 'none', color: '#27ae60', cursor: 'pointer', fontWeight: 'bold' };