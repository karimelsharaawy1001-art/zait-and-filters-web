'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Wallet, Link as LinkIcon, Ticket, Loader2, Copy,
  ShoppingBag, Eye, DollarSign, BarChart3, Clock,
  CheckCircle, LogOut, RefreshCw, Trophy,
  Smartphone, CreditCard as CreditCardIcon, AlertCircle, Save
} from 'lucide-react';
import toast from 'react-hot-toast';


const TIER_CONFIG = {
  bronze: { name: 'برونزي', color: '#cd7f32', percentage: 5, minConversions: 0, icon: '🥉' },
  silver: { name: 'فضي', color: '#c0c0c0', percentage: 7, minConversions: 10, icon: '🥈' },
  gold: { name: 'ذهبي', color: '#ffd700', percentage: 10, minConversions: 20, icon: '🥇' },
  diamond: { name: 'ماسي', color: '#b9f2ff', percentage: 10, minConversions: 30, icon: '💎' }
};


export default function ProfessionalAffiliateDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    total_orders: 0,
    total_clicks: 0,
    total_conversions: 0,
    conversion_rate: 0,
    recent_commissions: [],
    pending_commissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [withdrawalSettings, setWithdrawalSettings] = useState({
    method: 'instapay',
    instapay_phone: '',
    wallet_phone: '',
    // legacy single-phone field kept for backward compat
    phone: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const hasRun = useRef(false);


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


  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const forceStopLoading = setTimeout(() => {
      setLoading(false);
      toast.error('انتهت مهلة التحميل');
    }, 8000);

    async function loadDashboardData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (!user || userError) {
          toast.error('يجب تسجيل الدخول أولاً');
          router.push('/affiliate/login');
          return;
        }

        // ── FIX 1: query by user_id, not id ──
        let { data: marketer, error: marketerError } = await supabase
          .from('marketers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (marketerError || !marketer) {
          const userName = user.email?.split('@')[0] || 'User';

          // ── FIX 2: use user_id field, not id, so DB auto-generates the PK ──
          const newMarketer = {
            user_id: user.id,
            full_name: userName,
            email: user.email,
            referral_id: generateReferralCode(userName),
            promo_code: generatePromoCode(userName),
            balance: 0,
            pending_balance: 0,
            total_earnings: 0,
            commission_rate: 5.00,
            current_tier: 'bronze',
            tier_percentage: 5.00,
            total_clicks: 0,
            total_conversions: 0,
            status: 'active'
          };

          const { data: inserted, error: insertError } = await supabase
            .from('marketers')
            .insert([newMarketer])
            .select()
            .single();

          if (!insertError && inserted) {
            marketer = inserted;

            // ── FIX 3: use inserted.id (DB-generated PK) as marketer_id ──
            await supabase.from('promo_codes').insert([{
              code: inserted.promo_code,
              marketer_id: inserted.id,
              discount_percentage: 5.00,
              is_active: true
            }]);

            toast.success('تم إنشاء حسابك بنجاح!');
          } else {
            marketer = newMarketer;
          }
        }

        setData(marketer);

        if (marketer.withdrawal_method || marketer.instapay_phone || marketer.wallet_phone) {
          setWithdrawalSettings({
            method: marketer.withdrawal_method || 'instapay',
            instapay_phone: marketer.instapay_phone || marketer.withdrawal_phone || '',
            wallet_phone: marketer.wallet_phone || '',
            phone: marketer.withdrawal_phone || '',
          });
        }

        const { data: commissions, count } = await supabase
          .from('affiliate_commissions')
          .select('*', { count: 'exact' })
          .eq('marketer_id', marketer.id)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: pendingComm } = await supabase
          .from('affiliate_commissions')
          .select('commission_amount')
          .eq('marketer_id', marketer.id)
          .eq('is_released', false);

        const pendingTotal = pendingComm?.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) || 0;

        const conversionRate = marketer?.total_clicks > 0 
          ? ((marketer?.total_conversions || 0) / marketer?.total_clicks * 100).toFixed(2)
          : 0;

        setStats({
          total_orders: count || 0,
          total_clicks: marketer?.total_clicks || 0,
          total_conversions: marketer?.total_conversions || 0,
          conversion_rate: Number(conversionRate),
          recent_commissions: commissions || [],
          pending_commissions: pendingTotal
        });

      } catch (error) {
        console.error('Dashboard error:', error);
        toast.error('حدث خطأ في تحميل البيانات');
      } finally {
        clearTimeout(forceStopLoading);
        setLoading(false);
      }
    }

    loadDashboardData();

    return () => clearTimeout(forceStopLoading);
  }, [router]);


  const saveWithdrawalSettings = async () => {
    const ip = withdrawalSettings.instapay_phone.trim();
    const wp = withdrawalSettings.wallet_phone.trim();
    if (!ip && !wp) {
      toast.error('يرجى إدخال رقم انستاباي أو رقم المحفظة الإلكترونية');
      return;
    }
    if (ip && ip.length < 11) { toast.error('رقم انستاباي يجب أن يكون 11 رقم'); return; }
    if (wp && wp.length < 11) { toast.error('رقم المحفظة يجب أن يكون 11 رقم'); return; }

    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('marketers')
        .update({
          withdrawal_method: withdrawalSettings.method,
          withdrawal_phone: ip || wp,   // keep legacy field as primary
          instapay_phone: ip || null,
          wallet_phone: wp || null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('تم حفظ بيانات السحب بنجاح! ✅');
    } catch (error) {
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };


  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };


  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}?ref=${data?.referral_id}` 
    : '';

  const currentTierConfig = TIER_CONFIG[data?.current_tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
  const nextTier = data?.total_conversions >= 30 ? null : 
                   data?.total_conversions >= 20 ? TIER_CONFIG.diamond :
                   data?.total_conversions >= 10 ? TIER_CONFIG.gold : TIER_CONFIG.silver;


  if (loading) {
    return (
      <div style={loaderContainer}>
        <Loader2 className="animate-spin" size={50} color="#e50914" />
        <p style={{ color: '#64748b', marginTop: '20px', fontSize: '1.1rem' }}>
          جاري تحميل لوحة التحكم...
        </p>
      </div>
    );
  }


  return (
    <div style={container}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shine { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .slide-in { animation: slideIn 0.5s ease-out; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
        .copy-btn:hover { background: #e50914 !important; color: #fff !important; }
        .tier-badge { background: linear-gradient(90deg, ${currentTierConfig.color}, #fff, ${currentTierConfig.color}); background-size: 200% auto; animation: shine 3s linear infinite; }
        .save-btn:hover { background: #b91c1c !important; transform: translateY(-2px); }
      `}} />

      <header style={header} className="slide-in">
        <div>
          <h1 style={mainTitle}>مرحباً، {data?.full_name || 'Promoter'} 👋</h1>
          <p style={subtitle}>Professional Promoters Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={tierBadge} className="tier-badge">
            <span style={{ fontSize: '1.2rem' }}>{currentTierConfig.icon}</span>
            <span style={{ fontWeight: 'bold', color: '#e5e7eb' }}>
              {currentTierConfig.name} - {currentTierConfig.percentage}%
            </span>
          </div>
          <button onClick={() => router.push('/')} style={logoutBtn}>
            <LogOut size={18} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {nextTier && (
        <div style={tierProgress} className="slide-in">
          <div style={tierProgressHeader}>
            <Trophy size={20} color="#f59e0b" />
            <span>أنت على بُعد {nextTier.minConversions - data?.total_conversions} إحالات من المستوى {nextTier.name} ({nextTier.percentage}%)</span>
          </div>
          <div style={progressBar}>
            <div style={{
              ...progressFill,
              width: `${(data?.total_conversions / nextTier.minConversions) * 100}%`
            }} />
          </div>
        </div>
      )}

      <div style={statsGrid} className="slide-in">
        <div style={{ ...statCard, borderTop: '4px solid #e50914' }} className="stat-card">
          <div style={statIconContainer}><DollarSign size={28} color="#e50914" /></div>
          <div style={statContent}>
            <p style={statLabel}>إجمالي الأرباح</p>
            <h2 style={statValue}>{data?.total_earnings?.toFixed(2) || '0.00'} ج.م</h2>
            <p style={statGrowth}>+{data?.tier_percentage || 5}% Commission rate</p>
          </div>
        </div>
        <div style={{ ...statCard, borderTop: '4px solid #3b82f6' }} className="stat-card">
          <div style={{ ...statIconContainer, background: '#161616' }}><Eye size={28} color="#3b82f6" /></div>
          <div style={statContent}>
            <p style={statLabel}>إجمالي النقرات</p>
            <h2 style={statValue}>{stats.total_clicks.toLocaleString()}</h2>
            <p style={statGrowth}>على رابط الإحالة</p>
          </div>
        </div>
        <div style={{ ...statCard, borderTop: '4px solid #f59e0b' }} className="stat-card">
          <div style={{ ...statIconContainer, background: '#242424' }}><ShoppingBag size={28} color="#f59e0b" /></div>
          <div style={statContent}>
            <p style={statLabel}>الإحالات الناجحة</p>
            <h2 style={statValue}>{stats.total_conversions}</h2>
            <p style={statGrowth}>{stats.conversion_rate}% معدل التحويل</p>
          </div>
        </div>
        <div style={{ ...statCard, borderTop: '4px solid #8b5cf6' }} className="stat-card">
          <div style={{ ...statIconContainer, background: '#242424' }}><Wallet size={28} color="#8b5cf6" /></div>
          <div style={statContent}>
            <p style={statLabel}>الرصيد المتاح</p>
            <h2 style={statValue}>{data?.balance?.toFixed(2) || '0.00'} ج.م</h2>
            <p style={statGrowth}>جاهز للسحب الآن</p>
          </div>
        </div>
        <div style={{ ...statCard, borderTop: '4px solid #f59e0b' }} className="stat-card">
          <div style={{ ...statIconContainer, background: '#242424' }}><DollarSign size={28} color="#f59e0b" /></div>
          <div style={statContent}>
            <p style={statLabel}>Pending Commissions</p>
            <h2 style={{ ...statValue, color: '#d97706' }}>{(data?.pending_balance || 0).toFixed(2)} ج.م</h2>
            <p style={statGrowth}>تُصرف بعد 14 يوم من التسليم</p>
          </div>
        </div>
      </div>

      {stats.pending_commissions > 0 && (
        <div style={pendingNotice} className="slide-in">
          <AlertCircle size={20} color="#f59e0b" />
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>لديك {stats.pending_commissions.toFixed(2)} ج.م pending Commissions</p>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>سيتم إضافتها للرصيد المتاح بعد 14 يوم من تاريخ التوصيل للتأكد من اكتمال البيع</p>
          </div>
        </div>
      )}

      <div style={toolsSection} className="slide-in">
        <h3 style={sectionTitle}>🔗 أدواتك التسويقية</h3>
        <div style={toolCard}>
          <div style={toolHeader}><LinkIcon size={20} color="#e50914" /><span>رابط الإحالة الخاص بك</span></div>
          <div style={codeBox}>
            <code style={codeText}>{referralLink}</code>
            <button onClick={() => copyToClipboard(referralLink, 'تم نسخ الرابط!')} style={copyBtn} className="copy-btn"><Copy size={16} /></button>
          </div>
          <p style={toolHint}>شارك هذا الرابط مع عملائك لتحصل على Commission {currentTierConfig.percentage}% من كل عملية شراء</p>
        </div>
        <div style={toolCard}>
          <div style={toolHeader}><Ticket size={20} color="#e50914" /><span>كود الخصم الحصري (خصم 5%)</span></div>
          <div style={promoCodeDisplay}>
            <div style={promoCodeBadge}>{data?.promo_code || 'LOADING...'}</div>
            <button onClick={() => copyToClipboard(data?.promo_code, 'تم نسخ الكود!')} style={copyBtn} className="copy-btn"><Copy size={16} /></button>
          </div>
          <p style={toolHint}>أعطِ هذا الكود لعملائك للحصول على خصم 5% وتحصل أنت على Commission {currentTierConfig.percentage}%</p>
        </div>
      </div>

      <div style={withdrawalSection} className="slide-in">
        <h3 style={sectionTitle}>💳 بيانات الاستلام</h3>
        <div style={withdrawalCard}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '18px', fontWeight: '600' }}>
            أدخل أرقام حساباتك لاستلام العمولات. يمكنك إدخال واحد أو الاثنين معاً.
          </p>

          {/* InstaPay */}
          <div style={{ ...inputGroup, background: '#1a0d0d', border: '1.5px solid #7f1d1d', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
            <label style={{ ...label, display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', marginBottom: '10px' }}>
              <Smartphone size={18} color="#b91c1c" /> رقم انستاباي (InstaPay)
            </label>
            <input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={withdrawalSettings.instapay_phone}
              onChange={(e) => setWithdrawalSettings({ ...withdrawalSettings, instapay_phone: e.target.value })}
              style={{ ...input, borderColor: withdrawalSettings.instapay_phone ? '#e50914' : '#2a2a2a' }}
              maxLength={11}
              dir="ltr"
            />
            {withdrawalSettings.instapay_phone && withdrawalSettings.instapay_phone.length === 11 && (
              <p style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '700', marginTop: '5px' }}>✓ رقم صحيح</p>
            )}
          </div>

          {/* E-Wallet */}
          <div style={{ ...inputGroup, background: '#161616', border: '1.5px solid #2a2a2a', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <label style={{ ...label, display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', marginBottom: '10px' }}>
              <CreditCardIcon size={18} color="#60a5fa" /> رقم المحفظة الإلكترونية (فودافون كاش / أورنج / إتصالات)
            </label>
            <input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={withdrawalSettings.wallet_phone}
              onChange={(e) => setWithdrawalSettings({ ...withdrawalSettings, wallet_phone: e.target.value })}
              style={{ ...input, borderColor: withdrawalSettings.wallet_phone ? '#3b82f6' : '#2a2a2a' }}
              maxLength={11}
              dir="ltr"
            />
            {withdrawalSettings.wallet_phone && withdrawalSettings.wallet_phone.length === 11 && (
              <p style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: '700', marginTop: '5px' }}>✓ رقم صحيح</p>
            )}
          </div>

          <button onClick={saveWithdrawalSettings} disabled={savingSettings} style={saveButton} className="save-btn">
            {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span>{savingSettings ? 'جاري الحفظ...' : 'حفظ بيانات الاستلام'}</span>
          </button>
        </div>
      </div>

      <div style={commissionsSection} className="slide-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h3 style={sectionTitle}>💰 Recent Commissions</h3>
          <button style={refreshBtn} onClick={() => window.location.reload()}><RefreshCw size={16} /><span>تحديث</span></button>
        </div>
        {stats.recent_commissions.length > 0 ? (
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr style={tableHeader}>
                  <th style={th}>التاريخ</th>
                  <th style={th}>رقم الطلب</th>
                  <th style={th}>قيمة الطلب</th>
                  <th style={th}>Commission</th>
                  <th style={th}>الحالة</th>
                  <th style={th}>تاريخ الإفراج</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_commissions.map((comm: any) => {
                  const now = new Date();
                  const releaseDate = comm.release_date ? new Date(comm.release_date) : null;
                  const daysLeft = releaseDate ? Math.ceil((releaseDate.getTime() - now.getTime()) / 86400000) : null;
                  const statusConfig: Record<string, { bg: string; color: string; icon: any; label: string }> = {
                    pending:   { bg: '#e0f2fe', color: '#0369a1', icon: <Clock size={13}/>,       label: 'انتظار التسليم' },
                    in_review: { bg: '#242424', color: '#fbbf24', icon: <Clock size={13}/>,       label: daysLeft && daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'جاهزة قريباً' },
                    available: { bg: '#2a0f10', color: '#059669', icon: <CheckCircle size={13}/>, label: 'جاهزة للصرف' },
                    paid:      { bg: '#1c1c1c', color: '#9ca3af', icon: <CheckCircle size={13}/>, label: 'تم الدفع' },
                  };
                  const s = statusConfig[comm.status] || statusConfig['pending'];
                  return (
                    <tr key={comm.id} style={tableRow}>
                      <td style={td}>{new Date(comm.created_at).toLocaleDateString('ar-EG')}</td>
                      <td style={td}>#{comm.order_id?.slice(0, 8)}</td>
                      <td style={td}>{parseFloat(comm.order_total).toFixed(2)} ج.م</td>
                      <td style={{...td, color: '#e50914', fontWeight: 'bold'}}>+{parseFloat(comm.commission_amount).toFixed(2)} ج.م</td>
                      <td style={td}>
                        <div style={{...statusBadgeInTable, background: s.bg, color: s.color}}>
                          {s.icon} {s.label}
                        </div>
                      </td>
                      <td style={td}>
                        {releaseDate ? (
                          <span style={{ color: daysLeft && daysLeft > 0 ? '#d97706' : '#059669', fontWeight: '700', fontSize: '0.82rem' }}>
                            {releaseDate.toLocaleDateString('ar-EG')}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={emptyState}>
            <BarChart3 size={50} color="#cbd5e1" />
            <p style={emptyText}>No Commissions yet</p>
            <p style={emptyHint}>ابدأ بمشاركة رابطك لتحصل على first Commission!</p>
          </div>
        )}
      </div>
    </div>
  );
}


// Styles
const container: any = { minHeight: '100vh', background: 'linear-gradient(135deg, #161616 0%, #e8edf2 100%)', padding: '40px 20px', direction: 'rtl' };
const loaderContainer: any = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#161616' };
const header: any = { maxWidth: '1400px', margin: '0 auto 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' };
const mainTitle: any = { fontSize: '2.5rem', fontWeight: '900', color: '#e5e7eb', margin: 0, letterSpacing: '-0.5px' };
const subtitle: any = { color: '#64748b', fontSize: '1.05rem', marginTop: '5px' };
const tierBadge: any = { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '50px', border: '2px solid #2a2a2a', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const logoutBtn: any = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: '12px', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' };
const tierProgress: any = { maxWidth: '1400px', margin: '0 auto 30px', background: '#1c1c1c', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' };
const tierProgressHeader: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontWeight: 'bold', color: '#e5e7eb' };
const progressBar: any = { width: '100%', height: '12px', background: '#242424', borderRadius: '10px', overflow: 'hidden' };
const progressFill: any = { height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', transition: '0.5s ease' };
const statsGrid: any = { maxWidth: '1400px', margin: '0 auto 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' };
const statCard: any = { background: '#1c1c1c', borderRadius: '20px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', transition: '0.4s', display: 'flex', alignItems: 'center', gap: '20px' };
const statIconContainer: any = { width: '70px', height: '70px', borderRadius: '18px', background: '#1a0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const statContent: any = { flex: 1 };
const statLabel: any = { color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' };
const statValue: any = { fontSize: '2rem', fontWeight: '900', color: '#e5e7eb', margin: 0 };
const statGrowth: any = { color: '#e50914', fontSize: '0.85rem', marginTop: '5px', fontWeight: '600' };
const pendingNotice: any = { maxWidth: '1400px', margin: '0 auto 30px', background: '#1c1c1c', padding: '20px', borderRadius: '16px', border: '1px solid #242424', display: 'flex', alignItems: 'center', gap: '15px' };
const toolsSection: any = { maxWidth: '1400px', margin: '0 auto 40px', background: '#1c1c1c', borderRadius: '20px', padding: '35px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' };
const sectionTitle: any = { fontSize: '1.5rem', fontWeight: '900', color: '#e5e7eb', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' };
const toolCard: any = { background: '#161616', padding: '25px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #2a2a2a' };
const toolHeader: any = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', fontWeight: 'bold', color: '#e5e7eb', fontSize: '1.05rem' };
const codeBox: any = { display: 'flex', gap: '12px', background: '#1c1c1c', padding: '18px', borderRadius: '12px', border: '1px solid #2a2a2a', alignItems: 'center' };
const codeText: any = { flex: 1, fontSize: '0.9rem', wordBreak: 'break-all', color: '#94a3b8', fontFamily: 'monospace' };
const copyBtn: any = { padding: '10px 16px', background: '#242424', border: '1px solid #2a2a2a', borderRadius: '10px', cursor: 'pointer', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 'bold', color: '#64748b' };
const toolHint: any = { marginTop: '12px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' };
const promoCodeDisplay: any = { display: 'flex', gap: '12px', alignItems: 'center' };
const promoCodeBadge: any = { flex: 1, background: 'linear-gradient(135deg, #e50914 0%, #229954 100%)', color: '#fff', padding: '20px 30px', borderRadius: '12px', fontSize: '1.8rem', fontWeight: '900', textAlign: 'center', letterSpacing: '3px', fontFamily: 'monospace', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)' };
const withdrawalSection: any = { maxWidth: '1400px', margin: '0 auto 40px', background: '#1c1c1c', borderRadius: '20px', padding: '35px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' };
const withdrawalCard: any = { background: '#161616', padding: '25px', borderRadius: '16px', border: '1px solid #2a2a2a' };
const inputGroup: any = { marginBottom: '20px' };
const label: any = { display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#e5e7eb', fontSize: '0.95rem' };
const input: any = { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #2a2a2a', fontSize: '1rem', outline: 'none', background: '#1c1c1c' };
const saveButton: any = { display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 30px', background: '#e50914', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', fontSize: '1rem', boxShadow: '0 4px 10px rgba(39, 174, 96, 0.3)' };
const commissionsSection: any = { maxWidth: '1400px', margin: '0 auto', background: '#1c1c1c', borderRadius: '20px', padding: '35px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' };
const refreshBtn: any = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', transition: '0.3s' };
const tableWrapper: any = { overflowX: 'auto', borderRadius: '12px', border: '1px solid #2a2a2a' };
const table: any = { width: '100%', borderCollapse: 'collapse' };
const tableHeader: any = { background: '#161616' };
const th: any = { padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: '#94a3b8', fontSize: '0.9rem', borderBottom: '2px solid #2a2a2a' };
const tableRow: any = { borderBottom: '1px solid #242424', transition: '0.2s' };
const td: any = { padding: '18px 20px', color: '#e5e7eb', fontSize: '0.95rem' };
const statusBadgeInTable: any = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' };
const emptyState: any = { textAlign: 'center', padding: '80px 20px' };
const emptyText: any = { fontSize: '1.2rem', color: '#64748b', fontWeight: 'bold', marginTop: '20px', marginBottom: '8px' };
const emptyHint: any = { color: '#94a3b8', fontSize: '0.95rem' };