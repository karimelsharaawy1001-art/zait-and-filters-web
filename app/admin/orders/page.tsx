'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Phone, MapPin, ShoppingCart, Trash2, CreditCard, Banknote,
  Image as ImageIcon, ExternalLink, Eye, X, User, Hash,
  CarFront, Factory, Smartphone, Plus, Edit2, Save, Tag,
  Truck, AlertCircle, RefreshCw, Search, FileText, Download, Printer,
  ChevronDown, Package, CheckCircle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Dropdown (used by NewOrderModal) ────────────────────────────────────────
function Dropdown({ label, options, value, onChange, disabled }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => !disabled && setOpen(!open)} style={{
        width: '100%', height: '46px', padding: '0 14px', backgroundColor: disabled ? '#f5f5f5' : '#fff',
        border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.88rem',
        color: value ? '#1a1a1a' : '#999', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' as any,
      }}>
        <span>{value || `اختر ${label}`}</span>
        <ChevronDown size={15} color="#999" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>
      {open && options.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 3000, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
          <div onClick={() => { onChange(''); setOpen(false); }} style={ddItem}><span style={{ color: '#999' }}>— بدون تحديد —</span></div>
          {options.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              style={{ ...ddItem, backgroundColor: value === opt ? '#f0fdf4' : '#fff', fontWeight: value === opt ? '800' : '600', color: value === opt ? '#16a34a' : '#1a1a1a' }}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New Order Modal ──────────────────────────────────────────────────────────
function NewOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [makesOptions, setMakesOptions] = useState<string[]>([]);
  const [modelsOptions, setModelsOptions] = useState<string[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<string[]>([]);
  const [subcategoriesOptions, setSubcategoriesOptions] = useState<string[]>([]);

  const [filterMake, setFilterMake] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');

  const [orderItems, setOrderItems] = useState<any[]>([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [discountVal, setDiscountVal] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOptions();
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerResults(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { setFilterModel(''); setModelsOptions([]); if (filterMake) loadModels(filterMake); }, [filterMake]);
  useEffect(() => { setFilterSubcategory(''); setSubcategoriesOptions([]); if (filterCategory) loadSubcats(filterCategory); }, [filterCategory]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (productSearch.trim().length >= 1 || filterMake || filterCategory) doSearch();
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, filterMake, filterModel, filterYear, filterCategory, filterSubcategory]);

  async function loadOptions() {
    const { data } = await supabase.from('products').select('car_make, category').not('car_make', 'is', null);
    if (data) {
      setMakesOptions(Array.from(new Set(data.map((p: any) => p.car_make?.trim()).filter(Boolean))).sort() as string[]);
      setCategoriesOptions(Array.from(new Set(data.map((p: any) => p.category?.trim()).filter(Boolean))).sort() as string[]);
    }
  }
  async function loadModels(make: string) {
    const { data } = await supabase.from('products').select('car_model').ilike('car_make', make);
    if (data) setModelsOptions(Array.from(new Set(data.map((p: any) => p.car_model?.trim()).filter(Boolean))).sort() as string[]);
  }
  async function loadSubcats(cat: string) {
    const { data } = await supabase.from('products').select('subcategory').ilike('category', cat);
    if (data) setSubcategoriesOptions(Array.from(new Set(data.map((p: any) => p.subcategory?.trim()).filter(Boolean))).sort() as string[]);
  }
  async function doSearch() {
    setSearching(true);
    try {
      let q = supabase.from('products').select('*').limit(20);
      if (productSearch.trim()) q = q.ilike('name', `%${productSearch.trim()}%`);
      if (filterMake) q = q.ilike('car_make', filterMake);
      if (filterModel) q = q.ilike('car_model', filterModel);
      if (filterCategory) q = q.ilike('category', filterCategory);
      if (filterSubcategory) q = q.ilike('subcategory', filterSubcategory);
      if (filterYear) q = q.or(`car_model_year.ilike.%${filterYear}%,car_model_year.is.null`);
      const { data } = await q;
      setSearchResults(data || []);
      setShowResults(true);
    } finally { setSearching(false); }
  }
  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.trim().length < 2) { setCustomerResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, full_name, phone_number')
      .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%`).limit(8);
    setCustomerResults(data || []);
    setShowCustomerResults(true);
  }
  function addProduct(p: any) {
    const price = p.sale_price > 0 ? p.sale_price : p.regular_price;
    setOrderItems(prev => {
      const exists = prev.find(i => i.id === p.id);
      if (exists) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price, quantity: 1, image_url: p.image_url, brand: p.brand, car_make: p.car_make, car_model: p.car_model }];
    });
    setShowResults(false);
    setProductSearch('');
    toast.success(`تمت إضافة "${p.name}"`);
  }

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + shippingCost - discountVal;

  async function submitOrder() {
    if (orderItems.length === 0) { toast.error('أضف منتجاً على الأقل'); return; }
    const customerName = selectedUser?.full_name || manualName;
    const customerPhone = selectedUser?.phone_number || manualPhone;
    if (!customerName || !customerPhone) { toast.error('أدخل اسم العميل ورقم هاتفه'); return; }
    if (!manualAddress) { toast.error('أدخل عنوان التوصيل'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('orders').insert({
        user_id: selectedUser?.id || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: manualAddress,
        city: manualCity,
        items: orderItems.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url, brand: i.brand, car_make: i.car_make, car_model: i.car_model })),
        total_price: total,
        shipping_cost: shippingCost,
        discount_applied: discountVal,
        payment_method: paymentMethod,
        status: 'processing',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('تم إنشاء الطلب بنجاح ✅');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally { setSubmitting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#f8f9fa', width: '100%', maxWidth: '1060px', maxHeight: '93vh', overflowY: 'auto', borderRadius: '24px', padding: '28px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', direction: 'rtl' }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid #e8e8e8', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={22} color="#22c55e" /> إنشاء طلب جديد يدوياً
          </h2>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={19} color="#666" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '18px', alignItems: 'flex-start' }}>

          {/* ── LEFT ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Product Search Card */}
            <div style={nomCard}>
              <h3 style={nomTitle}><Search size={16} color="#22c55e" /> البحث عن منتجات</h3>
              {/* Filter grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <Dropdown label="الماركة" options={makesOptions} value={filterMake} onChange={setFilterMake} />
                <Dropdown label="الموديل" options={modelsOptions} value={filterModel} onChange={setFilterModel} disabled={!filterMake} />
                <input type="text" placeholder="سنة الصنع" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={nomInput} />
                <Dropdown label="الفئة" options={categoriesOptions} value={filterCategory} onChange={setFilterCategory} />
                <Dropdown label="القسم الفرعي" options={subcategoriesOptions} value={filterSubcategory} onChange={setFilterSubcategory} disabled={!filterCategory} />
                <button onClick={() => { setFilterMake(''); setFilterModel(''); setFilterYear(''); setFilterCategory(''); setFilterSubcategory(''); }}
                  style={{ height: '46px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <X size={13} /> مسح الفلاتر
                </button>
              </div>
              {/* Search input */}
              <div ref={searchRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#aaa" style={{ position: 'absolute', right: '13px', top: '15px', pointerEvents: 'none' }} />
                  {searching && <Loader2 size={14} color="#22c55e" style={{ position: 'absolute', left: '13px', top: '16px', animation: 'spin 1s linear infinite' }} />}
                  <input type="text" placeholder="ابحث باسم المنتج..." value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowResults(true); }}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    style={{ ...nomInput, paddingRight: '40px', paddingLeft: searching ? '36px' : '14px', fontSize: '0.95rem' }} />
                </div>
                {showResults && searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2500, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '340px', overflowY: 'auto', marginTop: '6px' }}>
                    {searchResults.map((p: any) => (
                      <div key={p.id} onClick={() => addProduct(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
                        <img src={p.image_url || '/placeholder.png'} alt="" style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '8px', background: '#f9f9f9', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#888', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#22c55e', fontWeight: '700' }}>{p.brand}</span>
                            {p.car_make && <span>{p.car_make} {p.car_model}</span>}
                            {p.category && <span>{p.category}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <div style={{ fontWeight: '900', fontSize: '0.92rem', color: '#1a1a1a' }}>{(p.sale_price > 0 ? p.sale_price : p.regular_price).toLocaleString()} ج.م</div>
                          {p.sale_price > 0 && <div style={{ fontSize: '0.7rem', color: '#bbb', textDecoration: 'line-through' }}>{p.regular_price?.toLocaleString()}</div>}
                        </div>
                        <div style={{ backgroundColor: '#22c55e', color: '#fff', borderRadius: '8px', padding: '5px 10px', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0 }}>+ إضافة</div>
                      </div>
                    ))}
                  </div>
                )}
                {showResults && searchResults.length === 0 && productSearch.length >= 1 && !searching && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2500, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', textAlign: 'center', marginTop: '6px', color: '#888', fontSize: '0.86rem' }}>لا توجد نتائج</div>
                )}
              </div>
            </div>

            {/* Order Items */}
            {orderItems.length > 0 && (
              <div style={nomCard}>
                <h3 style={nomTitle}><ShoppingCart size={16} color="#22c55e" /> منتجات الطلب ({orderItems.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orderItems.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                      <img src={item.image_url || '/placeholder.png'} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px', background: '#fff', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', fontSize: '0.85rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.73rem', color: '#22c55e', fontWeight: '700' }}>{item.brand}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => setOrderItems(p => p.map(i => i.id === item.id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i))} style={nomQtyBtn}>-</button>
                        <span style={{ fontWeight: '900', minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                        <button onClick={() => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} style={nomQtyBtn}>+</button>
                      </div>
                      <div style={{ fontWeight: '900', minWidth: '80px', textAlign: 'left', fontSize: '0.88rem', color: '#15803d' }}>{(item.price * item.quantity).toLocaleString()} ج.م</div>
                      <button onClick={() => setOrderItems(p => p.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Info */}
            <div style={nomCard}>
              <h3 style={nomTitle}><User size={16} color="#22c55e" /> بيانات العميل</h3>
              {/* Customer search */}
              <div ref={customerRef} style={{ position: 'relative', marginBottom: '14px' }}>
                <label style={nomLabel}>ابحث عن عميل موجود (بالاسم أو رقم الهاتف)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#aaa" style={{ position: 'absolute', right: '12px', top: '15px', pointerEvents: 'none' }} />
                  <input type="text" placeholder="اكتب اسم العميل أو رقم هاتفه..."
                    value={selectedUser ? `${selectedUser.full_name} — ${selectedUser.phone_number}` : customerSearch}
                    onChange={e => { setSelectedUser(null); searchCustomers(e.target.value); }}
                    style={{ ...nomInput, paddingRight: '38px' }} />
                  {selectedUser && <button onClick={() => { setSelectedUser(null); setCustomerSearch(''); }} style={{ position: 'absolute', left: '10px', top: '13px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={15} color="#aaa" /></button>}
                </div>
                {showCustomerResults && customerResults.length > 0 && !selectedUser && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2500, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '4px' }}>
                    {customerResults.map((u: any) => (
                      <div key={u.id}
                        onClick={() => { setSelectedUser(u); setManualName(u.full_name); setManualPhone(u.phone_number); setShowCustomerResults(false); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={15} color="#16a34a" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>{u.phone_number}</div>
                        </div>
                        <CheckCircle size={15} color="#22c55e" style={{ marginRight: 'auto' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedUser && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color="#16a34a" />
                  <span style={{ fontWeight: '700', color: '#15803d', fontSize: '0.85rem' }}>تم اختيار: {selectedUser.full_name} ({selectedUser.phone_number})</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={nomLabel}>اسم العميل *</label><input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="الاسم الكامل" style={nomInput} /></div>
                <div><label style={nomLabel}>رقم الهاتف *</label><input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="01xxxxxxxxx" style={nomInput} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={nomLabel}>العنوان *</label><input value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="العنوان بالتفصيل" style={nomInput} /></div>
                <div><label style={nomLabel}>المدينة</label><input value={manualCity} onChange={e => setManualCity(e.target.value)} placeholder="مثال: القاهرة" style={nomInput} /></div>
                <div>
                  <label style={nomLabel}>طريقة الدفع</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ ...nomInput, appearance: 'none' as any }}>
                    <option value="cash">كاش عند الاستلام</option>
                    <option value="vodafone_cash">فودافون كاش</option>
                    <option value="instapay">انستاباي</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="card_installments">بطاقة / تقسيط</option>
                    <option value="wallets">محفظة إلكترونية</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={nomLabel}>ملاحظات</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي تعليمات خاصة بالطلب..." rows={2} style={{ ...nomInput, resize: 'vertical' as any, height: 'auto', paddingTop: '10px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Summary ── */}
          <div style={{ position: 'sticky', top: '10px' }}>
            <div style={{ ...nomCard, border: '2px solid #e8e8e8' }}>
              <h3 style={nomTitle}><Tag size={16} color="#22c55e" /> ملخص الطلب</h3>
              {orderItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#ccc' }}>
                  <ShoppingCart size={44} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.85rem' }}>لم تُضف منتجات بعد</p>
                </div>
              ) : (
                <>
                  {orderItems.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                      <span style={{ color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name} ×{item.quantity}</span>
                      <span style={{ fontWeight: '800', flexShrink: 0, marginRight: '8px' }}>{(item.price * item.quantity).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '10px', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
                      <span>المجموع الفرعي</span><span>{subtotal.toLocaleString()} ج.م</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <label style={{ color: '#666' }}>شحن (ج.م)</label>
                      <input type="number" min={0} value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))}
                        style={{ width: '80px', height: '32px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <label style={{ color: '#666' }}>خصم (ج.م)</label>
                      <input type="number" min={0} value={discountVal} onChange={e => setDiscountVal(Number(e.target.value))}
                        style={{ width: '80px', height: '32px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', outline: 'none' }} />
                    </div>
                    <div style={{ borderTop: '2px solid #22c55e', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '900', fontSize: '0.95rem' }}>الإجمالي</span>
                      <span style={{ fontWeight: '900', fontSize: '1.25rem', color: '#22c55e' }}>{Math.max(0, total).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </>
              )}
              <button onClick={submitOrder} disabled={submitting || orderItems.length === 0}
                style={{ width: '100%', marginTop: '16px', padding: '13px', backgroundColor: orderItems.length === 0 ? '#ccc' : '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '0.95rem', cursor: orderItems.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={18} />}
                {submitting ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
              </button>
              <p style={{ fontSize: '0.7rem', color: '#aaa', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>سيتم إنشاء الطلب بحالة "قيد المعالجة"</p>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
    </div>
  );
}

// ── NewOrderModal styles
const nomCard: any = { backgroundColor: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' };
const nomTitle: any = { fontSize: '0.98rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '14px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '7px' };
const nomInput: any = { width: '100%', height: '46px', padding: '0 14px', backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.88rem', color: '#1a1a1a', boxSizing: 'border-box' as any };
const nomLabel: any = { display: 'block', marginBottom: '5px', fontSize: '0.76rem', fontWeight: '700', color: '#555' };
const nomQtyBtn: any = { width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #e5e5e5', backgroundColor: '#f5f5f5', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' };
const ddItem: any = { padding: '9px 14px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #f9f9f9', transition: '0.1s' };


// ─── Main AdminOrders Component ───────────────────────────────────────────────
export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // ── NEW: show/hide new order modal
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [editedAddress, setEditedAddress] = useState('');
  const [editedCity, setEditedCity] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedPaymentMethod, setEditedPaymentMethod] = useState('');
  const [editedShipping, setEditedShipping] = useState(0);
  const [discount, setDiscount] = useState<{ type: 'amount' | 'percent'; value: number }>({ type: 'amount', value: 0 });
  const [extraFee, setExtraFee] = useState<{ amount: number; reason: string }>({ amount: 0, reason: '' });
  const [removeShipping, setRemoveShipping] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);

  const [showAddItem, setShowAddItem] = useState(false);
  const [partBrands, setPartBrands] = useState<any[]>([]);
  const [carMakes, setCarMakes] = useState<string[]>([]);
  const [carModels, setCarModels] = useState<string[]>([]);
  const [carYears, setCarYears] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [addItemFilter, setAddItemFilter] = useState({ brand: '', car_make: '', car_model: '', car_year: '' });
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const paymentLabels: any = {
    'card_installments': 'بطاقة / تقسيط',
    'instapay': 'انستا باي',
    'wallets': 'محفظة إلكترونية',
    'cash': 'كاش عند الاستلام',
    'vodafone_cash': 'فودافون كاش',
    'bank_transfer': 'تحويل بنكي',
  };

  function formatDateTime(isoString: string) {
    const date = new Date(isoString);
    const datePart = date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timePart = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { datePart, timePart };
  }

  async function fetchOrders() {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setOrders(data);
    } catch (err: any) {
      toast.error('خطأ في جلب الطلبات: ' + err.message);
    } finally { setLoading(false); }
  }

  async function fetchPartBrands() {
    setLoadingBrands(true);
    try {
      const { data, error } = await supabase.from('part_brands').select('*').order('name');
      if (error) { toast.error('فشل تحميل ماركات القطع: ' + error.message); return; }
      setPartBrands(data || []);
    } finally { setLoadingBrands(false); }
  }

  async function fetchCarMakes() {
    const { data } = await supabase.from('products').select('car_make').not('car_make', 'is', null).neq('car_make', '');
    if (data) { const unique = [...new Set(data.map((d: any) => d.car_make).filter(Boolean))].sort(); setCarMakes(unique); }
  }

  async function fetchCarModels(make: string) {
    setCarModels([]); setCarYears([]);
    if (!make) return;
    const { data } = await supabase.from('products').select('car_model').eq('car_make', make).not('car_model', 'is', null).neq('car_model', '');
    if (data) { const unique = [...new Set(data.map((d: any) => d.car_model).filter(Boolean))].sort(); setCarModels(unique); }
  }

  async function fetchCarYears(make: string, model: string) {
    setCarYears([]);
    if (!make || !model) return;
    const { data } = await supabase.from('products').select('car_year').eq('car_make', make).eq('car_model', model).not('car_year', 'is', null).neq('car_year', '');
    if (data) { const unique = [...new Set(data.map((d: any) => d.car_year).filter(Boolean))].sort(); setCarYears(unique); }
  }

  async function fetchFilteredProducts() {
    setLoadingProducts(true); setFilteredProducts([]);
    try {
      let query = supabase.from('products').select('*');
      if (productSearchQuery.trim()) { query = query.ilike('name', `%${productSearchQuery.trim()}%`); }
      else {
        if (addItemFilter.brand) query = query.eq('brand', addItemFilter.brand);
        if (addItemFilter.car_make) query = query.eq('car_make', addItemFilter.car_make);
        if (addItemFilter.car_model) query = query.eq('car_model', addItemFilter.car_model);
        if (addItemFilter.car_year) query = query.eq('car_year', addItemFilter.car_year);
      }
      const { data, error } = await query.limit(50);
      if (error) { toast.error('فشل البحث: ' + error.message); return; }
      setFilteredProducts(data || []);
      if (!data || data.length === 0) toast('لا توجد منتجات بهذه الفلاتر', { icon: '🔍' });
    } finally { setLoadingProducts(false); }
  }

  async function fetchCustomerAddresses(phone: string) {
    const { data } = await supabase.from('addresses').select('*').eq('phone', phone);
    if (data) setCustomerAddresses(data);
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const res = await fetch('/api/admin/update-order-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });
      const result = await res.json();
      if (!res.ok || result.error) { toast.error('فشل التحديث: ' + (result.error || 'خطأ غير معروف')); return; }
      toast.success(newStatus === 'delivered' ? 'تم تحديث حالة الطلب — سيتم إصدار العمولة بعد 14 يوم! ✅' : 'تم تحديث حالة الطلب ✅');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
    } catch (err: any) { toast.error('فشل التحديث: ' + err.message); }
  }

  async function handleDelete(orderId: string) {
    try {
      const { error, count } = await supabase.from('orders').delete({ count: 'exact' }).eq('id', orderId);
      if (error) throw error;
      if (count === 0) { toast.error('لم يتم الحذف — تحقق من صلاحيات RLS في Supabase'); return; }
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      setDeleteConfirmId(null);
      toast.success('تم حذف الطلب ✅');
    } catch (err: any) { toast.error('فشل الحذف: ' + err.message); }
  }

  async function saveOrderEdits() {
    try {
      const newTotal = calcTotal(editedItems, discount, extraFee, removeShipping, editedShipping);
      const discAmount = discount.type === 'amount' ? discount.value : (editedItems.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0) * discount.value / 100);
      const updatePayload: any = { items: editedItems, customer_address: editedAddress, city: editedCity, customer_name: editedName, customer_phone: editedPhone, payment_method: editedPaymentMethod, shipping_cost: editedShipping, total_price: newTotal.toFixed(2), discount_amount: discAmount, extra_fee: extraFee.amount, extra_fee_reason: extraFee.reason, shipping_removed: removeShipping };
      const { error } = await supabase.from('orders').update(updatePayload).eq('id', selectedOrder.id);
      if (error) throw error;
      const updated = { ...selectedOrder, ...updatePayload };
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setEditMode(false);
      toast.success('تم حفظ التعديلات ✅');
    } catch (err: any) { toast.error('فشل الحفظ: ' + err.message); }
  }

  async function handleDownloadInvoice(order: any) {
    setIsDownloadingPdf(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
      const element = invoiceRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight; let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight); heightLeft -= pageHeight;
      while (heightLeft > 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight); heightLeft -= pageHeight; }
      pdf.save(`ORDER-${order.id.slice(0, 8).toUpperCase()}.pdf`);
      toast.success('تم تحميل الـ ORDER بنجاح ✅');
    } catch (err) { toast.error('حدث خطأ في تحميل الـ PDF'); }
    finally { setIsDownloadingPdf(false); }
  }

  function handlePrintInvoice() {
    const printContents = invoiceRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>ORDER</title><style>body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}</style></head><body>${printContents}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  useEffect(() => {
    fetchOrders(); fetchPartBrands(); fetchCarMakes();
    const channel = supabase.channel('orders-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => [payload.new, ...prev]);
        toast.success('وصل طلب جديد الآن! 🛍️', { duration: 5000, position: 'top-center' });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function openEditMode(order: any) {
    setEditedItems(order.items ? JSON.parse(JSON.stringify(order.items)) : []);
    setEditedAddress(order.customer_address || '');
    setEditedCity(order.city || '');
    setEditedName(order.customer_name || '');
    setEditedPhone(order.customer_phone || '');
    setEditedPaymentMethod(order.payment_method || 'cash');
    setEditedShipping(parseFloat(order.shipping_cost || order.shipping_fee || 0));
    setDiscount({ type: 'amount', value: order.discount_amount || 0 });
    setExtraFee({ amount: order.extra_fee || 0, reason: order.extra_fee_reason || '' });
    setRemoveShipping(order.shipping_removed || false);
    setShowAddItem(false); setFilteredProducts([]); setProductSearchQuery('');
    setAddItemFilter({ brand: '', car_make: '', car_model: '', car_year: '' });
    fetchCustomerAddresses(order.customer_phone);
    setEditMode(true); setShowInvoice(false);
  }

  function calcTotal(items: any[], disc: any, extra: any, noShipping: boolean, shipping: number) {
    const itemsTotal = items.reduce((sum: number, i: any) => sum + parseFloat(i.price) * i.quantity, 0);
    let discValue = disc.type === 'amount' ? disc.value : (itemsTotal * disc.value / 100);
    const shippingAmt = noShipping ? 0 : shipping;
    return Math.max(0, itemsTotal - discValue + extra.amount + shippingAmt);
  }

  function updateItemQuantity(index: number, qty: number) {
    if (qty < 1) return;
    setEditedItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  }
  function removeItem(index: number) { setEditedItems(prev => prev.filter((_, i) => i !== index)); }
  function addProductToOrder(product: any) {
    const exists = editedItems.findIndex(i => i.id === product.id);
    if (exists >= 0) { updateItemQuantity(exists, editedItems[exists].quantity + 1); }
    else { setEditedItems(prev => [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, image_url: product.image_url, brand: product.brand, car_make: product.car_make, car_model: product.car_model }]); }
    toast.success('تمت إضافة المنتج ✅');
  }

  function InvoicePreview({ order }: { order: any }) {
    const orderNum = order.id.slice(0, 8).toUpperCase();
    const orderDate = new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const items: any[] = order.items || [];
    const subtotal = items.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0);
    const shipping = parseFloat(order.shipping_cost || order.shipping_fee || 0);
    const discountVal = parseFloat(order.discount_applied || order.discount_amount || 0);
    const total = parseFloat(order.total_price || 0);
    const statusLabel = order.status === 'delivered' ? 'تم التسليم' : order.status === 'shipped' ? 'قيد الشحن' : order.status === 'processing' ? 'قيد التجهيز' : 'تم تأكيد الطلب';
    return (
      <div style={{ backgroundColor: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', direction: 'rtl' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f4c2a 100%)', padding: '36px 44px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: '900', fontStyle: 'italic', color: '#fff', letterSpacing: '-1px', marginBottom: '4px' }}>ZAIT <span style={{ color: '#22c55e' }}>&amp; FILTERS</span></div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '2px' }}>AUTO PARTS · قطع غيار</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#22c55e', letterSpacing: '-1px', lineHeight: 1 }}>ORDER</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: '700', marginTop: '4px', letterSpacing: '1px' }}>#{orderNum}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', padding: '5px 14px', borderRadius: '20px' }}>
              <span style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '800' }}>✓ {statusLabel}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{orderDate}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f0f0f0' }}>
          {[{ label: 'رقم الطلب', value: `#${orderNum}` }, { label: 'تاريخ الطلب', value: orderDate }, { label: 'عدد المنتجات', value: `${items.length} منتج` }].map((item, i) => (
            <div key={i} style={{ padding: '18px 22px', borderRight: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ fontSize: '0.68rem', color: '#aaa', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '30px 44px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '20px', border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>بيانات العميل</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>{order.customer_name}</div>
              <div style={{ fontSize: '0.82rem', color: '#555', fontWeight: '600', direction: 'ltr', marginBottom: '4px' }}>{order.customer_phone}</div>
              {order.customer_email && <div style={{ fontSize: '0.78rem', color: '#888' }}>{order.customer_email}</div>}
            </div>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '20px', border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>عنوان التوصيل</div>
              <div style={{ fontSize: '0.85rem', color: '#1a1a1a', fontWeight: '700', lineHeight: '1.5', marginBottom: '6px' }}>{order.customer_address}</div>
              <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '700' }}>{order.city}</div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>طريقة الدفع: <span style={{ fontWeight: '800', color: '#1a1a1a' }}>{paymentLabels[order.payment_method] || order.payment_method}</span></div>
            </div>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>تفاصيل المنتجات</div>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr' }}>
              {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                <div key={i} style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textAlign: i === 0 ? 'right' : 'center', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {items.map((item: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr', padding: '12px 16px', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.87rem', fontWeight: '800', color: '#1a1a1a' }}>{item.name}</div>
                  {item.brand && <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700', marginTop: '2px' }}>{item.brand}</div>}
                  {(item.car_make || item.car_model) && (
                    <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🚗 {[item.car_make, item.car_model].filter(Boolean).join(' ')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}><span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '800' }}>×{item.quantity}</span></div>
                <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#444' }}>{parseFloat(item.price).toLocaleString('ar-EG')} ج.م</div>
                <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '900', color: '#1a1a1a' }}>{(parseFloat(item.price) * item.quantity).toLocaleString('ar-EG')} ج.م</div>
              </div>
            ))}
            <div style={{ height: '4px', backgroundColor: '#0f172a', borderRadius: '0 0 10px 10px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '270px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                <span style={{ color: '#666', fontWeight: '700' }}>المجموع الجزئي</span><span style={{ fontWeight: '800' }}>{subtotal.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                <span style={{ color: '#666', fontWeight: '700' }}>الشحن</span>
                {shipping === 0 ? <span style={{ color: '#22c55e', fontWeight: '800' }}>مجاني 🚚</span> : <span style={{ fontWeight: '800' }}>{shipping.toLocaleString('ar-EG')} ج.م</span>}
              </div>
              {discountVal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                  <span style={{ color: '#666', fontWeight: '700' }}>الخصم</span>
                  <span style={{ color: '#ef4444', fontWeight: '800' }}>- {discountVal.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '14px 18px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', fontWeight: '700' }}>الإجمالي الكلي</span>
                <span style={{ color: '#22c55e', fontSize: '1.35rem', fontWeight: '900' }}>{total.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '24px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '900', fontStyle: 'italic', color: '#fff' }}>ZAIT <span style={{ color: '#22c55e' }}>&amp; FILTERS</span></div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginTop: '3px' }}>zaitandfilters.com</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '800' }}>شكراً لثقتكم بنا</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', marginTop: '2px' }}>Thank you for your order</div>
          </div>
          <div style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '6px 14px', color: '#22c55e', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '1px' }}>
            ORDER #{orderNum}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={loaderStyle}>جاري تحميل الطلبات...</div>;

  const liveTotal = editMode ? calcTotal(editedItems, discount, extraFee, removeShipping, editedShipping) : 0;

  return (
    <div style={{ padding: '30px', direction: 'rtl', maxWidth: '1400px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' }}>

      {/* ── New Order Modal ── */}
      {showNewOrderModal && (
        <NewOrderModal
          onClose={() => setShowNewOrderModal(false)}
          onCreated={() => { fetchOrders(); }}
        />
      )}

      <div style={headerSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={mainTitle}>📦 إدارة الطلبات <span style={badgeCount}>{orders.length}</span></h1>
            <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '5px', marginBottom: 0 }}>متابعة عمليات البيع وحالة الشحن لـ &quot;زيت أند فلترز&quot;</p>
          </div>
          {/* ── NEW ORDER BUTTON ── */}
          <button
            onClick={() => setShowNewOrderModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', border: 'none', borderRadius: '14px',
              padding: '13px 24px', fontWeight: '900', fontSize: '1rem',
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(34,197,94,0.45)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(34,197,94,0.35)'; }}
          >
            <Plus size={20} />
            إنشاء طلب جديد
          </button>
        </div>
      </div>

      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr style={thRow}>
              <th style={th}>العميل</th>
              <th style={th}>المحافظة</th>
              <th style={th}>طريقة الدفع</th>
              <th style={th}>الحالة</th>
              <th style={th}>التاريخ والوقت</th>
              <th style={th}>الإجمالي</th>
              <th style={th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const { datePart, timePart } = formatDateTime(order.created_at);
              return (
                <tr key={order.id} style={tr}>
                  <td style={td}>
                    <div style={{ fontWeight: '800', color: '#1a1a1a' }}>{order.customer_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {order.customer_phone}</div>
                  </td>
                  <td style={td}><div style={cityBadge}><MapPin size={14} color="#15803d" /> {order.city || 'غير محدد'}</div></td>
                  <td style={td}>
                    <div style={payTypeStyle}>
                      {order.payment_method === 'instapay' ? <Banknote size={16} color="#9b59b6" /> : order.payment_method === 'wallets' ? <Smartphone size={16} color="#e74c3c" /> : <CreditCard size={16} color="#3498db" />}
                      <span>{paymentLabels[order.payment_method] || order.payment_method}</span>
                      {order.payment_screenshot_url && <ImageIcon size={14} color="#27ae60" />}
                    </div>
                  </td>
                  <td style={td}>
                    <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} style={miniSelect(order.status)}>
                      <option value="pending">جديد</option>
                      <option value="processing">تجهيز</option>
                      <option value="shipped">شحن</option>
                      <option value="delivered">توصيل</option>
                    </select>
                  </td>
                  <td style={td}>
                    <div style={{ fontSize: '0.85rem', color: '#444', fontWeight: '700' }}>{datePart}</div>
                    <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: '700', marginTop: '2px' }}>{timePart}</div>
                  </td>
                  <td style={td}><span style={{ color: '#15803d', fontWeight: '900', fontSize: '1rem' }}>{order.total_price} <small>ج.م</small></span></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setSelectedOrder(order); setEditMode(false); setShowInvoice(false); }} style={iconBtn} title="عرض الطلب"><Eye size={16} /></button>
                      <button onClick={() => { setSelectedOrder(order); setShowInvoice(true); setEditMode(false); }} style={invoiceRowBtn} title="عرض ORDER"><FileText size={15} /></button>
                      <button onClick={() => setDeleteConfirmId(order.id)} style={delBtn}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal */}
      {selectedOrder && showInvoice && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: '820px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={22} color="#22c55e" /> ORDER #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button onClick={handlePrintInvoice} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: '#fff', color: '#1a1a1a', border: '1.5px solid #ddd', borderRadius: '12px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}>
                <Printer size={16} /> طباعة
              </button>
              <button onClick={() => handleDownloadInvoice(selectedOrder)} disabled={isDownloadingPdf}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', background: isDownloadingPdf ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.88rem', cursor: isDownloadingPdf ? 'not-allowed' : 'pointer' }}>
                <Download size={16} /> {isDownloadingPdf ? 'جاري التحميل...' : 'تحميل PDF'}
              </button>
              <button onClick={() => { setShowInvoice(false); setSelectedOrder(null); }} style={closeBtn}><X size={22} /></button>
            </div>
            <div ref={invoiceRef} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <InvoicePreview order={selectedOrder} />
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && !showInvoice && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: editMode ? '900px' : '750px' }}>
            <div style={modalHeader}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#1a1a1a' }}>
                <Hash size={24} color="#27ae60" /> {editMode ? 'تعديل الطلب' : 'تفاصيل الطلب'}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!editMode && (
                  <button onClick={() => setShowInvoice(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>
                    <FileText size={16} color="#22c55e" /> عرض ORDER
                  </button>
                )}
                {!editMode ? (
                  <button onClick={() => openEditMode(selectedOrder)} style={editBtnStyle}><Edit2 size={16} /> تعديل</button>
                ) : (
                  <>
                    <button onClick={saveOrderEdits} style={saveBtnStyle}><Save size={16} /> حفظ التعديلات</button>
                    <button onClick={() => setEditMode(false)} style={cancelBtnStyle}><X size={16} /> إلغاء</button>
                  </>
                )}
                <button onClick={() => { setSelectedOrder(null); setEditMode(false); setShowInvoice(false); }} style={closeBtn}><X size={24} /></button>
              </div>
            </div>
            <div style={modalBody}>
              <div style={modalCard}>
                <h3 style={cardTitle}><User size={18} /> بيانات العميل والتوصيل</h3>
                {!editMode ? (
                  <div style={modalGrid}>
                    <p><strong>الاسم:</strong> {selectedOrder.customer_name}</p>
                    <p><strong>الموبايل:</strong> {selectedOrder.customer_phone}</p>
                    <p><strong>المحافظة:</strong> {selectedOrder.city}</p>
                    <p><strong>العنوان:</strong> {selectedOrder.customer_address}</p>
                    {selectedOrder.car_mileage && <p><strong>قراءة العداد:</strong> {selectedOrder.car_mileage} كم</p>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>اسم العميل</label>
                        <input value={editedName} onChange={e => setEditedName(e.target.value)} style={inputStyle} placeholder="الاسم الكامل" />
                      </div>
                      <div>
                        <label style={labelStyle}>رقم الهاتف</label>
                        <input value={editedPhone} onChange={e => setEditedPhone(e.target.value)} style={inputStyle} placeholder="01xxxxxxxxx" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>المحافظة</label>
                        <input value={editedCity} onChange={e => setEditedCity(e.target.value)} style={inputStyle} placeholder="المحافظة" />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={labelStyle}>العنوان</label>
                        <input value={editedAddress} onChange={e => setEditedAddress(e.target.value)} style={inputStyle} placeholder="العنوان التفصيلي" />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>طريقة الدفع</label>
                      <select value={editedPaymentMethod} onChange={e => setEditedPaymentMethod(e.target.value)} style={{ ...inputStyle, appearance: 'none' as any, cursor: 'pointer' }}>
                        <option value="cash">كاش عند الاستلام</option>
                        <option value="vodafone_cash">فودافون كاش</option>
                        <option value="instapay">انستاباي</option>
                        <option value="bank_transfer">تحويل بنكي</option>
                        <option value="card_installments">بطاقة / تقسيط</option>
                        <option value="wallets">محفظة إلكترونية</option>
                      </select>
                    </div>
                    {customerAddresses.length > 0 && (
                      <div>
                        <label style={labelStyle}>أو اختر من عناوين العميل المحفوظة</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                          {customerAddresses.map((addr: any, i: number) => (
                            <button key={i} onClick={() => { setEditedAddress(addr.address); setEditedCity(addr.city); }}
                              style={{ ...addrBtnStyle, border: editedAddress === addr.address ? '2px solid #27ae60' : '1px solid #eee' }}>
                              <MapPin size={14} color="#27ae60" /><span><strong>{addr.city}</strong> — {addr.address}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={modalCard}>
                <h3 style={cardTitle}><ShoppingCart size={18} /> المنتجات المطلوبة</h3>
                <div style={itemsContainer}>
                  {(editMode ? editedItems : selectedOrder.items)?.map((item: any, i: number) => (
                    <div key={i} style={productDetailCard}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={miniProductImgBox}><img src={item.image_url || item.image || 'https://via.placeholder.com/150'} alt="" style={miniProductImg} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={productMainInfo}>
                            <span style={productName}>{item.name}</span>
                            <span style={productPrice}>{(parseFloat(item.price) * item.quantity).toFixed(0)} ج.م</span>
                          </div>
                          <div style={extraDetailsGrid}>
                            {item.brand && <div style={detailTag}><Factory size={12} /> {item.brand}</div>}
                            {(item.car_make || item.car_model) && <div style={detailTag}><CarFront size={12} /> {item.car_make} {item.car_model}</div>}
                          </div>
                          {editMode && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                              <label style={{ fontSize: '0.8rem', color: '#666' }}>الكمية:</label>
                              <button onClick={() => updateItemQuantity(i, item.quantity - 1)} style={qtyBtn}>−</button>
                              <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                              <button onClick={() => updateItemQuantity(i, item.quantity + 1)} style={qtyBtn}>+</button>
                              <button onClick={() => removeItem(i)} style={removeItemBtn}><Trash2 size={14} /> حذف</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {editMode && (
                    <div>
                      <button onClick={() => setShowAddItem(!showAddItem)} style={addItemBtnStyle}>
                        <Plus size={16} /> {showAddItem ? 'إخفاء البحث' : 'إضافة منتج'}
                      </button>
                      {showAddItem && (
                        <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '20px', marginTop: '12px', border: '1px solid #dcfce7' }}>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>🔍 بحث سريع باسم المنتج</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
                                <input value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchFilteredProducts()} placeholder="اكتب اسم المنتج... مثال: زيت موبيل" style={{ ...inputStyle, paddingRight: '38px', background: '#fff' }} />
                              </div>
                              <button onClick={fetchFilteredProducts} style={saveBtnStyle}><Search size={15} /> بحث</button>
                              {productSearchQuery && <button onClick={() => { setProductSearchQuery(''); setFilteredProducts([]); }} style={cancelBtnStyle}><X size={15} /></button>}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                            <div>
                              <label style={labelStyle}>ماركة القطعة</label>
                              <select style={inputStyle} value={addItemFilter.brand} onChange={e => setAddItemFilter(f => ({ ...f, brand: e.target.value }))}>
                                <option value="">{loadingBrands ? 'جاري التحميل...' : 'كل الماركات'}</option>
                                {partBrands.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>ماركة السيارة</label>
                              <select style={inputStyle} value={addItemFilter.car_make} onChange={e => { const val = e.target.value; setAddItemFilter(f => ({ ...f, car_make: val, car_model: '', car_year: '' })); fetchCarModels(val); }}>
                                <option value="">الكل</option>
                                {carMakes.map((m: string) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>موديل السيارة</label>
                              <select style={{ ...inputStyle, opacity: !addItemFilter.car_make ? 0.5 : 1 }} value={addItemFilter.car_model} disabled={!addItemFilter.car_make} onChange={e => { const val = e.target.value; setAddItemFilter(f => ({ ...f, car_model: val, car_year: '' })); fetchCarYears(addItemFilter.car_make, val); }}>
                                <option value="">{!addItemFilter.car_make ? 'اختر ماركة أولاً' : 'الكل'}</option>
                                {carModels.map((m: string) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>سنة السيارة</label>
                              <select style={{ ...inputStyle, opacity: !addItemFilter.car_model ? 0.5 : 1 }} value={addItemFilter.car_year} disabled={!addItemFilter.car_model} onChange={e => setAddItemFilter(f => ({ ...f, car_year: e.target.value }))}>
                                <option value="">{!addItemFilter.car_model ? 'اختر موديل أولاً' : 'الكل'}</option>
                                {carYears.map((y: string) => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                          </div>
                          <button onClick={fetchFilteredProducts} style={{ ...saveBtnStyle, width: '100%', justifyContent: 'center', marginBottom: '14px' }}>
                            {loadingProducts ? 'جاري البحث...' : 'بحث بالفلاتر'}
                          </button>
                          <div style={{ display: 'grid', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                            {loadingProducts && <p style={{ color: '#27ae60', textAlign: 'center', padding: '20px' }}>جاري البحث...</p>}
                            {!loadingProducts && filteredProducts.length === 0 && <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>ابحث باسم المنتج أو استخدم الفلاتر أعلاه</p>}
                            {filteredProducts.map((prod: any) => (
                              <div key={prod.id} style={searchProductRow}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <img src={prod.image_url || 'https://via.placeholder.com/50'} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #eee' }} alt="" />
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1a1a1a' }}>{prod.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{prod.brand}{prod.car_make ? ` • ${prod.car_make} ${prod.car_model}` : ''}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ color: '#15803d', fontWeight: '900' }}>{prod.price} ج.م</span>
                                  <button onClick={() => addProductToOrder(prod)} style={saveBtnStyle}><Plus size={14} /> إضافة</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {editMode && (
                    <div style={{ background: '#fffbeb', borderRadius: '16px', padding: '20px', border: '1px solid #fef3c7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h4 style={{ margin: 0, color: '#92400e', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}><Tag size={16} /> تعديلات السعر</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={labelStyle}>رسوم الشحن (ج.م)</label>
                          <input type="number" min={0} value={editedShipping} onChange={e => { setEditedShipping(parseFloat(e.target.value) || 0); setRemoveShipping(false); }} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', width: '100%' }}
                            onClick={() => setRemoveShipping(r => !r)}>
                            <input type="checkbox" checked={removeShipping} onChange={e => setRemoveShipping(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }} />
                            <span style={{ fontWeight: '700', color: '#555', fontSize: '0.85rem' }}>إلغاء الشحن بالكامل</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>الخصم</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select value={discount.type} onChange={e => setDiscount(d => ({ ...d, type: e.target.value as any }))} style={{ ...inputStyle, width: '160px' }}>
                            <option value="amount">خصم بمبلغ (ج.م)</option>
                            <option value="percent">خصم بنسبة (%)</option>
                          </select>
                          <input type="number" min={0} value={discount.value || ''} onChange={e => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))} placeholder={discount.type === 'percent' ? 'مثال: 10' : 'مثال: 50'} style={{ ...inputStyle, width: '120px' }} />
                          <span style={{ color: '#999', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>{discount.type === 'percent' ? '%' : 'ج.م'}</span>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>رسوم إضافية</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" min={0} value={extraFee.amount || ''} onChange={e => setExtraFee(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="المبلغ (ج.م)" style={{ ...inputStyle, width: '130px' }} />
                          <input value={extraFee.reason} onChange={e => setExtraFee(f => ({ ...f, reason: e.target.value }))} placeholder="سبب الرسوم الإضافية..." style={{ ...inputStyle, flex: 1 }} />
                        </div>
                      </div>
                      {/* Live breakdown */}
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(() => {
                          const itemsTotal = editedItems.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0);
                          const discVal = discount.type === 'amount' ? discount.value : (itemsTotal * discount.value / 100);
                          const ship = removeShipping ? 0 : editedShipping;
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#666' }}><span>المنتجات</span><span>{itemsTotal.toLocaleString()} ج.م</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#666' }}><span>الشحن</span><span style={{ color: ship === 0 ? '#22c55e' : '#666' }}>{ship === 0 ? 'مجاني' : `${ship.toLocaleString()} ج.م`}</span></div>
                              {discVal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#ef4444' }}><span>الخصم</span><span>- {discVal.toFixed(0)} ج.م</span></div>}
                              {extraFee.amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#f59e0b' }}><span>{extraFee.reason || 'رسوم إضافية'}</span><span>+ {extraFee.amount.toLocaleString()} ج.م</span></div>}
                              <div style={{ borderTop: '2px dashed #fde68a', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '900', color: '#92400e', fontSize: '0.95rem' }}>الإجمالي الجديد</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#15803d' }}>{liveTotal.toFixed(2)} ج.م</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  {!editMode && (
                    <div style={modalTotalRow}>
                      <span>الإجمالي النهائي:</span>
                      <span style={{ fontSize: '1.5rem', color: '#15803d' }}>{selectedOrder.total_price} ج.م</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={modalCard}>
                <h3 style={cardTitle}><CreditCard size={18} /> إثبات وتفاصيل الدفع</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span>الوسيلة: <strong>{paymentLabels[selectedOrder.payment_method] || selectedOrder.payment_method}</strong></span>
                  {selectedOrder.payment_screenshot_url && (
                    <a href={selectedOrder.payment_screenshot_url} target="_blank" rel="noreferrer" style={viewLink}><ExternalLink size={16} /> فتح الصورة الأصلية</a>
                  )}
                </div>
                {selectedOrder.payment_screenshot_url && (
                  <div style={imagePreviewBox}><img src={selectedOrder.payment_screenshot_url} alt="Proof" style={fullImg} /></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '40px 36px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🗑️</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '10px', color: '#1a1a1a' }}>تأكيد الحذف</h3>
            <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '8px', lineHeight: 1.6 }}>هل أنت متأكد من حذف هذا الطلب نهائياً؟</p>
            <p style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.9rem', marginBottom: '28px' }}>لا يمكن التراجع عن هذا الإجراء</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => handleDelete(deleteConfirmId)} style={{ padding: '12px 32px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={16} /> نعم، احذف
              </button>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '12px 32px', backgroundColor: '#f5f5f5', color: '#555', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const headerSection: any = { marginBottom: '30px' };
const mainTitle: any = { color: '#1a1a1a', fontSize: '2.2rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' };
const badgeCount: any = { background: '#27ae60', color: '#fff', padding: '4px 14px', borderRadius: '12px', fontSize: '1.1rem' };
const tableWrapper: any = { background: '#fff', borderRadius: '25px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { background: '#fcfcfc', borderBottom: '1px solid #eee' };
const th: any = { padding: '18px 20px', fontSize: '0.85rem', color: '#888', fontWeight: 'bold' };
const tr: any = { borderBottom: '1px solid #f9f9f9', transition: '0.2s' };
const td: any = { padding: '18px 20px', fontSize: '0.95rem', color: '#333', verticalAlign: 'middle' };
const cityBadge: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#15803d', padding: '6px 12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', width: 'fit-content' };
const payTypeStyle: any = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#555' };
const miniSelect = (s: string): any => ({
  background: s === 'pending' ? '#fff7ed' : s === 'delivered' ? '#f0fdf4' : s === 'shipped' ? '#eff6ff' : '#fef3c7',
  color: s === 'pending' ? '#c2410c' : s === 'delivered' ? '#15803d' : s === 'shipped' ? '#1e40af' : '#ca8a04',
  border: `1px solid ${s === 'pending' ? '#ffedd5' : s === 'delivered' ? '#dcfce7' : s === 'shipped' ? '#dbeafe' : '#fef3c7'}`,
  padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem', fontWeight: 'bold'
});
const iconBtn: any = { background: '#f8f9fa', border: '1px solid #eee', color: '#555', padding: '9px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const invoiceRowBtn: any = { background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: 'none', color: '#22c55e', padding: '9px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const delBtn: any = { background: '#fff5f5', border: '1px solid #ffebeb', color: '#e74c3c', padding: '9px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const modalOverlay: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContent: any = { background: '#fff', width: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '35px', padding: '35px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' };
const modalHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' };
const closeBtn: any = { background: '#f8f9fa', border: 'none', color: '#888', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalBody: any = { display: 'flex', flexDirection: 'column', gap: '25px' };
const modalCard: any = { background: '#fcfcfc', padding: '25px', borderRadius: '25px', border: '1px solid #f0f0f0' };
const cardTitle: any = { fontSize: '1.1rem', color: '#1a1a1a', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' };
const modalGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.95rem', color: '#555' };
const itemsContainer: any = { display: 'grid', gap: '15px' };
const productDetailCard: any = { background: '#fff', padding: '15px', borderRadius: '20px', border: '1px solid #eee' };
const miniProductImgBox: any = { width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', flexShrink: 0 };
const miniProductImg: any = { width: '100%', height: '100%', objectFit: 'contain' };
const productMainInfo: any = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const productName: any = { color: '#1a1a1a', fontWeight: '800', fontSize: '1rem' };
const productPrice: any = { color: '#15803d', fontWeight: '900', fontSize: '1.05rem' };
const extraDetailsGrid: any = { display: 'flex', flexWrap: 'wrap', gap: '10px' };
const detailTag: any = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#666', background: '#f8f9fa', padding: '5px 10px', borderRadius: '8px', border: '1px solid #eee' };
const modalTotalRow: any = { display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontWeight: '900', borderTop: '2px dashed #eee', paddingTop: '20px', color: '#1a1a1a', fontSize: '1.2rem' };
const imagePreviewBox: any = { marginTop: '15px', borderRadius: '20px', overflow: 'hidden', border: '1px solid #eee', maxHeight: '450px', background: '#f8f9fa' };
const fullImg: any = { width: '100%', display: 'block', objectFit: 'contain' };
const viewLink: any = { color: '#27ae60', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' };
const loaderStyle: any = { color: '#15803d', textAlign: 'center', padding: '150px', fontWeight: '900', fontSize: '1.5rem', direction: 'rtl' };
const labelStyle: any = { fontSize: '0.8rem', fontWeight: '700', color: '#666', display: 'block', marginBottom: '5px' };
const inputStyle: any = { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '9px 13px', fontSize: '0.9rem', color: '#1a1a1a', width: '100%', outline: 'none' };
const editBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' };
const saveBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' };
const cancelBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#f8f9fa', color: '#666', border: '1px solid #eee', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' };
const qtyBtn: any = { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#f8f9fa', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const removeItemBtn: any = { display: 'flex', alignItems: 'center', gap: '5px', background: '#fff5f5', color: '#e74c3c', border: '1px solid #ffebeb', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' };
const addItemBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', color: '#15803d', border: '2px dashed #86efac', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', width: '100%', justifyContent: 'center' };
const addrBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', textAlign: 'right', fontSize: '0.85rem', color: '#444', width: '100%' };
const searchProductRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #eee' };