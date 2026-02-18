'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Ticket, Plus, Trash2, Power, PowerOff, 
  Loader2, Calendar, Tag, Percent, Banknote, Truck 
} from 'lucide-react';
import toast from 'react-hot-toast';



export default function PromoCodesAdmin() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    expiry_date: '',
    is_active: true
  });



  useEffect(() => {
    fetchCoupons();
  }, []);



  async function fetchCoupons() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCoupons(data || []);
    } catch (err: any) {
      toast.error('خطأ في جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }



  async function handleAddCoupon(e: React.FormEvent) {
    e.preventDefault();
    
    const isFreeShipping = newCoupon.discount_type === 'free_shipping';
    if (!newCoupon.code || (!isFreeShipping && !newCoupon.discount_value)) {
      return toast.error('أكمل البيانات المطلوبة');
    }

    setBtnLoading(true);
    try {
      const { error } = await supabase.from('coupons').insert([{
        code: newCoupon.code.toUpperCase().trim(),
        discount_type: newCoupon.discount_type,
        discount_value: isFreeShipping ? 0 : parseFloat(newCoupon.discount_value),
        expiry_date: newCoupon.expiry_date || null,
        is_active: newCoupon.is_active
      }]);

      if (error) throw error;

      toast.success('تم إضافة الكود بنجاح! 🎫');
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '', expiry_date: '', is_active: true });
      fetchCoupons();
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally {
      setBtnLoading(false);
    }
  }



  async function toggleStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase.from('coupons').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      setCoupons(coupons.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
      toast.success('تم تحديث الحالة');
    } catch (err: any) {
      toast.error(err.message);
    }
  }



  async function deleteCoupon(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons(coupons.filter(c => c.id !== id));
      toast.success('تم الحذف بنجاح');
    } catch (err: any) {
      toast.error(err.message);
    }
  }



  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}><Ticket size={28} color="#27ae60" /> إدارة أكواد الخصم</h1>
        <p style={subtitle}>أنشئ عروضك الخاصة وتابع فاعلية أكواد الخصم</p>
      </div>

      <div style={layoutGrid}>
        {/* فورم إضافة كود جديد */}
        <div style={card}>
          <h3 style={cardTitle}><Plus size={18} /> إضافة كود جديد</h3>
          <form onSubmit={handleAddCoupon} style={form}>
            <div style={inputGroup}>
              <label style={label}>رمز الكود (مثلاً: FREE_SHIP)</label>
              <input 
                style={input} 
                value={newCoupon.code} 
                onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} 
                placeholder="ادخل رمز الخصم"
              />
            </div>

            <div style={row}>
              <div style={{ flex: 1 }}>
                <label style={label}>نوع الخصم</label>
                <select 
                  style={input} 
                  value={newCoupon.discount_type} 
                  onChange={e => setNewCoupon({...newCoupon, discount_type: e.target.value})}
                >
                  <option value="percentage">نسبة مئوية (%)</option>
                  <option value="fixed">مبلغ ثابت (ج.م)</option>
                  <option value="free_shipping">شحن مجاني 🚚</option>
                </select>
              </div>
              
              {newCoupon.discount_type !== 'free_shipping' && (
                <div style={{ flex: 1 }}>
                  <label style={label}>القيمة</label>
                  <input 
                    type="number" 
                    style={input} 
                    value={newCoupon.discount_value} 
                    onChange={e => setNewCoupon({...newCoupon, discount_value: e.target.value})} 
                    placeholder="10"
                  />
                </div>
              )}
            </div>

            <div style={inputGroup}>
              <label style={label}><Calendar size={14} /> تاريخ الانتهاء (اختياري)</label>
              <input 
                type="date" 
                style={input} 
                value={newCoupon.expiry_date} 
                onChange={e => setNewCoupon({...newCoupon, expiry_date: e.target.value})} 
              />
            </div>

            <button disabled={btnLoading} style={submitBtn}>
              {btnLoading ? <Loader2 className="animate-spin" /> : 'إنشاء الكود الآن'}
            </button>
          </form>
        </div>

        {/* قائمة الأكواد الحالية */}
        <div style={{ ...card, flex: 2 }}>
          <h3 style={cardTitle}>الأكواد النشطة ({coupons.length})</h3>
          {loading ? (
            <div style={loaderWrap}><Loader2 className="animate-spin" /> جاري التحميل...</div>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr style={theadRow}>
                    <th style={th}>الكود</th>
                    <th style={th}>الخصم</th>
                    <th style={th}>الحالة</th>
                    <th style={th}>تنتهي في</th>
                    <th style={th}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(coupon => (
                    <tr key={coupon.id} style={tr}>
                      <td style={{ ...td, fontWeight: '900', color: '#1a1a1a' }}>{coupon.code}</td>
                      <td style={td}>
                        {coupon.discount_type === 'percentage' ? (
                          <span style={badgePercent}><Percent size={12} /> {coupon.discount_value}%</span>
                        ) : coupon.discount_type === 'fixed' ? (
                          <span style={badgeFixed}><Banknote size={12} /> {coupon.discount_value} ج.م</span>
                        ) : (
                          <span style={badgeFree}><Truck size={12} /> شحن مجاني</span>
                        )}
                      </td>
                      <td style={td}>
                        <button 
                          onClick={() => toggleStatus(coupon.id, coupon.is_active)}
                          style={coupon.is_active ? statusActive : statusInactive}
                        >
                          {coupon.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                          {coupon.is_active ? 'نشط' : 'معطل'}
                        </button>
                      </td>
                      <td style={td}>{coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString('ar-EG') : 'بدون انتهاء'}</td>
                      <td style={td}>
                        <button onClick={() => deleteCoupon(coupon.id)} style={deleteBtn} title="حذف">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coupons.length === 0 && <p style={emptyText}>لا توجد أكواد خصم حالياً</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



// --- التنسيقات ---
const container: any = { padding: '40px', direction: 'rtl', minHeight: '100vh', background: '#f8fafc' };
const header: any = { marginBottom: '30px' };
const title: any = { fontSize: '2rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' };
const subtitle: any = { color: '#64748b', fontSize: '1rem', marginTop: '5px' };
const layoutGrid: any = { display: 'flex', gap: '25px', flexWrap: 'wrap', alignItems: 'flex-start' };
const card: any = { background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', flex: 1, minWidth: '350px', border: '1px solid #e2e8f0' };
const cardTitle: any = { fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' };
const form: any = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputGroup: any = { display: 'flex', flexDirection: 'column', gap: '8px' };
const label: any = { fontSize: '0.85rem', fontWeight: '700', color: '#475569' };
const input: any = { padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: '0.95rem' };
const row: any = { display: 'flex', gap: '15px' };
const submitBtn: any = { background: '#15803d', color: '#fff', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const tableWrap: any = { overflowX: 'auto' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const theadRow: any = { borderBottom: '2px solid #f1f5f9' };
const th: any = { padding: '15px 10px', color: '#64748b', fontSize: '0.85rem', fontWeight: '700' };
const tr: any = { borderBottom: '1px solid #f1f5f9' };
const td: any = { padding: '15px 10px', fontSize: '0.9rem' };
const badgePercent: any = { background: '#f0fdf4', color: '#15803d', padding: '5px 10px', borderRadius: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', width: 'fit-content' };
const badgeFixed: any = { background: '#eff6ff', color: '#1d4ed8', padding: '5px 10px', borderRadius: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', width: 'fit-content' };
const badgeFree: any = { background: '#fff7ed', color: '#c2410c', padding: '5px 10px', borderRadius: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', width: 'fit-content', border: '1px solid #ffedd5' };
const statusActive: any = { background: '#dcfce7', color: '#15803d', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' };
const statusInactive: any = { background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' };
const deleteBtn: any = { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', transition: '0.3s' };
const loaderWrap: any = { padding: '50px', textAlign: 'center', color: '#15803d', fontWeight: 'bold' };
const emptyText: any = { textAlign: 'center', padding: '40px', color: '#94a3b8' };
