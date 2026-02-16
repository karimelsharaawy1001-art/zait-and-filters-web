'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, Mail, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AffiliateSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: ''
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
    setLoading(true);

    try {
      const referralId = generateReferralCode(formData.full_name);
      const promoCode = generatePromoCode(formData.full_name);

      // Insert without ID (auto-generated)
      const { data, error } = await supabase
        .from('marketers')
        .insert([{
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone,
          referral_id: referralId,
          promo_code: promoCode,
          current_tier: 'bronze',
          tier_percentage: 5.00,
          status: 'active'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }

      console.log('✅ Marketer created:', data);

      // Create promo code
      await supabase.from('promo_codes').insert([{
        code: promoCode,
        marketer_id: data.id,
        discount_percentage: 5.00,
        is_active: true,
        usage_count: 0
      }]);

      toast.success(`✅ تم إنشاء حسابك بنجاح!\n\nكود الإحالة: ${referralId}\nكود البرومو: ${promoCode}`, {
        duration: 5000
      });
      
      setTimeout(() => {
        router.push('/admin/marketers');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Signup error:', error);
      toast.error(error.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={card}>
        <div style={header}>
          <h1 style={title}>
            <UserPlus size={32} color="#27ae60" />
            انضم لشبكة المسوقين
          </h1>
          <p style={subtitle}>سجل الآن واحصل على عمولة من كل عملية بيع!</p>
        </div>

        <form onSubmit={handleSignup} style={form}>
          <div style={inputGroup}>
            <label style={label}>
              <User size={16} /> الاسم الكامل
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              style={input}
              placeholder="أدخل اسمك الكامل"
            />
          </div>

          <div style={inputGroup}>
            <label style={label}>
              <Mail size={16} /> البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={input}
              placeholder="example@email.com"
            />
          </div>

          <div style={inputGroup}>
            <label style={label}>
              <Phone size={16} /> رقم الموبايل
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={input}
              placeholder="01XXXXXXXXX"
            />
          </div>

          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                جاري التسجيل...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                إنشاء الحساب
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Styles
const container: any = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '20px', direction: 'rtl' };
const card: any = { background: '#fff', padding: '40px', borderRadius: '30px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' };
const header: any = { textAlign: 'center', marginBottom: '35px' };
const title: any = { fontSize: '2rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: 0 };
const subtitle: any = { color: '#64748b', fontSize: '0.95rem', marginTop: '10px' };
const form: any = { display: 'flex', flexDirection: 'column', gap: '20px' };
const inputGroup: any = { display: 'flex', flexDirection: 'column', gap: '8px' };
const label: any = { fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' };
const input: any = { padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', outline: 'none', transition: '0.2s' };
const submitBtn: any = { padding: '16px', background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.2s', marginTop: '10px' };
