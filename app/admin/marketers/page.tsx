'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Users, DollarSign, Wallet, ArrowDownCircle, Loader2, Search, 
  Award, TrendingUp, Eye, Copy, Link as LinkIcon, Ticket, X 
} from 'lucide-react';
import toast from 'react-hot-toast';

const TIER_CONFIG: any = {
  bronze: { name: 'برونزي', color: '#cd7f32', percentage: 5, minConversions: 0, icon: '🥉' },
  silver: { name: 'فضي', color: '#c0c0c0', percentage: 7, minConversions: 10, icon: '🥈' },
  gold: { name: 'ذهبي', color: '#ffd700', percentage: 10, minConversions: 20, icon: '🥇' },
  diamond: { name: 'ماسي', color: '#b9f2ff', percentage: 10, minConversions: 30, icon: '💎' }
};

export default function AdminMarketers() {
  const [marketers, setMarketers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMarketer, setSelectedMarketer] = useState<any>(null);

  useEffect(() => { fetchMarketers(); }, []);

  async function fetchMarketers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketers')
        .select('*')
        .order('total_earnings', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Fetched marketers:', data);
      setMarketers(data || []);
      
      if (!data || data.length === 0) {
        toast('لا يوجد مسوقين مسجلين بعد', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      console.error('❌ Error fetching marketers:', err);
      toast.error('خطأ في جلب المسوقين: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handlePayout = async (id: string, amount: number) => {
    if (amount <= 0) {
      toast.error('لا يوجد رصيد متاح للصرف');
      return;
    }
    
    if (!confirm(`هل أنت متأكد من تسجيل دفع ${amount.toFixed(2)} ج.م وتصفير رصيد هذا المسوق؟`)) return;
    
    try {
      const { error } = await supabase
        .from('marketers')
        .update({ balance: 0 })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تصفير الرصيد بنجاح ✅');
      fetchMarketers();
    } catch (err: any) {
      console.error('Payout error:', err);
      toast.error('فشل العملية: ' + err.message);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}!`);
  };

  const getTierInfo = (tier: string) => {
    return TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  };

  const filteredMarketers = marketers.filter(m => 
    m.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    m.promo_code?.toUpperCase().includes(search.toUpperCase()) ||
    m.referral_id?.toUpperCase().includes(search.toUpperCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={loaderStyle}>
        <Loader2 className="animate-spin" size={40} color="#27ae60" />
        <p>جاري تحميل قائمة المسوقين...</p>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>
          <Users size={32} color="#27ae60" /> شبكة المسوقين (Affiliates)
          <span style={countBadge}>{marketers.length}</span>
        </h1>
        <div style={searchBox}>
          <Search size={18} color="#94a3b8" />
          <input 
            placeholder="ابحث باسم المسوق، الكود، أو البريد..." 
            style={searchInp} 
            value={search}
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {filteredMarketers.length === 0 ? (
        <div style={emptyState}>
          <Users size={64} color="#ccc" />
          <h3 style={{ color: '#64748b', marginTop: '20px' }}>
            {search ? 'لا يوجد مسوقين مطابقين للبحث' : 'لا يوجد مسوقين مسجلين بعد'}
          </h3>
          <p style={{ color: '#94a3b8', marginTop: '10px' }}>
            {search ? 'حاول البحث بكلمات أخرى' : 'سيظهرون هنا بمجرد التسجيل في نظام الأفلييت'}
          </p>
        </div>
      ) : (
        <div style={tableCard}>
          <table style={table}>
            <thead>
              <tr style={thRow}>
                <th style={th}>المسوق</th>
                <th style={th}>المستوى</th>
                <th style={th}>الأكواد</th>
                <th style={th}>الأداء</th>
                <th style={th}>إجمالي الأرباح</th>
                <th style={th}>الرصيد المتاح</th>
                <th style={th}>الرصيد المعلق</th>
                <th style={th}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredMarketers.map(m => {
                const tierInfo = getTierInfo(m.current_tier || 'bronze');
                return (
                  <tr key={m.id} style={tr}>
                    <td style={td}>
                      <div style={{ fontWeight: '900', color: '#1e293b', marginBottom: '4px' }}>
                        {m.full_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {m.email}
                      </div>
                      {m.phone_number && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          {m.phone_number}
                        </div>
                      )}
                    </td>
                    
                    <td style={td}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: `${tierInfo.color}15`,
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: `2px solid ${tierInfo.color}40`,
                        width: 'fit-content'
                      }}>
                        <span style={{ fontSize: '1.3rem' }}>{tierInfo.icon}</span>
                        <div>
                          <div style={{ 
                            fontWeight: '900', 
                            color: tierInfo.color,
                            fontSize: '0.85rem'
                          }}>
                            {tierInfo.name}
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: tierInfo.color,
                            opacity: 0.8
                          }}>
                            {tierInfo.percentage}% عمولة
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={codeBox}>
                          <LinkIcon size={11} color="#64748b" />
                          <code style={{ fontSize: '0.8rem' }}>{m.referral_id}</code>
                          <button
                            onClick={() => copyToClipboard(m.referral_id, 'كود الإحالة')}
                            style={copyBtn}
                            title="نسخ"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                        <div style={codeBox}>
                          <Ticket size={11} color="#64748b" />
                          <code style={{ fontSize: '0.8rem' }}>{m.promo_code}</code>
                          <button
                            onClick={() => copyToClipboard(m.promo_code, 'كود البرومو')}
                            style={copyBtn}
                            title="نسخ"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    </td>
                    
                    <td style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={statItem}>
                          <TrendingUp size={12} color="#3b82f6" />
                          <span style={{ fontSize: '0.85rem' }}>
                            {m.total_clicks || 0} نقرة
                          </span>
                        </div>
                        <div style={statItem}>
                          <Award size={12} color="#27ae60" />
                          <span style={{ fontSize: '0.85rem' }}>
                            {m.total_conversions || 0} تحويل
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td style={td}>
                      <span style={{ color: '#64748b', fontWeight: '900', fontSize: '1rem' }}>
                        {(m.total_earnings || 0).toFixed(2)} ج.م
                      </span>
                    </td>
                    
                    <td style={td}>
                      <span style={{ color: '#27ae60', fontWeight: '900', fontSize: '1.1rem' }}>
                        {(m.balance || 0).toFixed(2)} ج.م
                      </span>
                    </td>
                    
                    <td style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ color: '#f59e0b', fontWeight: '900', fontSize: '0.95rem' }}>
                          {(m.pending_balance || 0).toFixed(2)} ج.م
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                          (14 يوم)
                        </span>
                      </div>
                    </td>
                    
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          disabled={!m.balance || m.balance <= 0} 
                          onClick={() => handlePayout(m.id, m.balance)}
                          style={m.balance > 0 ? payBtn : disabledBtn}
                          title={m.balance > 0 ? 'صرف العمولة' : 'لا يوجد رصيد'}
                        >
                          <ArrowDownCircle size={16} /> صرف
                        </button>
                        <button 
                          onClick={() => setSelectedMarketer(m)}
                          style={viewBtn}
                          title="عرض التفاصيل"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Marketer Details */}
      {selectedMarketer && (
        <div style={modalOverlay} onClick={() => setSelectedMarketer(null)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>
                <Award size={28} color="#27ae60" />
                تفاصيل المسوق: {selectedMarketer.full_name}
              </h2>
              <button onClick={() => setSelectedMarketer(null)} style={closeBtn}>
                <X size={24} />
              </button>
            </div>
            
            <div style={detailsGrid}>
              <div style={detailItem}>
                <strong>البريد الإلكتروني:</strong>
                <span>{selectedMarketer.email}</span>
              </div>
              <div style={detailItem}>
                <strong>رقم الموبايل:</strong>
                <span>{selectedMarketer.phone_number || 'غير محدد'}</span>
              </div>
              <div style={detailItem}>
                <strong>المستوى الحالي:</strong>
                <span>{getTierInfo(selectedMarketer.current_tier).icon} {getTierInfo(selectedMarketer.current_tier).name}</span>
              </div>
              <div style={detailItem}>
                <strong>نسبة العمولة:</strong>
                <span style={{ color: '#27ae60', fontWeight: '900' }}>
                  {selectedMarketer.tier_percentage || 5}%
                </span>
              </div>
              <div style={detailItem}>
                <strong>كود الإحالة:</strong>
                <code style={inlineCode}>{selectedMarketer.referral_id}</code>
              </div>
              <div style={detailItem}>
                <strong>كود البرومو:</strong>
                <code style={inlineCode}>{selectedMarketer.promo_code}</code>
              </div>
              <div style={detailItem}>
                <strong>إجمالي النقرات:</strong>
                <span>{selectedMarketer.total_clicks || 0}</span>
              </div>
              <div style={detailItem}>
                <strong>إجمالي التحويلات:</strong>
                <span>{selectedMarketer.total_conversions || 0}</span>
              </div>
              <div style={detailItem}>
                <strong>معدل التحويل:</strong>
                <span>
                  {selectedMarketer.total_clicks > 0 
                    ? ((selectedMarketer.total_conversions / selectedMarketer.total_clicks) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
              <div style={detailItem}>
                <strong>إجمالي الأرباح:</strong>
                <span style={{ color: '#64748b', fontWeight: '900' }}>
                  {(selectedMarketer.total_earnings || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div style={detailItem}>
                <strong>الرصيد المتاح للصرف:</strong>
                <span style={{ color: '#27ae60', fontWeight: '900' }}>
                  {(selectedMarketer.balance || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div style={detailItem}>
                <strong>الرصيد المعلق (14 يوم):</strong>
                <span style={{ color: '#f59e0b', fontWeight: '900' }}>
                  {(selectedMarketer.pending_balance || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div style={detailItem}>
                <strong>طريقة السحب:</strong>
                <span>
                  {selectedMarketer.withdrawal_method === 'instapay' 
                    ? '💳 إنستاباي' 
                    : selectedMarketer.withdrawal_method === 'e-wallet' 
                    ? '📱 محفظة إلكترونية' 
                    : 'غير محدد'}
                </span>
              </div>
              <div style={detailItem}>
                <strong>رقم السحب:</strong>
                <span>{selectedMarketer.withdrawal_phone || 'غير محدد'}</span>
              </div>
              <div style={detailItem}>
                <strong>الحالة:</strong>
                <span style={{ 
                  color: selectedMarketer.status === 'active' ? '#27ae60' : '#e74c3c',
                  fontWeight: '900'
                }}>
                  {selectedMarketer.status === 'active' ? '✅ نشط' : '❌ معطل'}
                </span>
              </div>
              <div style={detailItem}>
                <strong>تاريخ التسجيل:</strong>
                <span>{new Date(selectedMarketer.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
            
            <button onClick={() => setSelectedMarketer(null)} style={closeModalBtn}>
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- التنسيقات ---
const container: any = { padding: '30px', direction: 'rtl', maxWidth: '1600px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' };
const header: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' };
const title: any = { fontSize: '2rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '15px', margin: 0 };
const countBadge: any = { background: '#27ae60', color: '#fff', padding: '4px 14px', borderRadius: '12px', fontSize: '1rem' };
const searchBox: any = { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '12px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', minWidth: '350px' };
const searchInp: any = { border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' };
const tableCard: any = { background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '10px', overflowX: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { borderBottom: '2px solid #f1f5f9', background: '#fcfcfc' };
const th: any = { padding: '18px 15px', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' };
const tr: any = { borderBottom: '1px solid #f1f5f9', transition: '0.2s' };
const td: any = { padding: '18px 15px', fontSize: '0.95rem', verticalAlign: 'middle' };
const codeBox: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'monospace', width: 'fit-content' };
const copyBtn: any = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#27ae60', padding: '3px', display: 'flex', alignItems: 'center' };
const statItem: any = { display: 'flex', alignItems: 'center', gap: '6px' };
const payBtn: any = { background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.85rem', transition: '0.2s' };
const disabledBtn: any = { ...payBtn, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' };
const viewBtn: any = { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s' };
const loaderStyle: any = { textAlign: 'center', padding: '100px', color: '#27ae60', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' };
const emptyState: any = { textAlign: 'center', padding: '100px 20px', color: '#64748b' };
const modalOverlay: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContent: any = { background: '#fff', padding: '40px', borderRadius: '30px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' };
const modalHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const modalTitle: any = { margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' };
const closeBtn: any = { background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const detailsGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', fontSize: '0.95rem' };
const detailItem: any = { display: 'flex', flexDirection: 'column', gap: '6px' };
const inlineCode: any = { background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' };
const closeModalBtn: any = { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', transition: '0.2s' };
