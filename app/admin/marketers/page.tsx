'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Users, DollarSign, Wallet, ArrowDownCircle, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMarketers() {
  const [marketers, setMarketers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchMarketers(); }, []);

  async function fetchMarketers() {
    setLoading(true);
    const { data } = await supabase.from('marketers').select('*').order('total_earnings', { ascending: false });
    setMarketers(data || []);
    setLoading(false);
  }

  const handlePayout = async (id: string, amount: number) => {
    if (!confirm(`هل أنت متأكد من تسجيل دفع ${amount} ج.م وتصفير رصيد هذا المسوق؟`)) return;
    const { error } = await supabase.from('marketers').update({ balance: 0 }).eq('id', id);
    if (!error) {
      toast.success('تم تصفير الرصيد بنجاح ✅');
      fetchMarketers();
    }
  };

  const filteredMarketers = marketers.filter(m => m.full_name.toLowerCase().includes(search.toLowerCase()) || m.promo_code.includes(search.toUpperCase()));

  if (loading) return <div style={loaderStyle}><Loader2 className="animate-spin" /> جاري تحميل قائمة المسوقين...</div>;

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}><Users size={28} color="#27ae60" /> شبكة المسوقين (Affiliates)</h1>
        <div style={searchBox}>
          <Search size={18} color="#94a3b8" />
          <input placeholder="ابحث باسم المسوق أو الكود..." style={searchInp} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={tableCard}>
        <table style={table}>
          <thead>
            <tr style={thRow}>
              <th style={th}>المسوق</th>
              <th style={th}>الكود الخاص</th>
              <th style={th}>إجمالي المبيعات</th>
              <th style={th}>الرصيد القابل للصرف</th>
              <th style={th}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredMarketers.map(m => (
              <tr key={m.id} style={tr}>
                <td style={td}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{m.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.phone_number}</div>
                </td>
                <td style={td}><span style={codeBadge}>{m.promo_code}</span></td>
                <td style={td}>{m.total_earnings.toFixed(2)} ج.م</td>
                <td style={{ ...td, color: '#27ae60', fontWeight: '900' }}>{m.balance.toFixed(2)} ج.م</td>
                <td style={td}>
                  <button 
                    disabled={m.balance <= 0} 
                    onClick={() => handlePayout(m.id, m.balance)}
                    style={m.balance > 0 ? payBtn : disabledBtn}
                  >
                    <ArrowDownCircle size={16} /> صرف العمولة
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMarketers.length === 0 && <p style={emptyText}>لا يوجد مسوقين مطابقين للبحث</p>}
      </div>
    </div>
  );
}

// --- التنسيقات ---
const container: any = { direction: 'rtl' };
const header: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' };
const title: any = { fontSize: '1.8rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '15px', margin: 0 };
const searchBox: any = { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', width: '300px' };
const searchInp: any = { border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' };
const tableCard: any = { background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '10px', overflowX: 'auto' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { borderBottom: '2px solid #f1f5f9' };
const th: any = { padding: '20px 15px', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' };
const tr: any = { borderBottom: '1px solid #f1f5f9', transition: '0.2s' };
const td: any = { padding: '20px 15px', fontSize: '0.95rem' };
const codeBadge: any = { background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#475569' };
const payBtn: any = { background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.85rem' };
const disabledBtn: any = { ...payBtn, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' };
const loaderStyle: any = { textAlign: 'center', padding: '100px', color: '#27ae60', fontWeight: 'bold' };
const emptyText: any = { textAlign: 'center', padding: '40px', color: '#64748b' };