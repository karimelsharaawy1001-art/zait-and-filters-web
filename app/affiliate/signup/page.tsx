'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, Mail, User, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';


export default function AffiliateSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });


  const generateReferralCode = (name: string) => {
    const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const base = cleaned.slice(0, 4).padEnd(4, 'X');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${base}${random}`;
  };

  const generatePromoCode = (name: string) => {
    const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const base = cleaned.slice(0, 5).padEnd(5, 'X');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${base}${random}`;
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      // ── FIX 1: pre-check phone number BEFORE touching auth ──
      // This prevents the unique constraint crash entirely
      const { data: existingPhone } = await supabase
        .from('marketers')
        .select('id')
        .eq('phone_number', formData.phone.trim())
        .maybeSingle();

      if (existingPhone) {
        toast.error('رقم الموبايل already registered as a Promoter');
        setLoading(false);
        return;
      }

      // ── FIX 2: pre-check email in marketers too ──
      const { data: existingEmail } = await supabase
        .from('marketers')
        .select('id')
        .eq('email', formData.email.trim().toLowerCase())
        .maybeSingle();

      if (existingEmail) {
        toast.error('هذا البريد الإلكتروني already registered as a Promoter');
        setLoading(false);
        return;
      }

      // ── FIX 3: handle case where user already has a normal account ──
      // Try signUp first; if email already exists in auth, sign them in instead
      let userId: string;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: { full_name: formData.full_name, role: 'affiliate' },
        },
      });

      if (authError) {
        // If email already registered in auth, sign them in to get their user_id
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          });

          if (signInError || !signInData.session) {
            toast.error('هذا البريد مسجل مسبقاً — تأكد من كلمة المرور الصحيحة لحسابك');
            setLoading(false);
            return;
          }

          userId = signInData.session.user.id;
        } else {
          throw authError;
        }
      } else {
        if (!authData.user) throw new Error('فشل إنشاء المستخدم');
        userId = authData.user.id;
      }

      const referralId = generateReferralCode(formData.full_name);
      const promoCode = generatePromoCode(formData.full_name);

      // Insert marketer row linked to auth user
      const { data, error: marketerError } = await supabase
        .from('marketers')
        .insert([{
          user_id: userId,
          full_name: formData.full_name,
          email: formData.email.trim().toLowerCase(),
          phone_number: formData.phone.trim(),
          referral_id: referralId,
          promo_code: promoCode,
          current_tier: 'bronze',
          tier_percentage: 5.00,
          status: 'active'
        }])
        .select()
        .single();

      if (marketerError) throw marketerError;

      // Create promo code entry
      await supabase.from('promo_codes').insert([{
        code: promoCode,
        marketer_id: data.id,
        discount_percentage: 5.00,
        is_active: true,
        usage_count: 0
      }]);

      toast.success(
        `✅ تم إنشاء حسابك بنجاح!\n\nكود الإحالة: ${referralId}\nكود البرومو: ${promoCode}`,
        { duration: 5000 }
      );

      setTimeout(() => router.push('/affiliate/dashboard'), 2000);

    } catch (error: any) {
      console.error('❌ Signup error:', error);
      const msg = error.message || '';
      if (msg.includes('phone') || msg.includes('phone_number')) {
        toast.error('رقم الموبايل مسجل بالفعل');
      } else if (msg.includes('email')) {
        toast.error('البريد الإلكتروني مسجل بالفعل');
      } else {
        toast.error(msg || 'حدث خطأ أثناء التسجيل');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={container}>
      <div style={card}>
        <div style={header}>
          <h1 style={title}>
            <UserPlus size={32} color="#22c55e" />
            انضم لشبكة المسوقين
          </h1>
          <p style={subtitle}>سجل الآن واحصل على عمولة من كل عملية بيع!</p>
        </div>

        <form onSubmit={handleSignup} style={form}>
          <div style={inputGroup}>
            <label style={labelStyle}><User size={16} /> الاسم الكامل</label>
            <input type="text" required value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              style={input} placeholder="أدخل اسمك الكامل" />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}><Mail size={16} /> البريد الإلكتروني</label>
            <input type="email" required value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={input} placeholder="example@email.com" />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}><Phone size={16} /> رقم الموبايل</label>
            <input type="tel" required value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={input} placeholder="01XXXXXXXXX" />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}><Lock size={16} /> كلمة المرور</label>
            <div style={passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                required minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ ...input, paddingLeft: '48px', marginBottom: 0 }}
                placeholder="8 أحرف على الأقل"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={eyeBtn} tabIndex={-1}>
                {showPassword ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
              </button>
            </div>
            <span style={hint}>يُستخدم لتسجيل الدخول لاحقاً</span>
          </div>

          <button type="submit" disabled={loading} style={submitBtn}>
            {loading
              ? <><Loader2 className="animate-spin" size={20} /> جاري التسجيل...</>
              : <><UserPlus size={20} /> إنشاء الحساب</>}
          </button>
        </form>
      </div>
    </div>
  );
}


// Styles
const container: any = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f9fafb 0%, #e9ecef 100%)', padding: '20px', direction: 'rtl' };
const card: any = { background: '#ffffff', padding: '40px', borderRadius: '30px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' };
const header: any = { textAlign: 'center', marginBottom: '35px' };
const title: any = { fontSize: '2rem', fontWeight: '900', color: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: 0 };
const subtitle: any = { color: '#6b7280', fontSize: '0.95rem', marginTop: '10px' };
const form: any = { display: 'flex', flexDirection: 'column', gap: '20px' };
const inputGroup: any = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle: any = { fontSize: '0.9rem', fontWeight: 'bold', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' };
const input: any = { padding: '14px 18px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', outline: 'none', transition: '0.2s', width: '100%', boxSizing: 'border-box' };
const passwordWrapper: any = { position: 'relative', display: 'flex', alignItems: 'center' };
const eyeBtn: any = { position: 'absolute', left: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' };
const hint: any = { fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' };
const submitBtn: any = { padding: '16px', background: 'linear-gradient(135deg, #22c55e 0%, #229954 100%)', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.2s', marginTop: '10px' };
