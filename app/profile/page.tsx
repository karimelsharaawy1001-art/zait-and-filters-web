'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  User, Phone, Mail, Package, LogOut, 
  Loader2, Save, Clock, CheckCircle, MapPin, Trash2, Plus,
  ChevronDown, ChevronUp, ShoppingBag, Gauge, CreditCard, Car, Settings,
  CarFront, Wallet, Truck, ExternalLink, LinkIcon, Copy, Check,
  Undo2, RotateCcw, X, AlertCircle, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';


const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div style={{ height: '48px', backgroundColor: '#f8f8f8', borderRadius: '10px', padding: '0 15px', display: 'flex', alignItems: 'center', color: '#999' }}>جاري التحميل...</div>
});

// ── Egypt Post tracking ───────────────────────────────────────────────────────
const EGYPT_POST_TRACKING_URL = 'https://egyptpost.gov.eg/ar-EG//Home/EServices/Track-And-Trace';
function buildTrackingUrl(trackingNumber: string): string {
  return `${EGYPT_POST_TRACKING_URL}?barcode=${encodeURIComponent(trackingNumber.trim())}`;
}

// ── Payment status config ─────────────────────────────────────────────────────
const paymentStatusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: 'في انتظار الدفع', bg: '#fff7ed', color: '#c2410c' },
  paid:     { label: 'تم الدفع ✓',      bg: '#f0fdf4', color: '#15803d' },
  failed:   { label: 'فشل الدفع',       bg: '#fef2f2', color: '#dc2626' },
  refunded: { label: 'تم الاسترجاع',    bg: '#f5f3ff', color: '#6d28d9' },
};

// ── Shipping status config ────────────────────────────────────────────────────
const shippingStatusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: 'قيد المراجعة',   bg: '#fff7ed', color: '#c2410c' },
  processing: { label: 'جاري التجهيز',  bg: '#fef9c3', color: '#a16207' },
  shipped:    { label: 'تم الشحن 🚚',   bg: '#eff6ff', color: '#1d4ed8' },
  delivered:  { label: 'تم التسليم ✓',  bg: '#f0fdf4', color: '#166534' },
  pending_payment: { label: 'في انتظار الدفع', bg: '#eff6ff', color: '#1d4ed8' },
};

// ── Customer Tracking Banner ──────────────────────────────────────────────────
function CustomerTrackingBanner({ order }: { order: { tracking_number?: string | null; status?: string } }) {
  const [copied, setCopied] = useState(false);

  if (!order?.tracking_number) return null;
  const trackingUrl = buildTrackingUrl(order.tracking_number);

  function handleCopy() {
    navigator.clipboard.writeText(order.tracking_number!).then(() => {
      setCopied(true);
      toast.success('تم نسخ رقم التتبع');
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '1.5px solid #86efac',
      borderRadius: '14px',
      padding: '16px',
      marginTop: '12px',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', background: '#22c55e', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Truck size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: '900', fontSize: '0.9rem', color: '#15803d' }}>
            تم تسليم شحنتك الى شركة وصلها التابعة للبريد المصري
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '3px' }}>
            و يمكنك الآن متابعتها
          </div>
        </div>
      </div>

      {/* Tracking number + copy + CTA */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '12px 14px',
        border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#888', marginBottom: '3px', letterSpacing: '0.5px' }}>
            رقم تتبع الشحنة
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              fontWeight: '900', fontSize: '0.95rem', color: '#1a1a1a',
              fontFamily: 'monospace', letterSpacing: '1.5px',
            }}>
              {order.tracking_number}
            </div>
            {/* Copy button */}
            <button
              onClick={handleCopy}
              title="نسخ رقم التتبع"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px',
                background: copied ? '#f0fdf4' : '#f8faff',
                border: copied ? '1px solid #86efac' : '1px solid #dbeafe',
                borderRadius: '7px', cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {copied
                ? <Check size={13} color="#16a34a" />
                : <Copy size={13} color="#3b82f6" />
              }
            </button>
          </div>
        </div>
        <a
          href={trackingUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            color: '#fff', textDecoration: 'none', borderRadius: '10px',
            padding: '10px 16px', fontWeight: '800', fontSize: '0.82rem',
            boxShadow: '0 4px 12px rgba(34,197,94,0.3)', whiteSpace: 'nowrap',
          }}>
          <ExternalLink size={14} />
          تتبع شحنتي
        </a>
      </div>

      {/* Footer note */}
      <div style={{ fontSize: '0.7rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <CheckCircle size={12} color="#22c55e" />
        سيتم توصيل طلبك خلال 3–7 أيام عمل من تاريخ الشحن
      </div>
    </div>
  );
}

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
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [returnModalOrder, setReturnModalOrder] = useState<any>(null);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => { fetchProfileData(); }, []);

  async function fetchProfileData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile({ full_name: profileData.full_name || '', phone_number: profileData.phone_number || '' });
      }

      // ── Fetch orders: try user_id first, then fall back to phone ──────────
      const { data: byUserId } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      let ordersData: any[] = byUserId || [];

      const phone = profileData?.phone_number?.trim();
      if (phone) {
        const { data: byPhone } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_phone', phone)
          .order('created_at', { ascending: false });

        if (byPhone && byPhone.length > 0) {
          const merged = [...ordersData, ...byPhone];
          const seen = new Set<string>();
          ordersData = merged.filter(o => {
            if (seen.has(o.id)) return false;
            seen.add(o.id);
            return true;
          });
          ordersData.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      }

      setOrders(ordersData);

      // Fetch existing return requests
      let returnsQuery = supabase
        .from('return_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (phone) {
        returnsQuery = returnsQuery.or(`user_id.eq.${user.id},customer_phone.eq.${phone}`);
      } else {
        returnsQuery = returnsQuery.eq('user_id', user.id);
      }
      const { data: returnsData } = await returnsQuery;
      setReturnRequests(returnsData || []);

      const [addrRes, garageRes, productsRes, walletRes] = await Promise.all([
        supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_garage').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('car_make').not('car_make', 'is', null),
        supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
      ]);

      setMyAddresses(addrRes.data || []);
      setMyCars(garageRes.data || []);
      setWalletBalance(walletRes.data?.balance ?? 0);

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

  // ── Return Request Modal (inner component) ──
  function ReturnRequestModal({ order, onClose, onSubmitted }: { order: any; onClose: () => void; onSubmitted: () => void }) {
    const [selectedItems, setSelectedItems] = useState<any[]>(() =>
      (order.items || []).map((item: any) => ({
        ...item,
        selected: false,
        returnQuantity: Math.min(1, item.quantity || 1),
      }))
    );
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const hasSelection = selectedItems.some((i: any) => i.selected);
    const totalReturnItems = selectedItems
      .filter((i: any) => i.selected)
      .reduce((sum: number, i: any) => sum + i.returnQuantity, 0);

    function toggleItem(index: number) {
      setSelectedItems((prev: any[]) =>
        prev.map((item, i) =>
          i === index ? { ...item, selected: !item.selected, returnQuantity: item.selected ? item.returnQuantity : 1 } : item
        )
      );
    }

    function setQty(index: number, qty: number) {
      const item = selectedItems[index];
      const maxQty = item.quantity || 1;
      setSelectedItems((prev: any[]) =>
        prev.map((item, i) =>
          i === index ? { ...item, returnQuantity: Math.max(1, Math.min(qty, maxQty)) } : item
        )
      );
    }

    async function handleSubmit() {
      if (!hasSelection) { toast.error('اختر منتجاً على الأقل لاسترجاعه'); return; }
      if (!reason.trim()) { toast.error('اكتب سبب الاسترجاع'); return; }
      setSubmitting(true);
      try {
        const returnData = {
          order_id: order.id,
          user_id: user?.id || null,
          customer_name: order.customer_name || profile.full_name,
          customer_phone: order.customer_phone || profile.phone_number,
          items: selectedItems
            .filter((i: any) => i.selected)
            .map((i: any) => ({
              product_id: i.id,
              name: i.name,
              price: i.price,
              quantity: i.returnQuantity,
              image: i.image || i.image_url,
            })),
          reason: reason.trim(),
          status: 'pending',
        };
        const { error } = await supabase.from('return_requests').insert(returnData);
        if (error) throw error;
        toast.success('تم إرسال طلب الاسترجاع بنجاح ✅ سنتواصل معك قريباً');
        onSubmitted();
        onClose();
      } catch (err: any) {
        toast.error('فشل إرسال الطلب: ' + err.message);
      } finally { setSubmitting(false); }
    }

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px', backdropFilter: 'blur(4px)',
      }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '560px',
          maxHeight: '90vh', overflowY: 'auto', padding: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)', direction: 'rtl',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={20} color="#22c55e" /> طلب استرجاع
            </h3>
            <button onClick={onClose} style={{
              background: '#f5f5f5', border: 'none', borderRadius: '50%',
              width: '34px', height: '34px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={18} color="#666" />
            </button>
          </div>

          {/* Order Info */}
          <div style={{
            background: '#f9fafb', borderRadius: '14px', padding: '14px 16px',
            marginBottom: '16px', border: '1px solid #f0f0f0',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#888', marginBottom: '4px' }}>
              طلب رقم #{order.id?.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#555' }}>
              {new Date(order.created_at).toLocaleDateString('ar-EG')} — {order.total_price} ج.م
            </div>
          </div>

          {/* Items Selection */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '10px' }}>
              اختر المنتجات المراد استرجاعها:
            </div>
            {selectedItems.map((item: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', marginBottom: '8px',
                borderRadius: '12px', border: item.selected ? '1.5px solid #22c55e' : '1px solid #f0f0f0',
                background: item.selected ? '#f0fdf4' : '#fff',
                cursor: 'pointer', transition: 'all 0.15s',
              }} onClick={() => toggleItem(i)}>
                <div style={{ flexShrink: 0 }}>
                  {item.selected ? <CheckSquare size={22} color="#22c55e" /> : <Square size={22} color="#d1d5db" />}
                </div>
                <img
                  src={item.image || item.image_url || '/placeholder.png'}
                  alt=""
                  style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'contain', background: '#f5f5f5', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>
                    {parseFloat(item.price).toLocaleString()} ج.م × {item.quantity}
                  </div>
                </div>
                {item.selected && (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => setQty(i, item.returnQuantity - 1)}
                      disabled={item.returnQuantity <= 1}
                      style={{
                        width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #d1d5db',
                        background: '#fff', fontWeight: '900', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', opacity: item.returnQuantity <= 1 ? 0.4 : 1,
                      }}
                    >−</button>
                    <span style={{ fontWeight: '900', fontSize: '0.9rem', minWidth: '24px', textAlign: 'center' }}>
                      {item.returnQuantity}
                    </span>
                    <button
                      onClick={() => setQty(i, item.returnQuantity + 1)}
                      disabled={item.returnQuantity >= item.quantity}
                      style={{
                        width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #22c55e',
                        background: '#22c55e', color: '#fff', fontWeight: '900', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', opacity: item.returnQuantity >= item.quantity ? 0.4 : 1,
                      }}
                    >+</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>
              سبب الاسترجاع <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="اكتب سبب طلب الاسترجاع..."
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px',
                border: '1px solid #e5e5e5', fontSize: '0.9rem',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !hasSelection || !reason.trim()}
            style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: '14px',
              background: (submitting || !hasSelection || !reason.trim()) ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', fontWeight: '900', fontSize: '0.95rem',
              cursor: (submitting || !hasSelection || !reason.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}>
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> جاري الإرسال...</>
            ) : (
              <><RotateCcw size={18} /> إرسال طلب الاسترجاع</>
            )}
          </button>

          {totalReturnItems > 0 && (
            <div style={{
              marginTop: '12px', textAlign: 'center', fontSize: '0.78rem',
              color: '#888', fontWeight: '700',
            }}>
              سيتم استرجاع <strong style={{ color: '#22c55e' }}>{totalReturnItems}</strong> قطعة
            </div>
          )}
        </div>
      </div>
    );
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

      {/* ── Wallet Balance Card ── */}
      {walletBalance > 0 && (
        <div style={walletCard}>
          <div style={walletIconWrap}>
            <Wallet size={22} color="#16a34a" />
          </div>
          <div style={walletInfo}>
            <span style={walletLabel}>رصيد المحفظة (كاش باك)</span>
            <span style={walletAmount}>{walletBalance.toFixed(2)} ج.م</span>
          </div>
          <div style={walletBadge}>متاح للاستخدام</div>
        </div>
      )}

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
                  {orders.map((order) => {
                    const ps = order.payment_status || 'pending';
                    const ss = order.status || 'pending';
                    const payConf = paymentStatusConfig[ps] || paymentStatusConfig.pending;
                    const shipConf = shippingStatusConfig[ss] || shippingStatusConfig.pending;
                    const isExpanded = expandedOrder === order.id;
                    const hasTracking = !!order.tracking_number;

                    return (
                      <div key={order.id} style={orderMiniCard(isExpanded, hasTracking)}>
                        {/* ── Order Header ── */}
                        <div style={miniOrderHeader} onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Row 1: shipping status + date */}
                            <div style={orderMeta}>
                              <span style={statusBadge(shipConf.bg, shipConf.color)}>{shipConf.label}</span>
                              <span style={dateText}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                            </div>
                            {/* Row 2: payment status badge */}
                            <span style={statusBadge(payConf.bg, payConf.color)}>
                              <CreditCard size={10} style={{ display: 'inline', marginLeft: '3px', verticalAlign: 'middle' }} />
                              {payConf.label}
                            </span>
                            {/* Row 3: tracking pill (collapsed state teaser) */}
                            {hasTracking && !isExpanded && (
                              <div style={trackingPill}>
                                <Truck size={11} color="#15803d" />
                                <span>متاح رقم التتبع — اضغط لعرضه</span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                            <div style={priceText}>{order.total_price} ج.م</div>
                            <ChevronDown
                              size={16}
                              color="#aaa"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                            />
                          </div>
                        </div>

                        {/* ── Order Body (expanded) ── */}
                        {isExpanded && (
                          <div style={orderBody}>
                            {/* Payment method */}
                            {order.payment_method && (
                              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <CreditCard size={12} color="#aaa" />
                                طريقة الدفع: <strong style={{ color: '#555' }}>{paymentMethodLabel(order.payment_method)}</strong>
                              </div>
                            )}

                            {/* Product items */}
                            {order.items?.map((item: any, i: number) => (
                              <div key={i} style={miniItemRow}>
                                <img src={item.image || item.image_url || '/api/placeholder/40/40'} alt="" style={miniItemImg} />
                                <div style={{ flex: 1 }}>
                                  <div style={miniItemName}>{item.name} <span style={{ color: '#22c55e' }}>×{item.quantity}</span></div>
                                </div>
                                <div style={miniItemPrice}>{parseFloat(item.price) * item.quantity} ج.م</div>
                              </div>
                            ))}

                            {/* ── Return Request Button (only for delivered orders) ── */}
                            {order.status === 'delivered' && (
                              <div style={{ marginTop: '12px' }}>
                                <button
                                  onClick={() => setReturnModalOrder(order)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#fff', border: 'none', borderRadius: '10px',
                                    padding: '9px 16px', fontWeight: '800', fontSize: '0.8rem',
                                    cursor: 'pointer', width: '100%', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <Undo2 size={15} />
                                  طلب استرجاع
                                </button>
                              </div>
                            )}

                            {/* ── Tracking Banner ── */}
                            <CustomerTrackingBanner order={order} />
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {/* ── Return Request Modal ── */}
      {returnModalOrder && (
        <ReturnRequestModal
          order={returnModalOrder}
          onClose={() => setReturnModalOrder(null)}
          onSubmitted={() => { fetchProfileData(); }}
        />
      )}

      {/* ── Return Requests Status Cards ── */}
      {returnRequests.length > 0 && activeTab === 'orders' && (
        <div style={{ marginTop: '16px' }}>
          <h3 style={compactSectionTitle}><RotateCcw size={16} color="#f59e0b" /> طلبات الاسترجاع</h3>
          {returnRequests.map((req: any) => {
            const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
              pending:  { label: 'قيد المراجعة', color: '#c2410c', bg: '#fff7ed' },
              approved: { label: 'تمت الموافقة', color: '#15803d', bg: '#f0fdf4' },
              rejected: { label: 'مرفوض', color: '#dc2626', bg: '#fef2f2' },
              refunded: { label: 'تم الاسترجاع', color: '#6d28d9', bg: '#f5f3ff' },
            };
            const sc = statusConfig[req.status] || statusConfig.pending;
            return (
              <div key={req.id} style={{
                background: '#fff', borderRadius: '14px', padding: '14px 16px',
                marginBottom: '8px', border: '1px solid #f0f0f0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1a1a1a' }}>
                    طلب رقم #{req.id?.slice(0, 8).toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', background: sc.bg, color: sc.color }}>
                    {sc.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
                  السبب: {req.reason}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#aaa' }}>
                  {new Date(req.created_at).toLocaleDateString('ar-EG')} — {req.items?.length || 0} منتج
                </div>
                {req.admin_notes && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.75rem', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    📝 ملاحظة الإدارة: {req.admin_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

// ── Helper ────────────────────────────────────────────────────────────────────
function paymentMethodLabel(method: string) {
  const map: Record<string, string> = {
    cash: 'كاش عند الاستلام',
    vodafone_cash: 'فودافون كاش',
    instapay: 'انستاباي',
    bank_transfer: 'تحويل بنكي',
    card_installments: 'بطاقة / تقسيط',
    wallets: 'محفظة إلكترونية',
  };
  return map[method] || method;
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

// ── Wallet Card styles ──
const walletCard: any = { background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '20px', padding: '16px 18px', marginBottom: '20px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(34,197,94,0.1)' };
const walletIconWrap: any = { width: '46px', height: '46px', borderRadius: '14px', background: '#fff', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(34,197,94,0.12)' };
const walletInfo: any = { flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' };
const walletLabel: any = { fontSize: '0.75rem', color: '#16a34a', fontWeight: '700' };
const walletAmount: any = { fontSize: '1.4rem', fontWeight: '900', color: '#14532d', letterSpacing: '-0.5px' };
const walletBadge: any = { fontSize: '0.65rem', fontWeight: '900', padding: '5px 10px', borderRadius: '10px', background: '#22c55e', color: '#fff', whiteSpace: 'nowrap' as const };

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

// ── Order card: green border when has tracking, stronger green when expanded ──
const orderMiniCard = (expanded: boolean, hasTracking: boolean): any => ({
  background: '#fff',
  border: expanded
    ? '1.5px solid #22c55e'
    : hasTracking
      ? '1.5px solid #86efac'
      : '1px solid #f0f0f0',
  borderRadius: '16px',
  marginBottom: '10px',
  overflow: 'hidden',
  transition: 'border-color 0.2s',
});

// ── Tracking pill shown in collapsed state ────────────────────────────────────
const trackingPill: any = {
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
  borderRadius: '8px', padding: '3px 9px', fontSize: '0.65rem', fontWeight: '800',
};

const statusBadge = (bg: string, color: string): any => ({ fontSize: '0.65rem', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', background: bg, color, display: 'inline-flex', alignItems: 'center' });
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