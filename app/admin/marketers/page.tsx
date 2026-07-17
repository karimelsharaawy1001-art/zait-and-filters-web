'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Users, ArrowDownCircle, Loader2, Search,
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
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loadingComm, setLoadingComm] = useState(false);
  const [commMarketer, setCommMarketer] = useState<any>(null);



  useEffect(() => {
    fetchMarketers();
  }, []);



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
        toast('No Promoters registered yet', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      console.error('❌ Error fetching marketers:', err);
      toast.error('Error fetching Promoters: ' + err.message);
    } finally {
      setLoading(false);
    }
  }



  const handlePayout = async (id: string, amount: number) => {
    if (amount <= 0) { toast.error('لا يوجد رصيد متاح للصرف'); return; }
    if (!confirm(`هل أنت متأكد من تسجيل دفع؟ (سيتم تصفير رصيد هذا Promoter)`)) return;
    try {
      const { error } = await supabase.from('marketers').update({ balance: 0 }).eq('id', id);
      if (error) throw error;
      toast.success('تم تصفير الرصيد بنجاح ✅');
      fetchMarketers();
    } catch (err: any) {
      toast.error('فشل العملية: ' + err.message);
    }
  };

  const openCommissions = async (marketer: any) => {
    setCommMarketer(marketer);
    setLoadingComm(true);
    const { data } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('marketer_id', marketer.id)
      .order('created_at', { ascending: false });
    setCommissions(data || []);
    setLoadingComm(false);
  };

  const markAsPaid = async (commId: string, amount: number, marketerId: string) => {
    if (!confirm(`Confirm payment for this Commission?`)) return;
    try {
      await supabase.from('affiliate_commissions')
        .update({ is_released: true, status: 'paid' }).eq('id', commId);
      const { data: mkt } = await supabase.from('marketers')
        .select('pending_balance, total_earnings').eq('id', marketerId).single();
      await supabase.from('marketers').update({
        pending_balance: Math.max(0, parseFloat(String(mkt?.pending_balance || 0)) - amount),
        total_earnings: parseFloat(String(mkt?.total_earnings || 0)) + amount,
      }).eq('id', marketerId);
      toast.success('✅ تم تسجيل الدفع');
      openCommissions(commMarketer);
      fetchMarketers();
    } catch (err: any) { toast.error('فشل: ' + err.message); }
  };

  const releaseAvailable = async (marketerId: string) => {
    const now = new Date().toISOString();
    const { data } = await supabase.from('affiliate_commissions')
      .select('id').eq('marketer_id', marketerId).eq('status', 'in_review')
      .lte('release_date', now);
    if (!data?.length) { toast('No Commissions ready for release yet'); return; }
    await supabase.from('affiliate_commissions')
      .update({ status: 'available' }).in('id', data.map(d => d.id));
    toast.success(`✅ ✅ Commissions updated to "ready for payment"`);
    openCommissions(commMarketer);
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
        <p>Loading Promoters......</p>
      </div>
    );
  }



  return (
    <div style={container}>
      <style>{`
        /* ── Mobile responsive for Promoters admin ── */
        @media (max-width: 900px) {
          .pm-hide-md { display: none !important; }
        }
        @media (max-width: 640px) {
          .pm-header { flex-direction: column !important; align-items: stretch !important; }
          .pm-header-actions { flex-direction: column !important; }
          .pm-search { max-width: 100% !important; }
          .pm-fix-btn { width: 100% !important; justify-content: center; }

          /* Card-based table rows on mobile */
          .pm-table thead { display: none !important; }
          .pm-table tr {
            display: block !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 16px !important;
            margin-bottom: 12px !important;
            padding: 12px !important;
            background: #fff !important;
          }
          .pm-table td {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 7px 4px !important;
            border-bottom: 1px solid #f8fafc !important;
            font-size: 0.82rem !important;
            gap: 8px;
          }
          .pm-table td:last-child { border-bottom: none !important; }
          .pm-table td[data-label]::before {
            content: attr(data-label);
            font-weight: 700;
            color: #6b7280;
            font-size: 0.72rem;
            flex-shrink: 0;
            min-width: 90px;
          }
          .pm-hide-mobile { display: none !important; }
          .pm-actions-td { justify-content: flex-end !important; }
        }

        /* Commission modal responsive */
        .pm-comm-modal { width: 96vw !important; padding: 16px !important; }
        .pm-comm-table th, .pm-comm-table td { padding: 8px 6px !important; font-size: 0.78rem !important; }
        @media (max-width: 600px) {
          .pm-comm-table .pm-hide-sm { display: none !important; }
          .pm-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={header} className="pm-header">
        <h1 style={title}>
          <Users size={32} color="#27ae60" /> Promoters Network
          <span style={countBadge}>{marketers.length}</span>
        </h1>
        <div className="pm-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' as const }}>
          <div style={searchBox}>
            <Search size={18} color="#6b7280" />
            <input
              placeholder="Search by Promoter name, code, or email..."
              style={searchInp}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={async () => {
              if (!confirm('This will scan all past orders and create missing Commissions. Continue?')) return;
              const t = toast.loading('Fixing missing Commissions......');
              try {
                const res = await fetch('/api/affiliate/fix-commissions', { method: 'POST' });
                const data = await res.json();
                toast.dismiss(t);
                if (data.error) toast.error('فشل: ' + data.error);
                else { toast.success(data.message, { duration: 6000 }); fetchMarketers(); }
              } catch (e: any) { toast.dismiss(t); toast.error(e.message); }
            }}
            style={{ padding: '10px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            🔧 Fix Missing Commissions
          </button>
        </div>
      </div>



      {filteredMarketers.length === 0 ? (
        <div style={emptyState}>
          <Users size={64} color="#9ca3af" />
          <h3 style={{ color: '#6b7280', marginTop: '20px' }}>
            {search ? 'No Promoters match your search' : 'No Promoters registered yet'}
          </h3>
          <p style={{ color: '#6b7280', marginTop: '10px' }}>
            {search ? 'حاول البحث بكلمات أخرى' : 'سيظهرون هنا بمجرد التسجيل في نظام الأفلييت'}
          </p>
        </div>
      ) : (
        <div style={tableCard}>
          <table style={table} className="pm-table">
            <thead>
              <tr style={thRow}>
                <th style={th}>Promoter</th>
                <th style={th}>المستوى</th>
                <th style={th}>الأكواد</th>
                <th style={th} className="pm-hide-md">الأداء</th>
                <th style={th} className="pm-hide-md">Total Earnings</th>
                <th style={th} className="pm-hide-md">Available Balance</th>
                <th style={th}>Pending Balance</th>
                <th style={th} className="pm-hide-md">Payment Info</th>
                <th style={th}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredMarketers.map(m => {
                const tierInfo = getTierInfo(m.current_tier || 'bronze');
                return (
                  <tr key={m.id} style={tr}>
                    <td style={td} data-label="Promoter">
                      <div style={{ fontWeight: '900', color: '#1e293b', marginBottom: '4px' }}>
                        {m.full_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {m.email}
                      </div>
                      {m.phone_number && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                          {m.phone_number}
                        </div>
                      )}
                    </td>

                    <td style={td} data-label="Level">
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
                            {tierInfo.percentage}% Commission
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={td} data-label="Codes">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={codeBox}>
                          <LinkIcon size={11} color="#6b7280" />
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
                          <Ticket size={11} color="#6b7280" />
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
                    
                    <td style={td} data-label="Performance" className="pm-hide-md">
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
                    
                    <td style={td} data-label="Total Earned" className="pm-hide-md">
                      <span style={{ color: '#6b7280', fontWeight: '900', fontSize: '1rem' }}>
                        {(m.total_earnings || 0).toFixed(2)} ج.م
                      </span>
                    </td>

                    <td style={td} data-label="Available" className="pm-hide-md">
                      <span style={{ color: '#27ae60', fontWeight: '900', fontSize: '1.1rem' }}>
                        {(m.balance || 0).toFixed(2)} ج.م
                      </span>
                    </td>

                    <td style={td} data-label="Pending">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ color: '#f59e0b', fontWeight: '900', fontSize: '0.95rem' }}>
                          {(m.pending_balance || 0).toFixed(2)} ج.م
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                          (14d)
                        </span>
                      </div>
                    </td>

                    <td style={td} data-label="Payment" className="pm-hide-md">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                        {(m.instapay_phone || m.withdrawal_phone) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', borderRadius: '8px', padding: '3px 8px', color: '#15803d', fontWeight: '700', direction: 'ltr' }}>
                            📱 {m.instapay_phone || m.withdrawal_phone}
                          </div>
                        )}
                        {m.wallet_phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#eff6ff', borderRadius: '8px', padding: '3px 8px', color: '#1d4ed8', fontWeight: '700', direction: 'ltr' }}>
                            💳 {m.wallet_phone}
                          </div>
                        )}
                        {!m.instapay_phone && !m.withdrawal_phone && !m.wallet_phone && (
                          <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>لم يُضف بعد</span>
                        )}
                      </div>
                    </td>

                    <td style={td} data-label=" " className="pm-actions-td">
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' as const }}>
                        <button 
                          disabled={!m.balance || m.balance <= 0} 
                          onClick={() => handlePayout(m.id, m.balance)}
                          style={m.balance > 0 ? payBtn : disabledBtn}
                          title={m.balance > 0 ? 'Pay Commission' : 'لا يوجد رصيد'}
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
                Promoter Details: {selectedMarketer.full_name}
              </h2>
              <button onClick={() => setSelectedMarketer(null)} style={closeBtn}>
                <X size={24} />
              </button>
            </div>
            
            <div style={detailsGrid} className="pm-detail-grid">
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
                <strong>Commission Rate:</strong>
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
                <strong>Total Earnings:</strong>
                <span style={{ color: '#6b7280', fontWeight: '900' }}>
                  {(selectedMarketer.total_earnings || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div style={detailItem}>
                <strong>Available Balance للصرف:</strong>
                <span style={{ color: '#27ae60', fontWeight: '900' }}>
                  {(selectedMarketer.balance || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div style={detailItem}>
                <strong>Pending Balance (14 يوم):</strong>
                <span style={{ color: '#f59e0b', fontWeight: '900' }}>
                  {(selectedMarketer.pending_balance || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div style={{ ...detailItem, gridColumn: '1 / -1', flexDirection: 'column' as const, gap: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>💸 بيانات الاستلام</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#15803d', marginBottom: '4px' }}>📱 انستاباي</div>
                    <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#0f172a', direction: 'ltr' }}>
                      {selectedMarketer.instapay_phone || selectedMarketer.withdrawal_phone || <span style={{ color: '#6b7280', fontWeight: '600' }}>غير محدد</span>}
                    </div>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#1d4ed8', marginBottom: '4px' }}>💳 محفظة إلكترونية</div>
                    <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#0f172a', direction: 'ltr' }}>
                      {selectedMarketer.wallet_phone || <span style={{ color: '#6b7280', fontWeight: '600' }}>غير محدد</span>}
                    </div>
                  </div>
                </div>
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
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setSelectedMarketer(null); openCommissions(selectedMarketer); }}
                style={{ flex: 1, padding: '12px', background: '#f0fdf4', border: '1.5px solid #22c55e', borderRadius: '12px', color: '#15803d', fontWeight: '800', cursor: 'pointer', fontSize: '0.92rem', fontFamily: 'inherit' }}>
                💰 View Commissions & Payment Details
              </button>
              <button onClick={() => setSelectedMarketer(null)} style={{ ...closeModalBtn, flex: 1 }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Commissions modal ── */}
      {commMarketer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
          onClick={() => setCommMarketer(null)}>
          <div className="pm-comm-modal" style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '860px', padding: '28px', direction: 'rtl', marginTop: '20px' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>💰 Commissions: {commMarketer.full_name}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>كود: {commMarketer.promo_code} — رصيد معلق: <b style={{ color: '#f59e0b' }}>{(commMarketer.pending_balance || 0).toFixed(2)} ج.م</b></p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => releaseAvailable(commMarketer.id)}
                  style={{ padding: '8px 16px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px', color: '#92400e', fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                  🔓 Release Ready Commissions
                </button>
                <button onClick={() => setCommMarketer(null)}
                  style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit' }}>
                  ✕ إغلاق
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' as const }}>
              {[['pending','#e0f2fe','#0369a1','⏳ قيد الانتظار (لم يُسلَّم بعد)'],
                ['in_review','#fef3c7','#92400e','🔄 تحت المراجعة (14 يوم من التسليم)'],
                ['available','#d1fae5','#065f46','✅ جاهزة للدفع'],
                ['paid','#f3f4f6','#6b7280','💸 تم الدفع']
              ].map(([s,bg,col,lbl])=>(
                <span key={s} style={{ fontSize:'0.72rem', fontWeight:'700', padding:'3px 10px', borderRadius:'12px', background: bg as string, color: col as string }}>{lbl as string}</span>
              ))}
            </div>

            {loadingComm ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}><Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto' }} /></div>
            ) : commissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontWeight: '700' }}>No Commissions yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="pm-comm-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {[
                        {h:'رقم الطلب',cls:''},
                        {h:'تاريخ الطلب',cls:'pm-hide-sm'},
                        {h:'قيمة الطلب',cls:'pm-hide-sm'},
                        {h:'Commission',cls:''},
                        {h:'تاريخ التسليم',cls:'pm-hide-sm'},
                        {h:'تاريخ الإفراج',cls:''},
                        {h:'الحالة',cls:''},
                        {h:'إجراء',cls:''},
                      ].map(({h,cls})=>(
                        <th key={h} className={cls} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#475569', borderBottom: '1.5px solid #f1f5f9', whiteSpace: 'nowrap' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c: any) => {
                      const now = new Date();
                      const releaseDate = c.release_date ? new Date(c.release_date) : null;
                      const daysLeft = releaseDate ? Math.ceil((releaseDate.getTime() - now.getTime()) / 86400000) : null;
                      const statusColors: Record<string,string[]> = {
                        pending:   ['#e0f2fe','#0369a1'],
                        in_review: ['#fef3c7','#92400e'],
                        available: ['#d1fae5','#065f46'],
                        paid:      ['#f3f4f6','#6b7280'],
                      };
                      const [bg, col] = statusColors[c.status] || ['#f3f4f6','#6b7280'];
                      const statusLabel: Record<string,string> = { pending:'⏳ انتظار', in_review:'🔄 مراجعة', available:'✅ جاهزة', paid:'💸 مدفوعة' };
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 12px', fontWeight: '700', color: '#0f172a' }}>#{c.order_id?.slice(0,8)}</td>
                          <td className="pm-hide-sm" style={{ padding: '10px 12px', color: '#6b7280' }}>{new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
                          <td className="pm-hide-sm" style={{ padding: '10px 12px', fontWeight: '700' }}>{parseFloat(c.order_total).toFixed(2)} ج.م</td>
                          <td style={{ padding: '10px 12px', color: '#15803d', fontWeight: '900' }}>+{parseFloat(c.commission_amount).toFixed(2)} ج.م</td>
                          <td className="pm-hide-sm" style={{ padding: '10px 12px', color: '#6b7280' }}>{c.delivery_date ? new Date(c.delivery_date).toLocaleDateString('ar-EG') : '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {releaseDate ? (
                              <span style={{ color: daysLeft && daysLeft > 0 ? '#f59e0b' : '#15803d', fontWeight: '700', fontSize: '0.8rem' }}>
                                {releaseDate.toLocaleDateString('ar-EG')}
                                {daysLeft && daysLeft > 0 ? ` (${daysLeft} يوم)` : ' ✓'}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: bg, color: col, padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>{statusLabel[c.status] || c.status}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {(c.status === 'available' || c.status === 'in_review') && !c.is_released ? (
                              <button onClick={() => markAsPaid(c.id, parseFloat(c.commission_amount), commMarketer.id)}
                                style={{ padding: '5px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}>
                                💸 دفع
                              </button>
                            ) : c.is_released ? (
                              <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>✓ مدفوع</span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}
    </div>
  );
}



// --- التنسيقات ---
const container: any = { padding: 'clamp(14px, 4vw, 30px)', direction: 'rtl', maxWidth: '1600px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' };
const header: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' };
const title: any = { fontSize: 'clamp(1.1rem, 5vw, 2rem)', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0, flexWrap: 'wrap' };
const countBadge: any = { background: '#27ae60', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem' };
const searchBox: any = { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px 16px', borderRadius: '15px', border: '1px solid #e2e8f0', flex: 1, minWidth: '0', maxWidth: '400px' };
const searchInp: any = { border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' };
const tableCard: any = { background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '10px', overflowX: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { borderBottom: '2px solid #f1f5f9', background: '#fcfcfc' };
const th: any = { padding: '18px 15px', color: '#6b7280', fontSize: '0.85rem', fontWeight: 'bold' };
const tr: any = { borderBottom: '1px solid #f1f5f9', transition: '0.2s' };
const td: any = { padding: '18px 15px', fontSize: '0.95rem', verticalAlign: 'middle' };
const codeBox: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'monospace', width: 'fit-content' };
const copyBtn: any = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#27ae60', padding: '3px', display: 'flex', alignItems: 'center' };
const statItem: any = { display: 'flex', alignItems: 'center', gap: '6px' };
const payBtn: any = { background: '#ffffff', color: '#1a1a1a', border: '1px solid #e5e7eb', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.85rem', transition: '0.2s' };
const disabledBtn: any = { ...payBtn, background: '#f1f5f9', color: '#6b7280', cursor: 'not-allowed' };
const viewBtn: any = { background: '#f8fafc', color: '#6b7280', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s' };
const loaderStyle: any = { textAlign: 'center', padding: '100px', color: '#27ae60', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' };
const emptyState: any = { textAlign: 'center', padding: '100px 20px', color: '#6b7280' };
const modalOverlay: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContent: any = { background: '#fff', padding: 'clamp(18px, 4vw, 40px)', borderRadius: 'clamp(16px, 4vw, 30px)', maxWidth: '700px', width: '92%', maxHeight: '90vh', overflowY: 'auto' };
const modalHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' };
const modalTitle: any = { margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' };
const closeBtn: any = { background: '#f8fafc', border: 'none', color: '#6b7280', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const detailsGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', fontSize: '0.95rem' };
const detailItem: any = { display: 'flex', flexDirection: 'column', gap: '6px' };
const inlineCode: any = { background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' };
const closeModalBtn: any = { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', transition: '0.2s' };
