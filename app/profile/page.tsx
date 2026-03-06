'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  User, Phone, Mail, Package, LogOut, 
  Loader2, Save, Clock, CheckCircle, MapPin, Trash2, Plus,
  ChevronDown, ChevronUp, ShoppingBag, Gauge, CreditCard, Car, Settings,
  CarFront
} from 'lucide-react';
import toast from 'react-hot-toast';
import { linkGuestOrdersToUser } from '@/app/hooks/useLinkGuestOrders';

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
  const [profile, setProfile] = useState({ full_name: '', phone_number: '' });
  const [newAddr, setNewAddr] = useState({ name: '', val: '', city: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [makesOptions, setMakesOptions] = useState<any[]>([]);
  const [modelsOptions, setModelsOptions] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [newCarYear, setNewCarYear] = useState('');
  const [showCarForm, setShowCarForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'settings'>('orders');

  const router = useRouter();

  useEffect(() => { fetchProfileData(); }, []);

  async function fetchProfileData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      // ── Step 1: Link any guest orders before fetching ──────────────────
      await linkGuestOrdersToUser(user.id);
      // ──────────────────────────────────────────────────────────────────

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile({ full_name: profileData.full_name || '', phone_number: profileData.phone_number || '' });
      }

      // ── Step 2: Fetch orders by user_id OR phone (belt & suspenders) ──
      // After linking, user_id is set on all past orders.
      // We still fall back to phone match so nothing is ever missed.
      const phone = profileData?.phone_number || null;
      const authEmail = user.email || null;

      let ordersData: any[] = [];

      // Primary: fetch by user_id (covers both native + newly-linked orders)
      const { data: byUserId } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (byUserId) ordersData = byUserId;

      // Fallback: if user has a phone, catch any orders still unlinked
      if (phone) {
        const { data: byPhone } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_phone', phone)
          .is('user_id', null)  // only unlinked ones (avoid duplicates)
          .order('created_at', { ascending: false });

        if (byPhone && byPhone.length > 0) {
          // Merge & deduplicate by id
          const merged = [...ordersData, ...byPhone];
          const seen = new Set<string>();
          ordersData = merged.filter(o => {
            if (seen.has(o.id)) return false;
            seen.add(o.id);
            return true;
          });
          // Sort merged list newest first
          ordersData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }

      setOrders(ordersData);
      // ──────────────────────────────────────────────────────────────────

      const [addrRes, garageRes, productsRes] = await Promise.all([
        supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_garage').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('car_make').not('car_make', 'is', null)
      ]);
      setMyAddresses(addrRes.data || []);
      setMyCars(garageRes.data || []);
      if (productsRes.data) {
        const uniqueMakes = Array.from(new Set(productsRes.data.map((p: any) => p.car_make?.trim()).filter(Boolean)));
        setMakesOptions((uniqueMakes as string[]).sort().map(m => ({ value: m, label: m })));
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
      const { data } = await supabase.from('products').select('car_model').ilike('car_make', opt.value.trim());
      if (data) {
        const uniqueModels = Array.from(new Set(data.map((p: any) => p.car_model?.trim()).filter(Boolean)));
        setModelsOptions((uniqueModels as string[]).sort().map(m => ({ value: m, label: m })));
      }
    } else { setModelsOptions([]); }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: profile.full_name, phone_number: profile.phone_number, updated_at: new Date().toISOString() });
      if (error) throw error;

      // Re-link orders whenever phone is updated (user may have added phone for first time)
      await linkGuestOrdersToUser(user.id);
      await fetchProfileData();

      toast.success('تم تحديث البيانات الأساسية');
    } catch { toast.error('فشل التحديث'); } finally { setSaving(false); }
  }

  async function handleAddAddress() {
    if (!newAddr.name || !newAddr.val || !newAddr.city) return toast.error('يرجى ملء كافة الخانات');
    setSaving(true);
    try {
      const { error } = await supabase.from('addresses').insert({ user_id: user.id, address_name: newAddr.name, full_address: newAddr.val, city_name: newAddr.city });
      if (error) throw error;
      toast.success('تمت إضافة العنوان');
      setNewAddr({ name: '', val: '', city: '' });
      setShowAddForm(false);
      fetchProfileData();
    } catch { toast.error('فشل الإضافة'); } finally { setSaving(false); }
  }

  async function handleDeleteAddress(id: string) {
    if (!confirm('حذف العنوان؟')) return;
    try { await supabase.from('addresses').delete().eq('id', id); toast.success('تم الحذف'); fetchProfileData(); }
    catch { toast.error('فشل الحذف'); }
  }

  async function handleAddCar() {
    if (!selectedMake || !selectedModel) return toast.error('يرجى اختيار الماركة والموديل');
    setSaving(true);
    try {
      const { error } = await supabase.from('user_garage').insert({ user_id: user.id, make: selectedMake.value, model: selectedModel.value, year: newCarYear });
      if (error) throw error;
      toast.success('تمت إضافة السيارة للجراج');
      setSelectedMake(null); setSelectedModel(null); setNewCarYear(''); setShowCarForm(false);
      fetchProfileData();
    } catch { toast.error('فشل إضافة السيارة'); } finally { setSaving(false); }
  }

  async function handleDeleteCar(id: string) {
    if (!confirm('هل تريد إزالة هذه السيارة من جراجك؟')) return;
    try { await supabase.from('user_garage').delete().eq('id', id); toast.success('تمت الإزالة'); fetchProfileData(); }
    catch { toast.error('فشل الإزالة'); }
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
            <User size={30} color="#22c55e" />
          </div>
          <div>
            <h1 style={titleName}>{profile.full_name || 'الاسم غير محدد'}</h1>
            <p style={emailText}>{user?.email}</p>
          </div>
        </div>
        <div style={headerStatsRow}>
          <div style={headerStatItem}><strong style={{ fontSize: '1.3rem', color: '#1a1a1a' }}>{orders.length}</strong><span style={{ fontSize: '0.7rem', color: '#999' }}>طلبات</span></div>
          <div style={headerDivider} />
          <div style={headerStatItem}><strong style={{ fontSize: '1.3rem', color: '#1a1a1a' }}>{myCars.length}</strong><span style={{ fontSize: '0.7rem', color: '#999' }}>سيارات</span></div>
          <div style={headerDivider} />
          <div style={headerStatItem}><strong style={{ fontSize: '1.3rem', color: '#1a1a1a' }}>{myAddresses.length}</strong><span style={{ fontSize: '0.7rem', color: '#999' }}>عناوين</span></div>
        </div>
      </div>

      {/* Garage Section */}
      <div style={garageSection}>
        <div style={sectionTopRow}>
          <h3 style={compactSectionTitle}><Car size={18} /> جراجي الخاص</h3>
          <button onClick={() => setShowCarForm(!showCarForm)} style={miniAddBtn}>
            {showCarForm ? '✕' : <Plus size={16} />}
          </button>
        </div>

        {showCarForm && (
          <div style={compactAddBox}>
            <div style={mobileInputGrid}>
              <Select options={makesOptions} styles={customSelectStyles} placeholder="الماركة" isRtl={true} value={selectedMake} onChange={handleMakeChange} />
              <Select options={modelsOptions} styles={customSelectStyles} placeholder="الموديل" isRtl={true} value={selectedModel} onChange={(opt) => setSelectedModel(opt)} isDisabled={!selectedMake} />
              <input style={compactInp} placeholder="السنة (اختياري)" value={newCarYear} onChange={(e) => setNewCarYear(e.target.value)} />
            </div>
            <button onClick={handleAddCar} disabled={saving} style={compactSaveBtn}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : '+ إضافة للجراج'}
            </button>
          </div>
        )}

        <div style={garageScroll}>
          {myCars.length === 0 && !showCarForm
            ? <p style={emptyText}>لا توجد سيارات مضافة حالياً</p>
            : myCars.map(car => (
              <div key={car.id} style={carCard}>
                <div style={carIconWrap}><CarFront size={20} color="#22c55e" /></div>
                <div style={carDetails}>
                  <div style={carNameText}>{car.make} {car.model}</div>
                  <div style={carYearText}>{car.year || '—'}</div>
                </div>
                <button onClick={() => handleDeleteCar(car.id)} style={carDeleteBtn}><Trash2 size={14} /></button>
              </div>
            ))}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div style={tabBar}>
        <button onClick={() => setActiveTab('orders')} style={tabBtn(activeTab === 'orders')}>
          <ShoppingBag size={15} /> طلباتي
        </button>
        <button onClick={() => setActiveTab('addresses')} style={tabBtn(activeTab === 'addresses')}>
          <MapPin size={15} /> عناويني
        </button>
        <button onClick={() => setActiveTab('settings')} style={tabBtn(activeTab === 'settings')}>
          <Settings size={15} /> الحساب
        </button>
      </div>

      {/* Tab Content */}
      <div style={gridSplit}>
        {/* Orders */}
        <div style={{ ...orderColumn, display: activeTab === 'orders' ? 'flex' : 'none' } as any} className="tab-panel tab-orders">
          <div style={mainCard}>
            <h3 style={compactSectionTitle}><ShoppingBag size={18} /> سجل الطلبات</h3>
            {orders.length === 0
              ? <p style={emptyText}>لم تقم بأي طلبات بعد.</p>
              : (
                <div style={orderList}>
                  {orders.map((order) => (
                    <div key={order.id} style={orderMiniCard(expandedOrder === order.id)}>
                      <div style={miniOrderHeader} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                        <div style={orderMeta}>
                          <span style={statusBadge(order.status)}>{order.status === 'pending' ? 'قيد المراجعة' : order.status === 'pending_payment' ? 'في انتظار الدفع' : 'تم الشحن'}</span>
                          <span style={dateText}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div style={priceText}>{order.total_price} ج.م</div>
                      </div>
                      {expandedOrder === order.id && (
                        <div style={orderBody}>
                          {order.items?.map((item: any, i: number) => (
                            <div key={i} style={miniItemRow}>
                              <img src={item.image || item.image_url || '/api/placeholder/40/40'} alt="" style={miniItemImg} />
                              <div style={{ flex: 1 }}>
                                <div style={miniItemName}>{item.name} <span style={{ color: '#22c55e' }}>×{item.quantity}</span></div>
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

        {/* Addresses + Settings */}
        <div style={infoColumn}>
          {/* Settings */}
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }} className="tab-panel tab-settings">
            <div style={mainCard}>
              <h3 style={compactSectionTitle}><Settings size={18} /> إعدادات الحساب</h3>
              <form onSubmit={handleUpdateProfile} style={compactForm}>
                <label style={inputLabel}>الاسم بالكامل</label>
                <input style={compactInp} value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="الاسم بالكامل" />
                <label style={inputLabel}>رقم الموبايل</label>
                <input style={compactInp} value={profile.phone_number} onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} placeholder="رقم الموبايل" />
                <button disabled={saving} type="submit" style={saveActionBtn}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'حفظ التعديلات'}
                </button>
              </form>
            </div>
          </div>

          {/* Addresses */}
          <div style={{ display: activeTab === 'addresses' ? 'block' : 'none' }} className="tab-panel tab-addresses">
            <div style={mainCard}>
              <div style={sectionTopRow}>
                <h3 style={compactSectionTitle}><MapPin size={18} /> عناويني المحفوظة</h3>
                <button onClick={() => setShowAddForm(!showAddForm)} style={miniAddBtn}>
                  {showAddForm ? '✕' : <Plus size={16} />}
                </button>
              </div>
              {showAddForm && (
                <div style={compactAddBox}>
                  <input style={compactInp} placeholder="اسم العنوان (منزل، عمل...)" value={newAddr.name} onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })} />
                  <div style={{ height: '10px' }} />
                  <input style={compactInp} placeholder="المحافظة" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} />
                  <div style={{ height: '10px' }} />
                  <textarea style={compactArea} placeholder="العنوان بالتفصيل" value={newAddr.val} onChange={(e) => setNewAddr({ ...newAddr, val: e.target.value })} />
                  <div style={{ height: '10px' }} />
                  <button onClick={handleAddAddress} style={compactSaveBtn}>+ إضافة العنوان</button>
                </div>
              )}
              <div style={addressList}>
                {myAddresses.length === 0
                  ? <p style={emptyText}>لا توجد عناوين محفوظة</p>
                  : myAddresses.map(addr => (
                    <div key={addr.id} style={addressCard}>
                      <div style={addrIconWrap}><MapPin size={16} color="#22c55e" /></div>
                      <div style={{ flex: 1 }}>
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
      </div>

      {/* Logout */}
      <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} style={elegantLogout}>
        <LogOut size={16} /> تسجيل الخروج
      </button>

      <style>{`
        @media (max-width: 767px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .tab-orders, .tab-settings, .tab-addresses { width: 100% !important; }
          .profile-info-col { width: 100% !important; }
        }
        @media (min-width: 768px) {
          .tab-panel { display: block !important; }
          .tab-orders { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

// --- Style Objects ---
const container: any = { padding: '20px 16px 40px', maxWidth: '1100px', margin: '0 auto', direction: 'rtl', minHeight: '100vh', backgroundColor: '#f6f8fa' };
const headerCard: any = { background: 'linear-gradient(135deg, #fff 60%, #f0fdf4)', borderRadius: '24px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', border: '1px solid #e8f5e9', boxShadow: '0 4px 24px rgba(34,197,94,0.07)' };
const profileInfoWrap: any = { display: 'flex', alignItems: 'center', gap: '14px' };
const avatarWrap: any = { width: '60px', height: '60px', borderRadius: '18px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #bbf7d0', flexShrink: 0 };
const titleName: any = { fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '3px' };
const emailText: any = { fontSize: '0.78rem', color: '#999', wordBreak: 'break-all' };
const headerStatsRow: any = { display: 'flex', gap: '14px', alignItems: 'center', flexShrink: 0 };
const headerStatItem: any = { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' };
const headerDivider: any = { width: '1px', height: '28px', background: '#e5e7eb' };
const garageSection: any = { background: '#fff', borderRadius: '24px', padding: '18px', marginBottom: '20px', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' };
const garageScroll: any = { display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0 8px', scrollbarWidth: 'none' };
const carCard: any = { flex: '0 0 175px', background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' };
const carIconWrap: any = { width: '38px', height: '38px', borderRadius: '12px', background: '#fff', border: '1px solid #e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const carDetails: any = { flex: 1, overflow: 'hidden' };
const carNameText: any = { fontSize: '0.82rem', fontWeight: '800', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const carYearText: any = { fontSize: '0.72rem', color: '#bbb', marginTop: '2px' };
const carDeleteBtn: any = { position: 'absolute', top: '8px', left: '8px', color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' };
const tabBar: any = { display: 'flex', gap: '8px', marginBottom: '16px', background: '#fff', borderRadius: '16px', padding: '6px', border: '1px solid #f0f0f0' };
const tabBtn = (active: boolean): any => ({ flex: 1, padding: '10px 6px', borderRadius: '12px', border: 'none', background: active ? '#f0fdf4' : 'transparent', color: active ? '#16a34a' : '#999', fontWeight: active ? '900' : '600', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: '0.2s' });
const gridSplit: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '20px' };
const mainCard: any = { background: '#fff', borderRadius: '24px', padding: '18px', marginBottom: '20px', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.02)', width: '100%', boxSizing: 'border-box' as const };
const compactSectionTitle: any = { fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' };
const sectionTopRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' };
const miniOrderHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 15px', cursor: 'pointer' };
const orderMiniCard = (expanded: boolean): any => ({ background: '#fff', border: expanded ? '1.5px solid #22c55e' : '1px solid #f0f0f0', borderRadius: '16px', marginBottom: '10px', overflow: 'hidden', transition: '0.2s' });
const statusBadge = (s: string): any => ({ fontSize: '0.65rem', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', background: s === 'pending' ? '#fff7ed' : s === 'pending_payment' ? '#eff6ff' : '#f0fdf4', color: s === 'pending' ? '#c2410c' : s === 'pending_payment' ? '#1d4ed8' : '#166534' });
const orderList: any = { display: 'flex', flexDirection: 'column' };
const orderMeta: any = { display: 'flex', gap: '8px', alignItems: 'center' };
const dateText: any = { fontSize: '0.72rem', color: '#ccc' };
const priceText: any = { fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a' };
const orderBody: any = { padding: '12px 15px', background: '#fafafa', borderTop: '1px solid #f5f5f5' };
const miniItemRow: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' };
const miniItemImg: any = { width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover' as const, flexShrink: 0 };
const miniItemName: any = { fontSize: '0.8rem', fontWeight: '700', color: '#333' };
const miniItemPrice: any = { fontSize: '0.8rem', fontWeight: '800', color: '#1a1a1a', whiteSpace: 'nowrap' };
const compactForm: any = { display: 'flex', flexDirection: 'column', gap: '10px' };
const inputLabel: any = { fontSize: '0.78rem', fontWeight: '700', color: '#888', marginBottom: '-4px' };
const compactInp: any = { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #f0f0f0', background: '#fdfdfd', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const };
const compactArea: any = { ...compactInp, height: '70px', resize: 'none' as const };
const saveActionBtn: any = { padding: '12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', marginTop: '4px', width: '100%' };
const miniAddBtn: any = { width: '32px', height: '32px', borderRadius: '10px', background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '900' };
const compactAddBox: any = { background: '#f9fafb', padding: '14px', borderRadius: '16px', marginBottom: '14px', border: '1px dashed #86efac' };
const mobileInputGrid: any = { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' };
const compactSaveBtn: any = { width: '100%', padding: '11px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' };
const addressList: any = { display: 'flex', flexDirection: 'column', gap: '10px' };
const addressCard: any = { padding: '12px', border: '1px solid #f0f0f0', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fafafa' };
const addrIconWrap: any = { width: '34px', height: '34px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const addrName: any = { fontSize: '0.85rem', fontWeight: '900', color: '#1a1a1a' };
const addrFull: any = { fontSize: '0.73rem', color: '#aaa', marginTop: '2px' };
const addrDelBtn: any = { color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 };
const elegantLogout: any = { width: '100%', padding: '14px', background: 'none', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '900', fontSize: '0.9rem', cursor: 'pointer', marginTop: '8px' };
const centerStyle: any = { display: 'flex', justifyContent: 'center', padding: '100px' };
const emptyText: any = { textAlign: 'center', color: '#d1d5db', fontSize: '0.85rem', padding: '20px 0' };
const infoColumn: any = { display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 };
const orderColumn: any = { display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 };