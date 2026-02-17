'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  User, Phone, Mail, Package, LogOut, 
  Loader2, Save, Clock, CheckCircle, MapPin, Trash2, Plus,
  ChevronDown, ChevronUp, ShoppingBag, Gauge, CreditCard, Car, Settings,
  CarFront // FIXED: Added missing import
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamic import for Select to avoid SSR issues
const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div style={{ height: '48px', backgroundColor: '#f8f8f8', borderRadius: '10px', padding: '0 15px', display: 'flex', alignItems: 'center', color: '#999' }}>جاري التحميل...</div>
});

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]); 
  const [myAddresses, setMyAddresses] = useState<any[]>([]);
  const [myCars, setMyCars] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null); 
  const [profile, setProfile] = useState({
    full_name: '',
    phone_number: '',
  });

  const [newAddr, setNewAddr] = useState({ name: '', val: '', city: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const [makesOptions, setMakesOptions] = useState<any[]>([]);
  const [modelsOptions, setModelsOptions] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [newCarYear, setNewCarYear] = useState('');
  const [showCarForm, setShowCarForm] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile({ 
          full_name: profileData.full_name || '', 
          phone_number: profileData.phone_number || ''
        });

        if (profileData.phone_number) {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_phone', profileData.phone_number)
            .order('created_at', { ascending: false });
          setOrders(ordersData || []);
        }
      }

      const [addrRes, garageRes, productsRes] = await Promise.all([
        supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_garage').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('car_make').not('car_make', 'is', null)
      ]);
      
      setMyAddresses(addrRes.data || []);
      setMyCars(garageRes.data || []);

      if (productsRes.data) {
        const uniqueMakes = Array.from(new Set(productsRes.data.map(p => p.car_make?.trim()).filter(Boolean)));
        setMakesOptions(uniqueMakes.sort().map(m => ({ value: m, label: m })));
      }

    } catch (error) {
      toast.error('خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function handleMakeChange(opt: any) {
    setSelectedMake(opt);
    setSelectedModel(null);
    if (opt) {
      const { data } = await supabase
        .from('products')
        .select('car_model')
        .ilike('car_make', opt.value.trim());
      if (data) {
        const uniqueModels = Array.from(new Set(data.map(p => p.car_model?.trim()).filter(Boolean)));
        setModelsOptions(uniqueModels.sort().map(m => ({ value: m, label: m })));
      }
    } else {
      setModelsOptions([]);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      toast.success('تم تحديث البيانات الأساسية');
    } catch (error) {
      toast.error('فشل التحديث');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAddress() {
    if (!newAddr.name || !newAddr.val || !newAddr.city) return toast.error('يرجى ملء كافة الخانات');
    setSaving(true);
    try {
      const { error } = await supabase.from('addresses').insert({
        user_id: user.id,
        address_name: newAddr.name,
        full_address: newAddr.val,
        city_name: newAddr.city
      });
      if (error) throw error;
      toast.success('تمت إضافة العنوان');
      setNewAddr({ name: '', val: '', city: '' });
      setShowAddForm(false);
      fetchProfileData();
    } catch (error) {
      toast.error('فشل الإضافة');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!confirm('حذف العنوان؟')) return;
    try {
      await supabase.from('addresses').delete().eq('id', id);
      toast.success('تم الحذف');
      fetchProfileData();
    } catch (error) {
      toast.error('فشل الحذف');
    }
  }

  async function handleAddCar() {
    if (!selectedMake || !selectedModel) return toast.error('يرجى اختيار الماركة والموديل');
    setSaving(true);
    try {
      const { error } = await supabase.from('user_garage').insert({
        user_id: user.id,
        make: selectedMake.value,
        model: selectedModel.value,
        year: newCarYear
      });
      if (error) throw error;
      toast.success('تمت إضافة السيارة للجراج');
      setSelectedMake(null);
      setSelectedModel(null);
      setNewCarYear('');
      setShowCarForm(false);
      fetchProfileData();
    } catch (error) {
      toast.error('فشل إضافة السيارة');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCar(id: string) {
    if (!confirm('هل تريد إزالة هذه السيارة من جراجك؟')) return;
    try {
      await supabase.from('user_garage').delete().eq('id', id);
      toast.success('تمت الإزالة');
      fetchProfileData();
    } catch (error) {
      toast.error('فشل الإزالة');
    }
  }

  const customSelectStyles = {
    control: (base: any) => ({ ...base, height: '48px', borderRadius: '12px', border: '1px solid #f0f0f0', background: '#fdfdfd', textAlign: 'right', display: 'flex', flexDirection: 'row-reverse' }),
    option: (base: any, state: any) => ({ ...base, padding: '10px 15px', backgroundColor: state.isFocused ? '#eefcf5' : '#fff', color: '#1a1a1a', cursor: 'pointer', textAlign: 'right' }),
    valueContainer: (base: any) => ({ ...base, display: 'flex', flexDirection: 'row-reverse' }),
    singleValue: (base: any) => ({ ...base, display: 'flex', flexDirection: 'row-reverse' })
  };

  if (loading) return <div style={centerStyle}><Loader2 className="animate-spin" size={40} color="#22c55e" /></div>;

  return (
    <div style={container}>
      {/* Premium Header */}
      <div style={headerCard}>
        <div style={profileInfoWrap}>
          <div style={avatarWrap}>
            <User size={35} color="#22c55e" />
          </div>
          <div>
            <h1 style={titleName}>{profile.full_name || 'الاسم غير محدد'}</h1>
            <p style={emailText}>{user?.email}</p>
          </div>
        </div>
        <div style={headerStatsRow}>
           <div style={headerStatItem}><strong>{orders.length}</strong> <span>طلبات</span></div>
           <div style={headerDivider} />
           <div style={headerStatItem}><strong>{myCars.length}</strong> <span>جراجي</span></div>
        </div>
      </div>

      {/* Horizontal Garage Bar */}
      <div style={garageSection}>
        <div style={sectionTopRow}>
          <h3 style={compactSectionTitle}><Car size={18} /> جراجي الخاص</h3>
          <button onClick={() => setShowCarForm(!showCarForm)} style={miniAddBtn}>
            {showCarForm ? 'إلغاء' : <Plus size={16} />}
          </button>
        </div>

        {showCarForm && (
          <div style={compactAddBox}>
            <div style={compactInputGrid}>
              <Select options={makesOptions} styles={customSelectStyles} placeholder="الماركة" isRtl={true} value={selectedMake} onChange={handleMakeChange} />
              <Select options={modelsOptions} styles={customSelectStyles} placeholder="الموديل" isRtl={true} value={selectedModel} onChange={(opt) => setSelectedModel(opt)} isDisabled={!selectedMake} />
              <input style={compactInp} placeholder="السنة" value={newCarYear} onChange={(e)=>setNewCarYear(e.target.value)} />
            </div>
            <button onClick={handleAddCar} disabled={saving} style={compactSaveBtn}>
               {saving ? <Loader2 size={16} className="animate-spin"/> : 'إضافة للجراج'}
            </button>
          </div>
        )}

        <div style={garageScroll}>
          {myCars.map(car => (
            <div key={car.id} style={carCard}>
              <div style={carIconWrap}><CarFront size={20} color="#22c55e" /></div>
              <div style={carDetails}>
                <div style={carNameText}>{car.make} {car.model}</div>
                <div style={carYearText}>{car.year || 'عام'}</div>
              </div>
              <button onClick={() => handleDeleteCar(car.id)} style={carDeleteBtn}><Trash2 size={14} /></button>
            </div>
          ))}
          {myCars.length === 0 && !showCarForm && <p style={emptyText}>لا توجد سيارات مضافة حالياً</p>}
        </div>
      </div>

      <div style={gridSplit}>
        {/* Left Side: Orders */}
        <div style={orderColumn}>
          <div style={mainCard}>
            <h3 style={compactSectionTitle}><ShoppingBag size={18} /> سجل الطلبات</h3>
            {orders.length === 0 ? <p style={emptyText}>لم تقم بأي طلبات بعد.</p> : (
              <div style={orderList}>
                {orders.map((order) => (
                  <div key={order.id} style={orderMiniCard(expandedOrder === order.id)}>
                    <div style={miniOrderHeader} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                      <div style={orderMeta}>
                        <span style={statusBadge(order.status)}>{order.status === 'pending' ? 'قيد المراجعة' : 'تم الشحن'}</span>
                        <span style={dateText}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div style={priceText}>{order.total_price} ج.م</div>
                    </div>
                    {expandedOrder === order.id && (
                      <div style={orderBody}>
                        {order.items?.map((item: any, i: number) => (
                          <div key={i} style={miniItemRow}>
                            <img src={item.image || item.image_url || '/api/placeholder/40/40'} alt="" style={miniItemImg} />
                            <div style={{flex:1}}>
                              <div style={miniItemName}>{item.name} <span style={{color:'#22c55e'}}>×{item.quantity}</span></div>
                            </div>
                            <div style={miniItemPrice}>{parseFloat(item.price) * item.quantity} ج.م</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Info & Addresses */}
        <div style={infoColumn}>
          <div style={mainCard}>
            <h3 style={compactSectionTitle}><Settings size={18} /> الحساب</h3>
            <form onSubmit={handleUpdateProfile} style={compactForm}>
              <input style={compactInp} value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} placeholder="الاسم بالكامل" />
              <input style={compactInp} value={profile.phone_number} onChange={(e) => setProfile({...profile, phone_number: e.target.value})} placeholder="رقم الموبايل" />
              <button disabled={saving} type="submit" style={saveActionBtn}>
                {saving ? <Loader2 size={16} className="animate-spin"/> : 'حفظ التعديلات'}
              </button>
            </form>
          </div>

          <div style={mainCard}>
            <div style={sectionTopRow}>
              <h3 style={compactSectionTitle}><MapPin size={18} /> العناوين</h3>
              <button onClick={() => setShowAddForm(!showAddForm)} style={miniAddBtn}><Plus size={16} /></button>
            </div>
            {showAddForm && (
              <div style={compactAddBox}>
                <input style={compactInp} placeholder="اسم العنوان (منزل...)" value={newAddr.name} onChange={(e)=>setNewAddr({...newAddr, name: e.target.value})} />
                <input style={compactInp} placeholder="المحافظة" value={newAddr.city} onChange={(e)=>setNewAddr({...newAddr, city: e.target.value})} />
                <textarea style={compactArea} placeholder="العنوان بالتفصيل" value={newAddr.val} onChange={(e)=>setNewAddr({...newAddr, val: e.target.value})} />
                <button onClick={handleAddAddress} style={compactSaveBtn}>إضافة العنوان</button>
              </div>
            )}
            <div style={addressList}>
              {myAddresses.map(addr => (
                <div key={addr.id} style={addressCard}>
                  <div style={{flex:1}}>
                    <div style={addrName}>{addr.address_name}</div>
                    <div style={addrFull}>{addr.city_name}، {addr.full_address}</div>
                  </div>
                  <button onClick={() => handleDeleteAddress(addr.id)} style={addrDelBtn}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} style={elegantLogout}>
        <LogOut size={16} /> تسجيل الخروج
      </button>
    </div>
  );
}

// --- Style Objects ---
const container: any = { padding: '30px 15px', maxWidth: '1100px', margin: '0 auto', direction: 'rtl', minHeight: '100vh', backgroundColor: '#fafafa' };
const headerCard: any = { background: '#fff', borderRadius: '24px', padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' };
const profileInfoWrap: any = { display: 'flex', alignItems: 'center', gap: '20px' };
const avatarWrap: any = { width: '70px', height: '70px', borderRadius: '20px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eefcf5' };
const titleName: any = { fontSize: '1.4rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '4px' };
const emailText: any = { fontSize: '0.85rem', color: '#888' };
const headerStatsRow: any = { display: 'flex', gap: '20px', alignItems: 'center' };
const headerStatItem: any = { textAlign: 'center', display: 'flex', flexDirection: 'column' };
const headerDivider: any = { width: '1px', height: '30px', background: '#eee' };
const garageSection: any = { background: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '25px', border: '1px solid #f0f0f0' };
const garageScroll: any = { display: 'flex', gap: '15px', overflowX: 'auto', padding: '5px 0', scrollbarWidth: 'none' };
const carCard: any = { flex: '0 0 200px', background: '#fdfdfd', border: '1px solid #f0f0f0', borderRadius: '18px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' };
const carIconWrap: any = { width: '40px', height: '40px', borderRadius: '12px', background: '#fff', border: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const carNameText: any = { fontSize: '0.9rem', fontWeight: '800', color: '#333' };
const carYearText: any = { fontSize: '0.75rem', color: '#aaa' };
const carDeleteBtn: any = { position: 'absolute', top: '10px', left: '10px', color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer' };
const gridSplit: any = { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px' };
const mainCard: any = { background: '#fff', borderRadius: '24px', padding: '20px', marginBottom: '25px', border: '1px solid #f0f0f0' };
const compactSectionTitle: any = { fontSize: '1rem', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' };
const sectionTopRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
const miniOrderHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', cursor: 'pointer' };
const orderMiniCard = (expanded: boolean) => ({ background: '#fff', border: expanded ? '1px solid #22c55e' : '1px solid #f5f5f5', borderRadius: '18px', marginBottom: '10px', overflow: 'hidden' });
const statusBadge = (s: string) => ({ fontSize: '0.65rem', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', background: s === 'pending' ? '#fff7ed' : '#f0fdf4', color: s === 'pending' ? '#c2410c' : '#166534' });
const carDetails: any = { flex: 1 };
const orderList: any = { display: 'flex', flexDirection: 'column' };
const orderMeta: any = { display: 'flex', gap: '10px', alignItems: 'center' };
const dateText: any = { fontSize: '0.75rem', color: '#bbb' };
const priceText: any = { fontSize: '1rem', fontWeight: '900' };
const orderBody: any = { padding: '15px', background: '#fafafa', borderTop: '1px solid #f5f5f5' };
const miniItemRow: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' };
const miniItemImg: any = { width: '35px', height: '35px', borderRadius: '8px', objectFit: 'cover' };
const miniItemName: any = { fontSize: '0.8rem', fontWeight: '700' };
const miniItemPrice: any = { fontSize: '0.8rem', fontWeight: '800' };
const compactForm: any = { display: 'flex', flexDirection: 'column', gap: '12px' };
const compactInp: any = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #f0f0f0', background: '#fdfdfd', fontSize: '0.9rem', outline: 'none' };
const compactArea: any = { ...compactInp, height: '60px', resize: 'none' };
const saveActionBtn: any = { padding: '12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' };
const miniAddBtn: any = { width: '30px', height: '30px', borderRadius: '10px', background: '#f0fdf4', color: '#22c55e', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const compactAddBox: any = { background: '#f9f9f9', padding: '15px', borderRadius: '18px', marginBottom: '15px', border: '1px dashed #22c55e' };
const compactInputGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr 0.5fr', gap: '10px', marginBottom: '10px' };
const compactSaveBtn: any = { width: '100%', padding: '10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' };
const addressList: any = { display: 'flex', flexDirection: 'column', gap: '10px' };
const addressCard: any = { padding: '12px', border: '1px solid #f5f5f5', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const addrName: any = { fontSize: '0.85rem', fontWeight: '900' };
const addrFull: any = { fontSize: '0.75rem', color: '#888' };
const addrDelBtn: any = { color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer' };
const elegantLogout: any = { width: '100%', padding: '15px', background: 'none', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '900', fontSize: '0.9rem', cursor: 'pointer', transition: '0.2s' };
const centerStyle: any = { display: 'flex', justifyContent: 'center', padding: '100px' };
const emptyText: any = { textAlign: 'center', color: '#ccc', fontSize: '0.85rem', padding: '20px 0' };
const infoColumn: any = { display: 'flex', flexDirection: 'column' };
const orderColumn: any = { display: 'flex', flexDirection: 'column' };