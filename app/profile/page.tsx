'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  User, Phone, Mail, Package, LogOut, 
  Loader2, Save, Clock, CheckCircle, Smartphone, Banknote, ImageIcon, MapPin, Trash2, Plus,
  ChevronDown, ChevronUp, ShoppingBag, Factory, CarFront, Gauge, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]); 
  const [myAddresses, setMyAddresses] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null); 
  const [profile, setProfile] = useState({
    full_name: '',
    phone_number: '',
  });

  const [newAddr, setNewAddr] = useState({ name: '', val: '', city: '' });
  const [showAddForm, setShowAddForm] = useState(false);

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

      const { data: addrData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setMyAddresses(addrData || []);

    } catch (error) {
      toast.error('خطأ في جلب البيانات');
    } finally {
      setLoading(false);
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

  if (loading) return <div style={centerStyle}><Loader2 className="animate-spin" size={40} color="#22c55e" /></div>;

  return (
    <div style={container}>
      {/* هيدر الصفحة الاحترافي */}
      <div style={profileHeader}>
        <div style={avatarGradient}>
          <div style={avatarInternal}><User size={40} color="#22c55e" /></div>
        </div>
        <h1 style={userName}>{profile.full_name || 'عميلنا المميز'}</h1>
        <p style={userEmail}><Mail size={12} style={{marginLeft: '5px'}} /> {user?.email}</p>
        <div style={statsRow}>
          <div style={statBox}><strong>{orders.length}</strong> <span>طلبات</span></div>
          <div style={statBox}><strong>{myAddresses.length}</strong> <span>عناوين</span></div>
        </div>
      </div>

      <div style={gridContent}>
        {/* العمود الأيمن: البيانات والعناوين */}
        <div style={rightSide}>
          <div style={sectionCard}>
            <h3 style={sectionTitle}><SettingsIcon size={18} /> البيانات الشخصية</h3>
            <form onSubmit={handleUpdateProfile} style={form}>
              <div style={inputGroup}>
                <label style={lab}>الاسم بالكامل</label>
                <input style={inp} value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
              </div>
              <div style={inputGroup}>
                <label style={lab}>رقم الموبايل</label>
                <input style={inp} value={profile.phone_number} onChange={(e) => setProfile({...profile, phone_number: e.target.value})} />
              </div>
              <button disabled={saving} type="submit" style={saveBtn}>
                {saving ? <Loader2 size={18} className="animate-spin"/> : <><Save size={16} /> حفظ التغييرات</>}
              </button>
            </form>
          </div>

          <div style={sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ ...sectionTitle, marginBottom: 0 }}><MapPin size={18} /> العناوين</h3>
              <button onClick={() => setShowAddForm(!showAddForm)} style={addToggleBtn}>
                {showAddForm ? 'إلغاء' : <><Plus size={14} /> جديد</>}
              </button>
            </div>

            {showAddForm && (
              <div style={addFormBox}>
                <input style={inp} placeholder="اسم العنوان (بيت، شغل)" value={newAddr.name} onChange={(e)=>setNewAddr({...newAddr, name: e.target.value})} />
                <input style={inp} placeholder="المحافظة" value={newAddr.city} onChange={(e)=>setNewAddr({...newAddr, city: e.target.value})} />
                <textarea style={{...inp, height:'60px'}} placeholder="العنوان بالتفصيل" value={newAddr.val} onChange={(e)=>setNewAddr({...newAddr, val: e.target.value})} />
                <button onClick={handleAddAddress} style={saveBtnGreen}>إضافة</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myAddresses.map(addr => (
                <div key={addr.id} style={addressItem}>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight:'900', fontSize:'0.9rem', color: '#1a1a1a'}}>{addr.address_name}</div>
                    <div style={{fontSize:'0.8rem', color:'#666', marginTop: '2px'}}>{addr.city_name}، {addr.full_address}</div>
                  </div>
                  <button onClick={() => handleDeleteAddress(addr.id)} style={delIconBtn}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* العمود الأيسر: سجل الطلبات */}
        <div style={leftSide}>
          <div style={sectionCard}>
            <h3 style={sectionTitle}><ShoppingBag size={18} /> سجل الطلبات</h3>
            {orders.length === 0 ? <p style={noOrders}>لا توجد طلبات سابقة.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map((order) => (
                  <div key={order.id} style={orderDetailedCard(expandedOrder === order.id)}>
                    <div 
                      style={orderSummaryRow} 
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div>
                        <div style={statusBadge(order.status)}>
                          {order.status === 'pending' ? <Clock size={10}/> : <CheckCircle size={10}/>}
                          {order.status === 'pending' ? 'قيد المراجعة' : 'تم الشحن'}
                        </div>
                        <div style={orderDateLabel}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={orderPriceLabel}>{order.total_price} ج.م</div>
                        <div style={{fontSize: '0.7rem', color: '#999'}}>{order.items?.length} منتجات</div>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div style={expandedDetails}>
                        <div style={productList}>
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} style={productItemRow}>
                              <div style={productImgBox}>
                                <img src={item.image || item.image_url || '/placeholder.png'} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={productNameStyle}>{item.name} <span style={{color: '#22c55e'}}>×{item.quantity}</span></div>
                                <div style={productMetaStyle}>
                                  <span>{item.brand}</span> • <span>{item.car_model}</span>
                                </div>
                              </div>
                              <div style={productPriceStyle}>{(parseFloat(item.price) * item.quantity).toFixed(0)} ج.م</div>
                            </div>
                          ))}
                        </div>

                        <div style={orderFooterBox}>
                          {order.car_mileage && (
                            <div style={footerRow}><Gauge size={14} color="#22c55e" /> <strong>العداد:</strong> {order.car_mileage} كم</div>
                          )}
                          <div style={footerRow}><MapPin size={14} color="#22c55e" /> {order.city}، {order.customer_address}</div>
                          <div style={footerRow}><CreditCard size={14} color="#22c55e" /> {order.payment_method === 'instapay' ? 'انستا باي' : 'كاش'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} style={logoutBtn}>
        <LogOut size={18} /> تسجيل الخروج من الحساب
      </button>
    </div>
  );
}

// أيقونة الإعدادات بسيطة
const SettingsIcon = ({size}:any) => <User size={size} />;

// --- نظام التنسيقات (Design System) ---
const container: any = { padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', direction: 'rtl', minHeight: '100vh' };

// هيدر الصفحة
const profileHeader: any = { textAlign: 'center', marginBottom: '40px', background: '#fff', padding: '40px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' };
const avatarGradient: any = { width: '100px', height: '100px', borderRadius: '35px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', margin: '0 auto 20px', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const avatarInternal: any = { width: '100%', height: '100%', background: '#fff', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const userName: any = { fontSize: '1.8rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '8px' };
const userEmail: any = { color: '#888', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statsRow: any = { display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #f5f5f5' };
const statBox: any = { display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' };

// تقسيم الصفحة
const gridContent: any = { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '25px' };
const rightSide: any = { display: 'flex', flexDirection: 'column', gap: '25px' };
const leftSide: any = { display: 'flex', flexDirection: 'column' };

// الكروت والأقسام
const sectionCard: any = { background: '#fff', padding: '25px', borderRadius: '25px', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' };
const sectionTitle: any = { marginBottom: '25px', fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', color: '#1a1a1a' };
const form: any = { display: 'flex', flexDirection: 'column', gap: '18px' };
const inputGroup: any = { display: 'flex', flexDirection: 'column', gap: '8px' };
const inp: any = { padding: '14px', borderRadius: '14px', border: '1px solid #eee', background: '#fcfcfc', outline: 'none', fontSize: '0.95rem', transition: '0.3s' };
const lab: any = { fontSize: '0.8rem', fontWeight: 'bold', color: '#555', marginRight: '5px' };
const saveBtn: any = { padding: '14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
const saveBtnGreen: any = { padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' };

// العناوين
const addToggleBtn: any = { background: '#f0fdf4', color: '#22c55e', border: 'none', padding: '8px 15px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };
const addFormBox: any = { background: '#f9f9f9', padding: '15px', borderRadius: '18px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px dashed #22c55e' };
const addressItem: any = { padding: '15px', background: '#fcfcfc', borderRadius: '15px', border: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const delIconBtn: any = { background: '#fff1f1', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '10px' };

// سجل الطلبات
const orderDetailedCard = (expanded:boolean):any => ({ background: expanded ? '#fff' : '#fcfcfc', border: expanded ? '1px solid #22c55e' : '1px solid #f0f0f0', borderRadius: '20px', overflow: 'hidden', transition: '0.3s' });
const orderSummaryRow: any = { padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const orderDateLabel: any = { fontSize: '0.75rem', color: '#999', marginTop: '4px' };
const orderPriceLabel: any = { fontWeight: '900', fontSize: '1.05rem', color: '#1a1a1a' };
const statusBadge = (s:string):any => ({ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.65rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '8px', background: s==='pending'?'#fff7ed':'#f0fdf4', color: s==='pending'?'#c2410c':'#166534', width: 'fit-content' });

const expandedDetails: any = { padding: '0 20px 20px', borderTop: '1px solid #f5f5f5', background: '#fff' };
const productList: any = { display: 'flex', flexDirection: 'column' };
const productItemRow: any = { display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f9f9f9' };
const productImgBox: any = { width: '50px', height: '50px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f0f0f0', flexShrink: 0 };
const productNameStyle: any = { fontSize: '0.85rem', fontWeight: 'bold', color: '#333' };
const productMetaStyle: any = { fontSize: '0.7rem', color: '#aaa', marginTop: '2px' };
const productPriceStyle: any = { fontSize: '0.85rem', fontWeight: '900', color: '#1a1a1a' };

const orderFooterBox: any = { marginTop: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '10px' };
const footerRow: any = { fontSize: '0.75rem', color: '#555', display: 'flex', alignItems: 'center', gap: '10px' };
const proofLink: any = { color: '#22c55e', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginRight: 'auto' };

const logoutBtn: any = { width: '100%', marginTop: '30px', padding: '18px', background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', transition: '0.3s' };
const centerStyle: any = { display: 'flex', justifyContent: 'center', padding: '100px' };
const noOrders: any = { color: '#999', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' };