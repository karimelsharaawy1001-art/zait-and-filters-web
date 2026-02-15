'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Truck, Plus, Trash2, Edit2, Save, X, Loader2, MapPin, Search, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShippingAdmin() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [newCity, setNewCity] = useState({ city_name: '', price: '' });

  useEffect(() => {
    fetchRates();
  }, []);

  async function fetchRates() {
    setLoading(true);
    // إجبار السيرفر على عدم استخدام الكاش القديم
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .order('city_name', { ascending: true });

    if (error) toast.error('خطأ في المزامنة');
    else setRates(data || []);
    setLoading(false);
  }

  async function handleAddCity() {
    const cleanName = newCity.city_name.trim(); // تنظيف المسافات
    if (!cleanName || !newCity.price) return toast.error('بيانات ناقصة');
    
    setLoading(true);
    const { error } = await supabase.from('shipping_rates').insert([{
      city_name: cleanName,
      price: parseFloat(newCity.price)
    }]);

    if (error) {
      if (error.code === '23505') toast.error('المحافظة موجودة فعلاً.. جرب ابحث عنها');
      else toast.error('خطأ: ' + error.message);
    } else {
      toast.success('تمت الإضافة');
      setNewCity({ city_name: '', price: '' });
      await fetchRates();
    }
    setLoading(false);
  }

  async function handleUpdatePrice(id: string, newPrice: string) {
    if (!newPrice) return setEditingId(null);
    setLoading(true);
    const { error } = await supabase.from('shipping_rates').update({ price: parseFloat(newPrice) }).eq('id', id);

    if (error) toast.error('فشل التحديث');
    else {
      toast.success('تم التحديث');
      setEditingId(null);
      await fetchRates(); 
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذه المحافظة؟')) return;
    const { error } = await supabase.from('shipping_rates').delete().eq('id', id);
    if (error) toast.error('خطأ في الحذف');
    else {
      toast.success('تم الحذف');
      fetchRates();
    }
  }

  const filteredRates = useMemo(() => {
    return rates.filter(r => r.city_name.includes(searchTerm));
  }, [rates, searchTerm]);

  return (
    <div style={container}>
      <div style={headerRow}>
        <h1 style={title}><Truck size={28} color="#2ecc71" /> إدارة الشحن</h1>
        <button onClick={fetchRates} style={refreshBtn}><RefreshCcw size={18} /> تحديث القائمة</button>
      </div>

      <div style={headerGrid}>
        <div style={card}>
          <div style={label}><Plus size={14}/> إضافة جديدة</div>
          <div style={row}>
            <input placeholder="المحافظة" value={newCity.city_name} onChange={e=>setNewCity({...newCity, city_name:e.target.value})} style={inp}/>
            <input placeholder="السعر" type="number" value={newCity.price} onChange={e=>setNewCity({...newCity, price:e.target.value})} style={priceInp}/>
            <button onClick={handleAddCity} style={addBtn}>إضافة</button>
          </div>
        </div>

        <div style={card}>
          <div style={label}><Search size={14}/> بحث سريع</div>
          <input placeholder="اكتب اسم المحافظة هنا..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={searchInp}/>
        </div>
      </div>

      <div style={tableWrap}>
        <table style={table}>
          <thead><tr style={thRow}><th style={th}>المحافظة</th><th style={th}>السعر</th><th style={th}>إجراء</th></tr></thead>
          <tbody>
            {filteredRates.length > 0 ? filteredRates.map(r => (
              <tr key={r.id} style={tr}>
                <td style={td}><MapPin size={14} color="#2ecc71"/> {r.city_name}</td>
                <td style={td}>
                  {editingId === r.id ? 
                    <input autoFocus defaultValue={r.price} onBlur={(e)=>handleUpdatePrice(r.id, e.target.value)} style={editInp}/> 
                    : <span style={{color:'#2ecc71', fontWeight:'bold'}}>{r.price} ج.م</span>
                  }
                </td>
                <td style={td}>
                  <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={()=>setEditingId(r.id)} style={actBtn}><Edit2 size={14}/></button>
                    <button onClick={()=>handleDelete(r.id)} style={delBtn}><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={3} style={{textAlign:'center', padding:'30px', color:'#444'}}>لا توجد بيانات (جرب ضغط زر التحديث)</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// التنسيقات (مضبوطة تماماً مع الـ Sidebar الأسود)
const container: any = { padding: '20px', direction: 'rtl' };
const headerRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const refreshBtn: any = { background: '#111', color: '#888', border: '1px solid #222', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const title: any = { display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '1.5rem', margin: 0 };
const headerGrid: any = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' };
const card: any = { background: '#0a0a0a', padding: '15px', borderRadius: '15px', border: '1px solid #111' };
const label: any = { fontSize: '0.75rem', color: '#444', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' };
const row: any = { display: 'flex', gap: '10px' };
const inp: any = { flex: 2, background: '#000', border: '1px solid #1a1a1a', padding: '10px', color: '#fff', borderRadius: '8px' };
const priceInp: any = { flex: 1, background: '#000', border: '1px solid #1a1a1a', padding: '10px', color: '#fff', borderRadius: '8px' };
const searchInp: any = { width: '100%', background: '#000', border: '1px solid #1a1a1a', padding: '10px', color: '#fff', borderRadius: '8px' };
const addBtn: any = { background: '#2ecc71', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const tableWrap: any = { background: '#080808', borderRadius: '15px', border: '1px solid #111', overflow: 'hidden' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { background: '#0a0a0a' };
const th: any = { padding: '15px', fontSize: '0.8rem', color: '#444', borderBottom: '1px solid #111' };
const tr: any = { borderBottom: '1px solid #0a0a0a' };
const td: any = { padding: '12px 15px', color: '#ccc' };
const editInp: any = { width: '70px', background: '#000', border: '1px solid #2ecc71', color: '#fff', padding: '4px', borderRadius: '5px' };
const actBtn: any = { background: '#111', color: '#2ecc71', border: '1px solid #1a1a1a', padding: '6px', borderRadius: '6px', cursor: 'pointer' };
const delBtn: any = { background: '#111', color: '#ff4d4d', border: '1px solid #1a1a1a', padding: '6px', borderRadius: '6px', cursor: 'pointer' };