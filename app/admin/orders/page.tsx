'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Phone, MapPin, ShoppingCart, Trash2, CreditCard, Banknote,
  Image as ImageIcon, ExternalLink, Eye, X, User, Hash,
  CarFront, Factory, Smartphone, Plus, Edit2, Save, Tag,
  Truck, AlertCircle, RefreshCw, Search, FileText, Download, Printer,
  ChevronDown, Package, CheckCircle, Loader2, CheckSquare, Square, Minus,
  AlertTriangle, Link as LinkIcon, MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { orderWhatsAppLink, outOfStockWhatsAppLink } from '@/app/lib/whatsapp';
import OrderPriceManager from './OrderPriceManager';
import OrderCostManager from './OrderCostManager';

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
        width: '100%', height: '46px', padding: '0 14px', backgroundColor: disabled ? '#1a1a1a' : '#fff',
        border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.88rem',
        color: value ? '#1a1a1a' : '#6b7280', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' as any,
      }}>
        <span>{value || `اختر ${label}`}</span>
        <ChevronDown size={15} color="#6b7280" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>
      {open && options.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 3000, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
          <div onClick={() => { onChange(''); setOpen(false); }} style={ddItem}><span style={{ color: '#6b7280' }}>— بدون تحديد —</span></div>
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
      return [...prev, { id: p.id, name: p.name, price, quantity: 1, image_url: p.image_url, brand: p.brand, car_make: p.car_make, car_model: p.car_model, car_model_year: p.car_model_year }];
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
        items: orderItems.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url, brand: i.brand, car_make: i.car_make, car_model: i.car_model, car_model_year: i.car_model_year })),
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '12px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#f8f9fa', width: '100%', maxWidth: '1060px', maxHeight: '95vh', overflowY: 'auto', borderRadius: '24px', padding: 'clamp(16px, 4vw, 28px)', boxShadow: '0 25px 60px rgba(0,0,0,0.05)', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid #e8e8e8', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1rem, 3vw, 1.4rem)', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={22} color="#22c55e" /> إنشاء طلب جديد يدوياً
          </h2>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={19} color="#666" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(0px, calc(100% - 320px), 1fr) min(310px, 100%)', gap: '18px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            <div style={nomCard}>
              <h3 style={nomTitle}><Search size={16} color="#22c55e" /> البحث عن منتجات</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <Dropdown label="الماركة" options={makesOptions} value={filterMake} onChange={setFilterMake} />
                <Dropdown label="الموديل" options={modelsOptions} value={filterModel} onChange={setFilterModel} disabled={!filterMake} />
                <input type="text" placeholder="سنة الصنع" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={nomInput} />
                <Dropdown label="الفئة" options={categoriesOptions} value={filterCategory} onChange={setFilterCategory} />
                <Dropdown label="القسم الفرعي" options={subcategoriesOptions} value={filterSubcategory} onChange={setFilterSubcategory} disabled={!filterCategory} />
                <button onClick={() => { setFilterMake(''); setFilterModel(''); setFilterYear(''); setFilterCategory(''); setFilterSubcategory(''); }}
                  style={{ height: '46px', background: '#fee2e2', color: '#16a34a', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <X size={13} /> مسح الفلاتر
                </button>
              </div>
              <div ref={searchRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#6b7280" style={{ position: 'absolute', right: '13px', top: '15px', pointerEvents: 'none' }} />
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
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
                        <img src={p.image_url || '/placeholder.png'} alt="" style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '8px', background: '#f9f9f9', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#22c55e', fontWeight: '700' }}>{p.brand}</span>
                            {p.car_make && <span>{p.car_make} {p.car_model}</span>}
                            {p.category && <span>{p.category}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <div style={{ fontWeight: '900', fontSize: '0.92rem', color: '#1a1a1a' }}>{(p.sale_price > 0 ? p.sale_price : p.regular_price).toLocaleString()} ج.م</div>
                          {p.sale_price > 0 && <div style={{ fontSize: '0.7rem', color: '#374151', textDecoration: 'line-through' }}>{p.regular_price?.toLocaleString()}</div>}
                        </div>
                        <div style={{ backgroundColor: '#22c55e', color: '#fff', borderRadius: '8px', padding: '5px 10px', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0 }}>+ إضافة</div>
                      </div>
                    ))}
                  </div>
                )}
                {showResults && searchResults.length === 0 && productSearch.length >= 1 && !searching && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2500, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', textAlign: 'center', marginTop: '6px', color: '#9ca3af', fontSize: '0.86rem' }}>لا توجد نتائج</div>
                )}
              </div>
            </div>
            {orderItems.length > 0 && (
              <div style={nomCard}>
                <h3 style={nomTitle}><ShoppingCart size={16} color="#22c55e" /> منتجات الطلب ({orderItems.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orderItems.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                      <img src={item.image_url || '/placeholder.png'} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px', background: '#fff', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: '0.73rem', color: '#22c55e', fontWeight: '700' }}>{item.brand}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => setOrderItems(p => p.map(i => i.id === item.id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i))} style={nomQtyBtn}>-</button>
                        <span style={{ fontWeight: '900', minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                        <button onClick={() => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} style={nomQtyBtn}>+</button>
                      </div>
                      <div style={{ fontWeight: '900', minWidth: '70px', textAlign: 'left', fontSize: '0.85rem', color: '#15803d', flexShrink: 0 }}>{(item.price * item.quantity).toLocaleString()} ج.م</div>
                      <button onClick={() => setOrderItems(p => p.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '4px', flexShrink: 0 }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={nomCard}>
              <h3 style={nomTitle}><User size={16} color="#22c55e" /> بيانات العميل</h3>
              <div ref={customerRef} style={{ position: 'relative', marginBottom: '14px' }}>
                <label style={nomLabel}>ابحث عن عميل موجود (بالاسم أو رقم الهاتف)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '15px', pointerEvents: 'none' }} />
                  <input type="text" placeholder="اكتب اسم العميل أو رقم هاتفه..."
                    value={selectedUser ? `${selectedUser.full_name} — ${selectedUser.phone_number}` : customerSearch}
                    onChange={e => { setSelectedUser(null); searchCustomers(e.target.value); }}
                    style={{ ...nomInput, paddingRight: '38px' }} />
                  {selectedUser && <button onClick={() => { setSelectedUser(null); setCustomerSearch(''); }} style={{ position: 'absolute', left: '10px', top: '13px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={15} color="#6b7280" /></button>}
                </div>
                {showCustomerResults && customerResults.length > 0 && !selectedUser && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2500, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '4px' }}>
                    {customerResults.map((u: any) => (
                      <div key={u.id}
                        onClick={() => { setSelectedUser(u); setManualName(u.full_name); setManualPhone(u.phone_number); setShowCustomerResults(false); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={15} color="#16a34a" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{u.phone_number}</div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                <div><label style={nomLabel}>اسم العميل *</label><input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="الاسم الكامل" style={nomInput} /></div>
                <div><label style={nomLabel}>رقم الهاتف *</label><input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="01xxxxxxxxx" style={nomInput} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={nomLabel}>العنوان *</label><input value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="العنوان بالتفصيل" style={nomInput} /></div>
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={nomLabel}>ملاحظات</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي تعليمات خاصة بالطلب..." rows={2} style={{ ...nomInput, resize: 'vertical' as any, height: 'auto', paddingTop: '10px' }} />
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: 'sticky', top: '10px' }}>
            <div style={{ ...nomCard, border: '2px solid #e8e8e8' }}>
              <h3 style={nomTitle}><Tag size={16} color="#22c55e" /> ملخص الطلب</h3>
              {orderItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af' }}>
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
                style={{ width: '100%', marginTop: '16px', padding: '13px', backgroundColor: orderItems.length === 0 ? '#9ca3af' : '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '0.95rem', cursor: orderItems.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={18} />}
                {submitting ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
              </button>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>سيتم إنشاء الطلب بحالة "قيد المعالجة"</p>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
    </div>
  );
}

const nomCard: any = { backgroundColor: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' };
const nomTitle: any = { fontSize: '0.98rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '14px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '7px' };
const nomInput: any = { width: '100%', height: '46px', padding: '0 14px', backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.88rem', color: '#1a1a1a', boxSizing: 'border-box' as any };
const nomLabel: any = { display: 'block', marginBottom: '5px', fontSize: '0.76rem', fontWeight: '700', color: '#555' };
const nomQtyBtn: any = { width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #e5e5e5', backgroundColor: '#ffffff', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' };
const ddItem: any = { padding: '9px 14px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #f9f9f9', transition: '0.1s' };

// ─── Payment Status helpers ───────────────────────────────────────────────────
const paymentStatusLabels: Record<string, string> = {
  pending:  'في انتظار الدفع',
  paid:     'تم الدفع',
  failed:   'فشل الدفع',
  refunded: 'تم الاسترجاع',
};

const paymentStatusColors: Record<string, { bg: string; color: string; border: string }> = {
  pending:  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  paid:     { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  failed:   { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7' },
  refunded: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
};

// ─── Egypt Post tracking URL builder ─────────────────────────────────────────
const EGYPT_POST_TRACKING_URL = 'https://www.egyptpost.org/ar/tracking';
function buildTrackingUrl(trackingNumber: string): string {
  return `${EGYPT_POST_TRACKING_URL}?barcode=${encodeURIComponent(trackingNumber.trim())}`;
}

// ─── Inline Expanded Order Row ────────────────────────────────────────────────
// Inline "remaining amount" cell shown in every order row. Highlights amber
// when there's an outstanding amount so it's easy to notice at a glance.
function RemainingAmountCell({ order }: { order: any }) {
  // Cash-on-delivery orders default to the full total (nothing paid yet).
  const codDefault = order.payment_method === 'cash'
    ? String(parseFloat(order.total_price) || '')
    : '';
  const [val, setVal] = useState<string>(order.remaining_amount != null ? String(order.remaining_amount) : codDefault);
  const [saving, setSaving] = useState(false);

  async function save() {
    const v = val.trim() === '' ? null : (parseFloat(val) || 0);
    if ((order.remaining_amount ?? null) === v) return;
    setSaving(true);
    const { error } = await supabase.from('orders').update({ remaining_amount: v }).eq('id', order.id);
    setSaving(false);
    if (error) { toast.error('تعذّر حفظ المبلغ المتبقي: ' + error.message); return; }
    order.remaining_amount = v;
    toast.success('تم حفظ المبلغ المتبقي');
  }

  const hasRemaining = (parseFloat(val) || 0) > 0;
  return (
    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <input
        type="number" min={0} step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
        placeholder="0"
        title="مبلغ متبقٍّ"
        style={{
          width: '60px', height: '28px', padding: '0 6px', borderRadius: '6px', textAlign: 'center',
          border: hasRemaining ? '1.5px solid #f59e0b' : '1.5px solid #e5e7eb',
          background: hasRemaining ? '#fff7ed' : '#fff',
          color: hasRemaining ? '#c2410c' : '#1a1a1a',
          fontSize: '0.85rem', fontWeight: 800, outline: 'none',
        }}
      />
      <small style={{ color: '#6b7280', fontSize: '0.68rem' }}>ج.م</small>
      {saving && <Loader2 size={12} color="#6b7280" style={{ animation: 'spin 1s linear infinite' }} />}
    </div>
  );
}

function ExpandedOrderRow({
  order, paymentLabels, onUpdateStatus, onUpdatePaymentStatus,
  onViewDetail, onViewInvoice, onDelete, updatingPayment, enrichedItems,
}: {
  order: any; paymentLabels: any;
  onUpdateStatus: (id: string, s: string, banCod?: boolean) => void;
  onUpdatePaymentStatus: (id: string, s: string) => void;
  onViewDetail: (o: any) => void; onViewInvoice: (o: any) => void;
  onDelete: (id: string) => void; updatingPayment: boolean; enrichedItems: any[];
}) {
  const items: any[] = enrichedItems.length > 0 ? enrichedItems : (order.items || []);
  const [preparedItems, setPreparedItems] = useState<boolean[]>(() => items.map(() => false));
  const allPrepared = preparedItems.length > 0 && preparedItems.every(Boolean);
  const someCount = preparedItems.filter(Boolean).length;
  function toggleItem(i: number) { setPreparedItems(prev => prev.map((v, idx) => idx === i ? !v : v)); }
  function toggleAll() { if (allPrepared) setPreparedItems(items.map(() => false)); else setPreparedItems(items.map(() => true)); }
  const shipping = parseFloat(order.shipping_cost || order.shipping_fee || 0);
  const discountVal = parseFloat(order.discount_applied || order.discount_amount || 0);
  const total = parseFloat(order.total_price || 0);

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fffa 100%)', borderTop: '2px solid #22c55e22', padding: 'clamp(12px, 3vw, 20px)', animation: 'slideDown 0.25s ease-out' }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 220px', background: '#fff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #e8f5e9' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#9ca3af', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>بيانات العميل</div>
          <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1a1a1a', marginBottom: '4px' }}>{order.customer_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}><Phone size={12} color="#22c55e" /> {order.customer_phone}</div>
          <div style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12} color="#22c55e" /> {order.city} — {order.customer_address}</div>
        </div>
        <div style={{ flex: '1 1 180px', background: '#fff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #e8f5e9' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#9ca3af', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>تفاصيل الطلب</div>
          <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '4px' }}>الدفع: <strong>{paymentLabels[order.payment_method] || order.payment_method}</strong></div>
          <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '4px' }}>الشحن: <strong style={{ color: shipping === 0 ? '#22c55e' : '#1a1a1a' }}>{shipping === 0 ? 'مجاني' : `${shipping} ج.م`}</strong>{order.shipping_type === 'express' && <span style={{ marginRight: '6px', fontSize: '0.7rem', color: '#f59e0b', fontWeight: '800' }}>⚡ سريع</span>}</div>
          {discountVal > 0 && <div style={{ fontSize: '0.82rem', color: '#16a34a', marginBottom: '4px' }}>خصم: -{discountVal} ج.م</div>}
          <div style={{ fontSize: '1rem', fontWeight: '900', color: '#15803d', marginTop: '6px' }}>{total.toLocaleString()} ج.م</div>
          {order.tracking_number && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e0f2e9' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#9ca3af', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>تتبع الشحنة</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1a1a1a', fontFamily: 'monospace', background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>{order.tracking_number}</span>
                <a href={buildTrackingUrl(order.tracking_number)} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '800', color: '#1e40af', textDecoration: 'none', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                  <ExternalLink size={11} /> تتبع
                </a>
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 200px', background: '#fff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #e8f5e9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#9ca3af', letterSpacing: '1px', marginBottom: '2px', textTransform: 'uppercase' }}>تحديث الحالات</div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '4px', fontWeight: '700' }}>حالة الشحن</div>
            {/* ── CHANGED: added pending_payment option ── */}
            <select value={order.status} onChange={(e) => onUpdateStatus(order.id, e.target.value)} style={{ ...miniSelectStyle(order.status), width: '100%' }}>
              <option value="pending_payment">انتظار الدفع</option><option value="pending">جديد</option><option value="processing">تجهيز</option><option value="shipped">شحن</option><option value="delivered">توصيل</option><option value="cancelled">ملغي</option><option value="refunded">مسترجع</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '4px', fontWeight: '700' }}>حالة الدفع</div>
            <select value={order.payment_status || 'pending'} onChange={(e) => onUpdatePaymentStatus(order.id, e.target.value)} disabled={updatingPayment}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', outline: 'none', background: '#f9fafb', color: '#1a1a1a' }}>
              {Object.entries(paymentStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'flex-start' }}>
          <button onClick={() => onViewDetail(order)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap' }}><Eye size={13} /> تفاصيل</button>
          <button onClick={() => onViewInvoice(order)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0f172a', color: '#22c55e', border: 'none', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap' }}><FileText size={13} /> ORDER</button>
          {(() => {
            const link = orderWhatsAppLink(order);
            if (!link) return null;
            return (
              <a href={link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                <MessageCircle size={13} /> واتساب
              </a>
            );
          })()}
          {(() => {
            const link = outOfStockWhatsAppLink(order);
            if (!link) return null;
            return (
              <a href={link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                <AlertTriangle size={13} /> غير متوفر
              </a>
            );
          })()}
          <button onClick={() => onDelete(order.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff5f5', color: '#e74c3c', border: '1px solid #ffebeb', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap' }}><Trash2 size={13} /> حذف</button>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e0f2e9', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f0fdf4', borderBottom: '1px solid #e0f2e9' }}>
          <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.85rem', color: '#15803d', padding: 0 }}>
            {allPrepared ? <CheckSquare size={18} color="#22c55e" /> : <Square size={18} color="#6b7280" />}
            {allPrepared ? 'إلغاء تحضير الكل' : 'تحضير الكل'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '700' }}>{someCount} / {items.length} محضّر</span>
            {allPrepared && <span style={{ background: '#22c55e', color: '#fff', borderRadius: '8px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: '800' }}>✓ جاهز للشحن</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((item: any, i: number) => {
            const prepared = preparedItems[i] || false;
            return (
              <div key={i} onClick={() => toggleItem(i)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer', background: prepared ? '#f0fdf4' : '#fff', transition: 'background 0.2s', userSelect: 'none' }}
                onMouseEnter={e => { if (!prepared) e.currentTarget.style.background = '#fafff8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = prepared ? '#f0fdf4' : '#fff'; }}>
                <div style={{ flexShrink: 0 }}>{prepared ? <CheckSquare size={22} color="#22c55e" /> : <Square size={22} color="#d1d5db" />}</div>
                <img src={item.image_url || item.image || 'https://via.placeholder.com/50'} alt="" style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #eee', background: '#f9f9f9', flexShrink: 0, opacity: prepared ? 0.6 : 1, transition: 'opacity 0.2s' }} />
                <div style={{ flex: 1, minWidth: 0 }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.88rem', color: prepared ? '#9ca3af' : '#1a1a1a', textDecoration: prepared ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'all 0.2s', flex: 1 }}>{item.name}</span>
                    {item.id && (
                      <a href={`/products/${item.slug || item.id}`} target="_blank" rel="noopener noreferrer"
                        title="عرض المنتج"
                        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', textDecoration: 'none', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {item.brand && <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700', background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px' }}>{item.brand}</span>}
                    {(item.car_make || item.car_model) && <span style={{ fontSize: '0.72rem', color: '#666', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>🚗 {[item.car_make, item.car_model, item.car_model_year].filter(Boolean).join(' ')}</span>}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800' }}>×{item.quantity}</span>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '0.9rem', color: prepared ? '#6b7280' : '#15803d', transition: 'color 0.2s' }}>{(parseFloat(item.price) * item.quantity).toLocaleString()} ج.م</div>
                </div>
                {prepared && <div style={{ flexShrink: 0, background: '#dcfce7', color: '#15803d', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: '800' }}>✓ محضّر</div>}
              </div>
            );
          })}
        </div>
        <div style={{ height: '4px', background: '#f0f0f0' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', width: `${items.length > 0 ? (someCount / items.length) * 100 : 0}%`, transition: 'width 0.3s ease', borderRadius: '0 4px 4px 0' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminOrders Component ───────────────────────────────────────────────
export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [enrichedItems, setEnrichedItems] = useState<any[]>([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedEnrichedItems, setExpandedEnrichedItems] = useState<any[]>([]);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  const [editedTrackingNumber, setEditedTrackingNumber] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [quickTrackingOrderId, setQuickTrackingOrderId] = useState<string | null>(null);
  const [quickTrackingValue, setQuickTrackingValue] = useState('');

  const [showAddItem, setShowAddItem] = useState(false);
  const [cancelConfirmOrderId, setCancelConfirmOrderId] = useState<string | null>(null);
  const [banCodOnCancel, setBanCodOnCancel] = useState(false);
  const [noWhatsappOnCancel, setNoWhatsappOnCancel] = useState(false);
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
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 20;
  const [orderSearch, setOrderSearch] = useState('');

  const paymentLabels: any = {
    'card_installments': 'بطاقة / تقسيط',
    'instapay': 'انستا باي',
    'easykash': 'EasyKash',
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
    const { data } = await supabase.from('products').select('car_model_year').eq('car_make', make).eq('car_model', model).not('car_model_year', 'is', null).neq('car_model_year', '');
    if (data) { const unique = [...new Set(data.map((d: any) => d.car_model_year).filter(Boolean))].sort(); setCarYears(unique); }
  }

  async function fetchFilteredProducts() {
    setLoadingProducts(true); setFilteredProducts([]);
    try {
      let query = supabase.from('products').select('*');
      // Combine the name search WITH the filters (previously the filters were
      // ignored whenever a name was typed).
      if (productSearchQuery.trim()) query = query.ilike('name', `%${productSearchQuery.trim()}%`);
      if (addItemFilter.brand) query = query.eq('brand', addItemFilter.brand);
      if (addItemFilter.car_make) query = query.eq('car_make', addItemFilter.car_make);
      if (addItemFilter.car_model) query = query.eq('car_model', addItemFilter.car_model);
      if (addItemFilter.car_year) query = query.eq('car_model_year', addItemFilter.car_year);
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

  async function updateOrderStatus(orderId: string, newStatus: string, banCod = false, cancelReason?: string) {
    try {
      const res = await fetch('/api/admin/update-order-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus, banCod: banCod || undefined, cancelReason: cancelReason || undefined }),
      });
      const result = await res.json();
      if (!res.ok || result.error) { toast.error('فشل التحديث: ' + (result.error || 'خطأ غير معروف')); return; }
      toast.success(newStatus === 'delivered' ? 'تم تحديث حالة الطلب — Commission will be released after 14 days! ✅' : 'تم تحديث حالة الطلب ✅');
      const patch: any = { status: newStatus };
      if (newStatus === 'cancelled') patch.cancel_reason = cancelReason || null;
      else { patch.cancel_reason = null; patch.whatsapp_reactivation_requested = false; }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, ...patch }));
    } catch (err: any) { toast.error('فشل التحديث: ' + err.message); }
  }

  function handleStatusChange(orderId: string, newStatus: string) {
    if (newStatus === 'cancelled') {
      setCancelConfirmOrderId(orderId);
      setBanCodOnCancel(false);
      setNoWhatsappOnCancel(false);
    } else {
      updateOrderStatus(orderId, newStatus);
    }
  }

  function confirmCancelOrder() {
    if (!cancelConfirmOrderId) return;
    updateOrderStatus(cancelConfirmOrderId, 'cancelled', banCodOnCancel, noWhatsappOnCancel ? 'no_whatsapp' : undefined);
    setCancelConfirmOrderId(null);
    setBanCodOnCancel(false);
    setNoWhatsappOnCancel(false);
  }

  async function updatePaymentStatus(orderId: string, newPaymentStatus: string) {
    setUpdatingPayment(true);
    try {
      const { error } = await supabase.from('orders').update({ payment_status: newPaymentStatus }).eq('id', orderId);
      if (error) throw error;
      toast.success('تم تحديث حالة الدفع ✅');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, payment_status: newPaymentStatus }));
    } catch (err: any) {
      toast.error('فشل تحديث حالة الدفع: ' + err.message);
    } finally { setUpdatingPayment(false); }
  }

  async function saveTrackingNumber(orderId: string, trackingNumber: string) {
    setSavingTracking(true);
    try {
      const { error } = await supabase.from('orders').update({ tracking_number: trackingNumber.trim() || null }).eq('id', orderId);
      if (error) throw error;
      const updated = { tracking_number: trackingNumber.trim() || null };
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, ...updated }));
      toast.success('تم حفظ رقم التتبع ✅');
      setQuickTrackingOrderId(null);
      setQuickTrackingValue('');
    } catch (err: any) {
      toast.error('فشل حفظ رقم التتبع: ' + err.message);
    } finally { setSavingTracking(false); }
  }

  async function handleDelete(orderId: string) {
    try {
      const { error, count } = await supabase.from('orders').delete({ count: 'exact' }).eq('id', orderId);
      if (error) throw error;
      if (count === 0) { toast.error('لم يتم الحذف — تحقق من صلاحيات RLS في Supabase'); return; }

      // Revert any abandoned cart that was recovered by this order
      await supabase
        .from('abandoned_carts')
        .update({ recovered: false, recovered_at: null })
        .eq('recovery_order_id', orderId)
        .eq('recovered', true);

      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      if (expandedOrderId === orderId) setExpandedOrderId(null);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
      setDeleteConfirmId(null);
      toast.success('تم حذف الطلب ✅');
    } catch (err: any) { toast.error('فشل الحذف: ' + err.message); }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getFilteredOrders = () => {
    let list = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);
    const q = orderSearch.trim();
    if (q) {
      const qClean = q.replace(/\s/g, '').toLowerCase();
      list = list.filter(o =>
        o.customer_phone?.replace(/\s/g, '').includes(qClean) ||
        o.id?.toLowerCase().includes(qClean) ||
        o.id?.slice(0, 8).toUpperCase().includes(q.toUpperCase()) ||
        o.customer_name?.toLowerCase().includes(q.toLowerCase())
      );
    }
    return list;
  };

  const getPagedOrders = () => {
    const filtered = getFilteredOrders();
    return filtered.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);
  };

  const isAllPageSelected = () => {
    const paged = getPagedOrders();
    return paged.length > 0 && paged.every(o => selectedIds.has(o.id));
  };

  const isPartialPageSelected = () => {
    const paged = getPagedOrders();
    return paged.some(o => selectedIds.has(o.id)) && !isAllPageSelected();
  };

  const toggleSelectAllPage = () => {
    const paged = getPagedOrders();
    if (isAllPageSelected()) {
      setSelectedIds(prev => { const n = new Set(prev); paged.forEach(o => n.delete(o.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); paged.forEach(o => n.add(o.id)); return n; });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} طلب نهائياً؟ لا يمكن التراجع.`)) return;
    setBulkDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      const { error } = await supabase.from('orders').delete().in('id', idsArray);
      if (error) throw error;

      // Revert any abandoned carts that were recovered by the deleted orders
      await supabase
        .from('abandoned_carts')
        .update({ recovered: false, recovered_at: null })
        .in('recovery_order_id', idsArray)
        .eq('recovered', true);

      setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
      setSelectedIds(new Set());
      toast.success(`تم حذف ${idsArray.length} طلب بنجاح ✅`);
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحذف: ' + err.message);
    } finally { setBulkDeleting(false); }
  };

  useEffect(() => { setSelectedIds(new Set()); }, [activeTab, currentPage]);

  async function saveOrderEdits() {
    try {
      const newTotal = calcTotal(editedItems, discount, extraFee, removeShipping, editedShipping);
      const discAmount = discount.type === 'amount' ? discount.value : (editedItems.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0) * discount.value / 100);
      const updatePayload: any = {
        items: editedItems,
        customer_address: editedAddress,
        city: editedCity,
        customer_name: editedName,
        customer_phone: editedPhone,
        payment_method: editedPaymentMethod,
        shipping_cost: editedShipping,
        total_price: newTotal.toFixed(2),
        discount_amount: discAmount,
        extra_fee: extraFee.amount,
        extra_fee_reason: extraFee.reason,
        shipping_removed: removeShipping,
        tracking_number: editedTrackingNumber.trim() || null,
      };
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
    setEditedTrackingNumber(order.tracking_number || '');
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
    else { setEditedItems(prev => [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, image_url: product.image_url, brand: product.brand, car_make: product.car_make, car_model: product.car_model, car_model_year: product.car_model_year }]); }
    toast.success('تمت إضافة المنتج ✅');
  }

  async function enrichOrderItems(items: any[]) {
    if (!items?.length) return items;
    const needsEnrich = items.filter(i => !i.brand && !i.car_make && i.id);
    if (needsEnrich.length === 0) return items;
    const ids = needsEnrich.map(i => i.id);
    const { data: products } = await supabase.from('products').select('id, brand, car_make, car_model, car_model_year').in('id', ids);
    if (!products?.length) return items;
    const productMap: Record<string, any> = {};
    products.forEach(p => { productMap[p.id] = p; });
    return items.map(item => {
      if (productMap[item.id]) return { ...item, brand: item.brand || productMap[item.id].brand, car_make: item.car_make || productMap[item.id].car_make, car_model: item.car_model || productMap[item.id].car_model, car_model_year: item.car_model_year || productMap[item.id].car_model_year };
      return item;
    });
  }

  async function toggleExpandOrder(order: any) {
    if (expandedOrderId === order.id) { setExpandedOrderId(null); setExpandedEnrichedItems([]); return; }
    setExpandingId(order.id);
    const enriched = await enrichOrderItems(order.items || []);
    setExpandedEnrichedItems(enriched);
    setExpandedOrderId(order.id);
    setExpandingId(null);
  }

  async function openDetailModal(order: any) {
    setSelectedOrder(order); setEditMode(false); setShowInvoice(false);
    const enriched = await enrichOrderItems(order.items || []);
    setEnrichedItems(enriched.map((i: any) => ({ ...i, _orderId: order.id })));
  }

  async function openInvoiceModal(order: any) {
    setSelectedOrder(order); setShowInvoice(true); setEditMode(false);
    const enriched = await enrichOrderItems(order.items || []);
    setEnrichedItems(enriched.map((i: any) => ({ ...i, _orderId: order.id })));
  }

  function InvoicePreview({ order }: { order: any }) {
    const orderNum = order.id.slice(0, 8).toUpperCase();
    const orderDate = new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const items: any[] = (enrichedItems.length > 0 && enrichedItems[0]?._orderId === order.id) ? enrichedItems : order.items || [];
    const subtotal = items.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0);
    const shipping = parseFloat(order.shipping_cost || order.shipping_fee || 0);
    const discountVal = parseFloat(order.discount_applied || order.discount_amount || 0);
    const total = parseFloat(order.total_price || 0);
    const statusLabel = order.status === 'delivered' ? 'تم التسليم' : order.status === 'shipped' ? 'قيد الشحن' : order.status === 'processing' ? 'قيد التجهيز' : order.status === 'cancelled' ? 'ملغي' : order.status === 'refunded' ? 'مسترجع' : 'تم تأكيد الطلب';
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
              <div style={{ color: 'rgba(0,0,0,0.2)', fontSize: '0.8rem', fontWeight: '700', marginTop: '4px', letterSpacing: '1px' }}>#{orderNum}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', padding: '5px 14px', borderRadius: '20px' }}>
              <span style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '800' }}>✓ {statusLabel}</span>
            </div>
            <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: '0.78rem' }}>{orderDate}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f0f0f0' }}>
          {[{ label: 'رقم الطلب', value: `#${orderNum}` }, { label: 'تاريخ الطلب', value: orderDate }, { label: 'عدد المنتجات', value: `${items.length} منتج` }].map((item, i) => (
            <div key={i} style={{ padding: '18px 22px', borderRight: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '30px 44px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '20px', border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>بيانات العميل</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>{order.customer_name}</div>
              <div style={{ fontSize: '0.82rem', color: '#555', fontWeight: '600', direction: 'ltr', marginBottom: '4px' }}>{order.customer_phone}</div>
              {order.customer_email && <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{order.customer_email}</div>}
            </div>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '20px', border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>عنوان التوصيل</div>
              <div style={{ fontSize: '0.85rem', color: '#1a1a1a', fontWeight: '700', lineHeight: '1.5', marginBottom: '6px' }}>{order.customer_address}</div>
              <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '700' }}>{order.city}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>طريقة الدفع: <span style={{ fontWeight: '800', color: '#1a1a1a' }}>{paymentLabels[order.payment_method] || order.payment_method}</span></div>
            </div>
          </div>
          {order.tracking_number && (
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '14px', padding: '16px 20px', border: '1px solid #bbf7d0', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#15803d', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>تتبع شحنتك — البريد المصري</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#1a1a1a', fontFamily: 'monospace', letterSpacing: '1px' }}>{order.tracking_number}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: '600' }}>تتبع شحنتك على:</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#15803d', background: '#dcfce7', padding: '4px 12px', borderRadius: '8px' }}>egyptpost.org</span>
              </div>
            </div>
          )}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>تفاصيل المنتجات</div>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr' }}>
              {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                <div key={i} style={{ fontSize: '0.68rem', fontWeight: '800', color: '#6b7280', textAlign: i === 0 ? 'right' : 'center', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {items.map((item: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr', padding: '12px 16px', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.87rem', fontWeight: '800', color: '#1a1a1a' }}>{item.name}</span>
                    {item.id && (
                      <a href={`/products/${item.slug || item.id}`} target="_blank" rel="noopener noreferrer"
                        title="عرض المنتج"
                        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '5px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', textDecoration: 'none', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  {item.brand && <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700', marginTop: '2px' }}>{item.brand}</div>}
                  {(item.car_make || item.car_model) && <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>🚗 {[item.car_make, item.car_model, item.car_model_year].filter(Boolean).join(' ')}</div>}
                </div>
                <div style={{ textAlign: 'center' }}><span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '800' }}>×{item.quantity}</span></div>
                <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>{parseFloat(item.price).toLocaleString('ar-EG')} ج.م</div>
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
                <span style={{ color: '#666', fontWeight: '700' }}>{order.shipping_type === 'express' ? '⚡ شحن سريع 48 ساعة' : 'الشحن'}</span>
                {shipping === 0 ? <span style={{ color: '#22c55e', fontWeight: '800' }}>مجاني 🚚</span> : <span style={{ fontWeight: '800', color: order.shipping_type === 'express' ? '#f59e0b' : 'inherit' }}>{shipping.toLocaleString('ar-EG')} ج.م</span>}
              </div>
              {discountVal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                  <span style={{ color: '#666', fontWeight: '700' }}>الخصم</span>
                  <span style={{ color: '#16a34a', fontWeight: '800' }}>- {discountVal.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '14px 18px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '12px' }}>
                <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.82rem', fontWeight: '700' }}>الإجمالي الكلي</span>
                <span style={{ color: '#22c55e', fontSize: '1.35rem', fontWeight: '900' }}>{total.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '24px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '900', fontStyle: 'italic', color: '#fff' }}>ZAIT <span style={{ color: '#22c55e' }}>&amp; FILTERS</span></div>
            <div style={{ color: 'rgba(0,0,0,0.15)', fontSize: '0.7rem', marginTop: '3px' }}>zaitandfilters.com</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '800' }}>شكراً لثقتكم بنا</div>
            <div style={{ color: 'rgba(0,0,0,0.15)', fontSize: '0.68rem', marginTop: '2px' }}>Thank you for your order</div>
          </div>
          <div style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '6px 14px', color: '#22c55e', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '1px' }}>ORDER #{orderNum}</div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={loaderStyle}>جاري تحميل الطلبات...</div>;

  const liveTotal = editMode ? calcTotal(editedItems, discount, extraFee, removeShipping, editedShipping) : 0;

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 30px)', direction: 'rtl', maxWidth: '1400px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh', scrollbarGutter: 'stable' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: flex !important; }
          .header-text { font-size: 1.2rem !important; }
          .new-order-btn span { display: none; }
        }
        @media (min-width: 641px) {
          .desktop-table { display: block !important; }
          .mobile-cards { display: none !important; }
        }
        .order-row-clickable:hover { background: #fafff8 !important; }
        .order-row-clickable:active { background: #f0fdf4 !important; }
        .tracking-input:focus { border-color: #22c55e !important; outline: none; box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
      `}} />

      {showNewOrderModal && <NewOrderModal onClose={() => setShowNewOrderModal(false)} onCreated={() => { fetchOrders(); }} />}

      <div style={headerSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h1 className="header-text" style={{ ...mainTitle, fontSize: 'clamp(1.2rem, 4vw, 2.2rem)' }}>📦 إدارة الطلبات <span style={badgeCount}>{orderSearch ? getFilteredOrders().length : orders.length}</span></h1>
            <p style={{ color: '#666', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', marginTop: '5px', marginBottom: 0 }}>متابعة عمليات البيع وحالة الشحن لـ &quot;زيت أند فلترز&quot;</p>
          </div>
          <button className="new-order-btn" onClick={() => setShowNewOrderModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: '14px', padding: 'clamp(10px, 2vw, 13px) clamp(14px, 3vw, 24px)', fontWeight: '900', fontSize: 'clamp(0.85rem, 2vw, 1rem)', cursor: 'pointer', boxShadow: '0 4px 16px rgba(34,197,94,0.35)', transition: 'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Plus size={20} /> <span>إنشاء طلب جديد</span>
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: `1.5px solid ${orderSearch ? '#22c55e' : '#e2e8f0'}`, borderRadius: '14px', padding: '10px 16px', boxShadow: orderSearch ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none', transition: 'all 0.15s', maxWidth: '480px' }}>
        <Search size={18} color={orderSearch ? '#22c55e' : '#6b7280'} style={{ flexShrink: 0 }} />
        <input
          value={orderSearch}
          onChange={e => { setOrderSearch(e.target.value); setCurrentPage(1); }}
          placeholder="ابحث بالاسم أو رقم الموبايل أو رقم الطلب..."
          dir="rtl"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.92rem', fontFamily: 'inherit', background: 'transparent', color: '#0f172a' }}
        />
        {orderSearch && (
          <button onClick={() => { setOrderSearch(''); setCurrentPage(1); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex', flexShrink: 0 }}>
            <X size={16} />
          </button>
        )}
      </div>
      {orderSearch && (
        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '700', marginBottom: '12px', marginTop: '-8px' }}>
          {getFilteredOrders().length} نتيجة لـ "{orderSearch}"
        </p>
      )}

      {/* ── Status Tabs ── */}
      {(() => {
        // ── CHANGED: added pending_payment tab ──
        const tabs = [
          { key: 'all',             label: 'الكل',              color: '#1a1a1a' },
          { key: 'pending_payment', label: '💳 انتظار الدفع',   color: '#7c3aed' },
          { key: 'pending',         label: 'جديد',              color: '#c2410c' },
          { key: 'processing',      label: 'تجهيز',             color: '#ca8a04' },
          { key: 'shipped',         label: 'شحن',               color: '#1e40af' },
          { key: 'delivered',       label: 'توصيل',             color: '#15803d' },
          { key: 'cancelled',       label: 'ملغي',              color: '#16a34a' },
          { key: 'refunded',        label: 'مسترجع',            color: '#6d28d9' },
        ];
        return (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {tabs.map(tab => {
              const count = tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setCurrentPage(1); setExpandedOrderId(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: 'clamp(7px, 1.5vw, 9px) clamp(10px, 2vw, 18px)', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', border: 'none', background: isActive ? tab.color : '#fff', color: isActive ? '#fff' : tab.color, boxShadow: isActive ? `0 4px 12px ${tab.color}33` : '0 1px 4px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}>
                  {tab.label}
                  <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : `${tab.color}18`, color: isActive ? '#fff' : tab.color, borderRadius: '8px', padding: '1px 8px', fontSize: '0.78rem', fontWeight: '900' }}>{count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ── BULK ACTION BAR ── */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #22c55e44', borderRadius: '12px', padding: '14px 20px', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: '#1a1a1a', fontWeight: '700', fontSize: '0.95rem' }}>
            تم تحديد <span style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: '900' }}>{selectedIds.size}</span> طلب
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => setSelectedIds(new Set())}
              style={{ padding: '8px 15px', backgroundColor: '#e5e7eb', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <X size={14} /> إلغاء التحديد
            </button>
            <button onClick={handleBulkDelete} disabled={bulkDeleting}
              style={{ padding: '8px 16px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: bulkDeleting ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px', opacity: bulkDeleting ? 0.7 : 1 }}>
              <Trash2 size={14} />
              {bulkDeleting ? 'جاري الحذف...' : `حذف ${selectedIds.size} طلب`}
            </button>
          </div>
        </div>
      )}

      {/* ── Orders Table ── */}
      {(() => {
        const filtered = getFilteredOrders();
        const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
        const paginated = filtered.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);
        const allPageSelected = paginated.length > 0 && paginated.every(o => selectedIds.has(o.id));
        const partialPageSelected = paginated.some(o => selectedIds.has(o.id)) && !allPageSelected;

        return (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="desktop-table" style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr style={thRow}>
                    <th style={{ ...th, width: '40px', textAlign: 'center' }}>
                      <button onClick={toggleSelectAllPage}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                        title={allPageSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}>
                        {allPageSelected
                          ? <CheckSquare size={20} color="#22c55e" />
                          : partialPageSelected
                            ? <Minus size={20} color="#f1c40f" style={{ border: '2px solid #f1c40f', borderRadius: '4px' }} />
                            : <Square size={20} color="#9ca3af" />
                        }
                      </button>
                    </th>
                    <th style={{ ...th, width: '32px' }}></th>
                    <th style={th}>العميل</th>
                    <th style={th}>المحافظة</th>
                    <th style={th}>طريقة الدفع</th>
                    <th style={th}>حالة الشحن</th>
                    <th style={th}>حالة الدفع</th>
                    <th style={th}>رقم التتبع</th>
                    <th style={th}>التاريخ والوقت</th>
                    <th style={th}>الإجمالي</th>
                    <th style={th}>مبلغ متبقٍّ</th>
                    <th style={th}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={12} style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '0.95rem' }}>لا توجد طلبات في هذا القسم</td></tr>
                  ) : paginated.map((order) => {
                    const { datePart, timePart } = formatDateTime(order.created_at);
                    const isExpanded = expandedOrderId === order.id;
                    const isExpanding = expandingId === order.id;
                    const isSelected = selectedIds.has(order.id);
                    const isEditingTracking = quickTrackingOrderId === order.id;
                    return (
                      <>
                        <tr key={order.id} className="order-row-clickable"
                          style={{ ...tr, background: isSelected ? 'rgba(34,197,94,0.06)' : isExpanded ? '#f0fdf4' : '#fff', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                          onClick={() => toggleExpandOrder(order)}>
                          <td style={{ ...td, textAlign: 'center', width: '40px' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => toggleSelectOne(order.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                              {isSelected ? <CheckSquare size={18} color="#22c55e" /> : <Square size={18} color="#9ca3af" />}
                            </button>
                          </td>
                          <td style={{ ...td, padding: '18px 8px 18px 0', width: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isExpanding
                                ? <Loader2 size={16} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }} />
                                : <ChevronDown size={18} color={isExpanded ? '#22c55e' : '#6b7280'} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              }
                            </div>
                          </td>
                          <td style={td}>
                            <div style={{ fontWeight: '800', color: '#1a1a1a' }}>{order.customer_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={10} /> {order.customer_phone}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#22c55e', fontFamily: 'monospace', marginTop: '2px', letterSpacing: '0' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                            {order.whatsapp_reactivation_requested && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', background: '#f0fdf4', color: '#15803d', border: '1px solid #16a34a', borderRadius: '8px', padding: '2px 7px', fontSize: '0.62rem', fontWeight: '900' }}>🟢 رقم واتساب جديد</div>
                            )}
                            {order.promo_code && (
                              <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '900', color: '#854d0e', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                                🏷️ {order.promo_code}
                              </div>
                            )}
                          </td>
                          <td style={td}>
                            <div style={cityBadge}><MapPin size={14} color="#15803d" /> {order.city || 'غير محدد'}</div>
                            {order.shipping_type === 'express' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '3px 8px', width: 'fit-content', fontSize: '0.72rem', fontWeight: '800', color: '#92400e' }}>⚡ شحن سريع 48 ساعة</div>
                            )}
                          </td>
                          <td style={td}>
                            <div style={payTypeStyle}>
                              {order.payment_method === 'instapay' ? <Banknote size={16} color="#9b59b6" /> : order.payment_method === 'wallets' ? <Smartphone size={16} color="#e74c3c" /> : order.payment_method === 'cash' ? <Truck size={16} color="#16a34a" /> : <CreditCard size={16} color="#3498db" />}
                              <span>{paymentLabels[order.payment_method] || order.payment_method}</span>
                              {order.payment_screenshot_url && <ImageIcon size={14} color="#27ae60" />}
                            </div>
                          </td>
                          <td style={td}>
                            {/* ── CHANGED: added pending_payment option ── */}
                            <select value={order.status} onChange={(e) => { e.stopPropagation(); handleStatusChange(order.id, e.target.value); }} style={miniSelectStyle(order.status)}>
                              <option value="pending_payment">انتظار الدفع</option><option value="pending">جديد</option><option value="processing">تجهيز</option><option value="shipped">شحن</option><option value="delivered">توصيل</option><option value="cancelled">ملغي</option><option value="refunded">مسترجع</option>
                            </select>
                          </td>
                          <td style={td}>
                            {(() => {
                              const ps = order.payment_status || 'pending';
                              const c = paymentStatusColors[ps] || paymentStatusColors.pending;
                              return <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>{paymentStatusLabels[ps]}</span>;
                            })()}
                          </td>
                          <td style={td}>
                            {isEditingTracking ? (
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <input
                                  className="tracking-input"
                                  autoFocus
                                  type="text"
                                  value={quickTrackingValue}
                                  onChange={e => setQuickTrackingValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveTrackingNumber(order.id, quickTrackingValue);
                                    if (e.key === 'Escape') { setQuickTrackingOrderId(null); setQuickTrackingValue(''); }
                                  }}
                                  placeholder="أدخل رقم التتبع"
                                  style={{ width: '130px', height: '32px', padding: '0 8px', border: '1.5px solid #22c55e', borderRadius: '8px', fontSize: '0.78rem', fontFamily: 'monospace', color: '#1a1a1a', background: '#fff', transition: 'all 0.2s' }}
                                />
                                <button onClick={(e) => { e.stopPropagation(); saveTrackingNumber(order.id, quickTrackingValue); }} disabled={savingTracking}
                                  style={{ width: '28px', height: '28px', background: '#22c55e', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {savingTracking ? <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} color="#fff" />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setQuickTrackingOrderId(null); setQuickTrackingValue(''); }}
                                  style={{ width: '28px', height: '28px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <X size={12} color="#16a34a" />
                                </button>
                              </div>
                            ) : order.tracking_number ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1a1a1a', fontFamily: 'monospace', background: '#f0fdf4', padding: '2px 7px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>{order.tracking_number}</span>
                                  <button onClick={(e) => { e.stopPropagation(); setQuickTrackingOrderId(order.id); setQuickTrackingValue(order.tracking_number); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af', flexShrink: 0 }}
                                    title="تعديل رقم التتبع">
                                    <Edit2 size={12} />
                                  </button>
                                </div>
                                <a href={buildTrackingUrl(order.tracking_number)} target="_blank" rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: '800', color: '#1e40af', textDecoration: 'none', background: '#eff6ff', padding: '2px 7px', borderRadius: '5px', border: '1px solid #dbeafe', width: 'fit-content' }}>
                                  <ExternalLink size={10} /> تتبع البريد المصري
                                </a>
                              </div>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); setQuickTrackingOrderId(order.id); setQuickTrackingValue(''); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8faff', color: '#6b7280', border: '1.5px dashed #374151', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = '#22c55e'; b.style.color = '#22c55e'; b.style.background = '#f0fdf4'; }}
                                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = '#374151'; b.style.color = '#6b7280'; b.style.background = '#f8faff'; }}>
                                <Plus size={12} /> إضافة رقم تتبع
                              </button>
                            )}
                          </td>
                          <td style={td}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '700' }}>{datePart}</div>
                            <div style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: '700', marginTop: '1px' }}>{timePart}</div>
                          </td>
                          <td style={td}>
                            <span style={{ color: '#15803d', fontWeight: '900', fontSize: '0.85rem' }}>{order.total_price} <small style={{ fontSize: '0.65rem' }}>ج.م</small></span>
                          </td>
                          <td style={td} onClick={e => e.stopPropagation()}>
                            <RemainingAmountCell order={order} />
                          </td>
                          <td style={td} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openDetailModal(order)} style={iconBtn} title="عرض الطلب"><Eye size={16} /></button>
                              <button onClick={() => openInvoiceModal(order)} style={invoiceRowBtn} title="عرض ORDER"><FileText size={15} /></button>
                              <button onClick={() => setDeleteConfirmId(order.id)} style={delBtn}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${order.id}-expanded`}>
                            <td colSpan={12} style={{ padding: 0, border: 'none' }}>
                              <ExpandedOrderRow order={order} paymentLabels={paymentLabels} onUpdateStatus={handleStatusChange} onUpdatePaymentStatus={updatePaymentStatus} onViewDetail={openDetailModal} onViewInvoice={openInvoiceModal} onDelete={(id) => setDeleteConfirmId(id)} updatingPayment={updatingPayment} enrichedItems={expandedEnrichedItems} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
              {paginated.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', fontSize: '0.95rem', background: '#fff', borderRadius: '16px' }}>لا توجد طلبات في هذا القسم</div>
              ) : paginated.map((order) => {
                const { datePart, timePart } = formatDateTime(order.created_at);
                const isExpanded = expandedOrderId === order.id;
                const isExpanding = expandingId === order.id;
                const isSelected = selectedIds.has(order.id);
                const ps = order.payment_status || 'pending';
                const pc = paymentStatusColors[ps] || paymentStatusColors.pending;
                return (
                  <div key={order.id} style={{ background: '#fff', borderRadius: '16px', border: isSelected ? '2px solid #22c55e' : isExpanded ? '2px solid #22c55e' : '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px 0', background: isSelected ? 'rgba(34,197,94,0.04)' : '#fff' }}>
                      <button onClick={() => toggleSelectOne(order.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
                        {isSelected ? <CheckSquare size={20} color="#22c55e" /> : <Square size={20} color="#9ca3af" />}
                      </button>
                      <div onClick={() => toggleExpandOrder(order)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1a1a1a', marginBottom: '3px' }}>{order.customer_name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={11} /> {order.customer_phone}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#22c55e', fontFamily: 'monospace', marginTop: '2px', letterSpacing: '0.5px' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                            {order.whatsapp_reactivation_requested && (
                              <div style={{ marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#15803d', border: '1px solid #16a34a', borderRadius: '7px', padding: '2px 7px', fontSize: '0.66rem', fontWeight: '900' }}>🟢 رقم واتساب جديد</div>
                            )}
                            {order.promo_code && (
                              <div style={{ marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '2px 7px', fontSize: '0.68rem', fontWeight: '900', color: '#854d0e', fontFamily: 'monospace' }}>
                                🏷️ {order.promo_code}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontWeight: '900', fontSize: '1rem', color: '#15803d' }}>{order.total_price} ج.م</span>
                            {isExpanding ? <Loader2 size={18} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronDown size={20} color={isExpanded ? '#22c55e' : '#6b7280'} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          <div style={{ ...cityBadge, fontSize: '0.75rem', padding: '4px 10px' }}><MapPin size={12} color="#15803d" /> {order.city || 'غير محدد'}</div>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{paymentStatusLabels[ps]}</span>
                          {(() => {
                            const sc = miniSelectStyle(order.status);
                            // ── CHANGED: added pending_payment label ──
                            const statusLabels: any = { pending_payment: 'انتظار الدفع', pending: 'جديد', processing: 'تجهيز', shipped: 'شحن', delivered: 'توصيل', cancelled: 'ملغي', refunded: 'مسترجع' };
                            return <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: sc.background, color: sc.color, border: sc.border }}>{statusLabels[order.status] || order.status}</span>;
                          })()}
                          <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <small style={{ color: '#6b7280', fontSize: '0.68rem' }}>متبقٍّ</small>
                            <RemainingAmountCell order={order} />
                          </span>
                          {order.tracking_number && (
                            <a href={buildTrackingUrl(order.tracking_number)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: '800', color: '#1e40af', textDecoration: 'none', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                              <Truck size={10} /> {order.tracking_number}
                            </a>
                          )}
                          <span style={{ fontSize: '0.72rem', color: '#6b7280', marginRight: 'auto' }}>{datePart} • {timePart}</span>
                        </div>
                        <div style={{ paddingBottom: '12px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: '1px solid #f0f0f0', background: '#fafafa' }} onClick={e => e.stopPropagation()}>
                      {/* ── CHANGED: added pending_payment option ── */}
                      <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 12px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', outline: 'none', color: '#d1d5db', borderLeft: '1px solid #f0f0f0' }}>
                        <option value="pending_payment">انتظار الدفع</option><option value="pending">جديد</option><option value="processing">تجهيز</option><option value="shipped">شحن</option><option value="delivered">توصيل</option><option value="cancelled">ملغي</option><option value="refunded">مسترجع</option>
                      </select>
                      <button onClick={() => openDetailModal(order)} style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: '700', color: '#1e40af', borderLeft: '1px solid #f0f0f0' }}><Eye size={14} /> تفاصيل</button>
                      <button onClick={() => openInvoiceModal(order)} style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: '700', color: '#22c55e', borderLeft: '1px solid #f0f0f0' }}><FileText size={14} /> ORDER</button>
                      <button onClick={() => setDeleteConfirmId(order.id)} style={{ flex: '0 0 44px', border: 'none', background: 'transparent', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c' }}><Trash2 size={15} /></button>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '2px solid #22c55e22' }}>
                        <ExpandedOrderRow order={order} paymentLabels={paymentLabels} onUpdateStatus={handleStatusChange} onUpdatePaymentStatus={updatePaymentStatus} onViewDetail={openDetailModal} onViewInvoice={openInvoiceModal} onDelete={(id) => setDeleteConfirmId(id)} updatingPayment={updatingPayment} enrichedItems={expandedEnrichedItems} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e5e5e5', background: currentPage === 1 ? '#1a1a1a' : '#fff', color: currentPage === 1 ? '#9ca3af' : '#1a1a1a', fontWeight: '700', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>← السابق</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const isNear = Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages;
                  if (!isNear) {
                    if (page === 2 && currentPage > 4) return <span key={page} style={{ color: '#6b7280' }}>...</span>;
                    if (page === totalPages - 1 && currentPage < totalPages - 3) return <span key={page} style={{ color: '#6b7280' }}>...</span>;
                    return null;
                  }
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', background: currentPage === page ? '#22c55e' : '#fff', color: currentPage === page ? '#fff' : '#1a1a1a', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem', boxShadow: currentPage === page ? '0 2px 8px rgba(34,197,94,0.3)' : '0 1px 4px rgba(0,0,0,0.08)' }}>
                      {page}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e5e5e5', background: currentPage === totalPages ? '#1a1a1a' : '#fff', color: currentPage === totalPages ? '#9ca3af' : '#1a1a1a', fontWeight: '700', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>التالي →</button>
                <span style={{ color: '#9ca3af', fontSize: '0.82rem', marginRight: '8px' }}>صفحة {currentPage} من {totalPages} — {filtered.length} طلب</span>
              </div>
            )}
          </>
        );
      })()}

      {/* Invoice Modal */}
      {selectedOrder && showInvoice && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: '820px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <h2 style={{ margin: 0, fontSize: 'clamp(0.95rem, 3vw, 1.3rem)', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={22} color="#22c55e" /> ORDER #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button onClick={handlePrintInvoice} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 14px', background: '#fff', color: '#1a1a1a', border: '1.5px solid #ddd', borderRadius: '12px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}><Printer size={16} /> طباعة</button>
              <button onClick={() => handleDownloadInvoice(selectedOrder)} disabled={isDownloadingPdf}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: isDownloadingPdf ? '#9ca3af' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: isDownloadingPdf ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                <Download size={16} /> {isDownloadingPdf ? 'جاري...' : 'PDF'}
              </button>
              <button onClick={() => { setShowInvoice(false); setSelectedOrder(null); setEnrichedItems([]); }} style={closeBtn}><X size={22} /></button>
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
            <div style={{ ...modalHeader, flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#1a1a1a', fontSize: 'clamp(1rem, 3vw, 1.3rem)' }}>
                <Hash size={24} color="#27ae60" /> {editMode ? 'تعديل الطلب' : 'تفاصيل الطلب'}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!editMode && (
                  <button onClick={() => setShowInvoice(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <FileText size={16} color="#22c55e" /> ORDER
                  </button>
                )}
                {!editMode && (() => {
                  const link = orderWhatsAppLink(selectedOrder);
                  if (!link) return null;
                  return (
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                      <MessageCircle size={16} /> واتساب
                    </a>
                  );
                })()}
                {!editMode ? (
                  <button onClick={() => openEditMode(selectedOrder)} style={editBtnStyle}><Edit2 size={16} /> تعديل</button>
                ) : (
                  <>
                    <button onClick={saveOrderEdits} style={saveBtnStyle}><Save size={16} /> حفظ</button>
                    <button onClick={() => setEditMode(false)} style={cancelBtnStyle}><X size={16} /> إلغاء</button>
                  </>
                )}
                <button onClick={() => { setSelectedOrder(null); setEditMode(false); setShowInvoice(false); setEnrichedItems([]); }} style={closeBtn}><X size={24} /></button>
              </div>
            </div>
            <div style={modalBody}>
              <div style={{ ...modalCard, background: '#fafafa', border: '1.5px solid #e5e7eb' }}>
                <h3 style={cardTitle}><CreditCard size={18} /> حالة الدفع</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {(() => {
                    const ps = selectedOrder.payment_status || 'pending';
                    const c = paymentStatusColors[ps] || paymentStatusColors.pending;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: '700' }}>الحالة الحالية:</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: '900', padding: '6px 16px', borderRadius: '10px', background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>{paymentStatusLabels[ps]}</span>
                      </div>
                    );
                  })()}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginRight: 'auto' }}>
                    {Object.entries(paymentStatusLabels).map(([key, label]) => {
                      const current = selectedOrder.payment_status || 'pending';
                      const isActive = current === key;
                      const c = paymentStatusColors[key];
                      return (
                        <button key={key} disabled={isActive || updatingPayment} onClick={() => updatePaymentStatus(selectedOrder.id, key)}
                          style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', cursor: isActive || updatingPayment ? 'not-allowed' : 'pointer', border: `1.5px solid ${isActive ? c.border : '#e5e7eb'}`, background: isActive ? c.bg : '#fff', color: isActive ? c.color : '#9ca3af', opacity: isActive ? 1 : 0.75, transition: 'all 0.15s' }}
                          onMouseEnter={e => { if (!isActive) { const b = e.currentTarget as HTMLButtonElement; b.style.background = c.bg; b.style.color = c.color; b.style.border = `1.5px solid ${c.border}`; b.style.opacity = '1'; } }}
                          onMouseLeave={e => { if (!isActive) { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#fff'; b.style.color = '#9ca3af'; b.style.border = '1.5px solid #e5e7eb'; b.style.opacity = '0.75'; } }}>
                          {updatingPayment && !isActive ? '...' : label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ ...modalCard, background: selectedOrder.tracking_number ? '#f0fdf4' : '#fafafa', border: selectedOrder.tracking_number ? '1.5px solid #bbf7d0' : '1.5px dashed #d1d5db' }}>
                <h3 style={{ ...cardTitle, color: selectedOrder.tracking_number ? '#15803d' : '#6b7280' }}>
                  <Truck size={18} color={selectedOrder.tracking_number ? '#22c55e' : '#9ca3af'} />
                  رقم تتبع الشحنة — البريد المصري
                </h3>
                {!editMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedOrder.tracking_number ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #86efac', borderRadius: '10px', padding: '10px 16px' }}>
                            <LinkIcon size={16} color="#22c55e" />
                            <span style={{ fontWeight: '900', fontSize: '1rem', color: '#1a1a1a', fontFamily: 'monospace', letterSpacing: '1px' }}>{selectedOrder.tracking_number}</span>
                          </div>
                          <a href={buildTrackingUrl(selectedOrder.tracking_number)} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: '800', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                            <ExternalLink size={15} /> تتبع على موقع البريد المصري
                          </a>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle size={14} color="#22c55e" />
                          سيظهر رقم التتبع وزر التتبع في حساب العميل تلقائياً
                        </div>
                        <button onClick={() => openEditMode(selectedOrder)} style={{ ...editBtnStyle, width: 'fit-content' }}><Edit2 size={14} /> تعديل رقم التتبع</button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.88rem' }}>لم يتم إضافة رقم تتبع لهذا الطلب بعد.</p>
                        <button onClick={() => openEditMode(selectedOrder)} style={{ ...saveBtnStyle, width: 'fit-content' }}><Plus size={14} /> إضافة رقم تتبع الآن</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={labelStyle}>رقم التتبع (اختياري)</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Truck size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          className="tracking-input"
                          type="text"
                          value={editedTrackingNumber}
                          onChange={e => setEditedTrackingNumber(e.target.value)}
                          placeholder="مثال: ER123456789EG"
                          style={{ ...inputStyle, paddingRight: '40px', fontFamily: 'monospace', letterSpacing: '0.5px', fontSize: '0.95rem' }}
                        />
                      </div>
                      {editedTrackingNumber.trim() && (
                        <a href={buildTrackingUrl(editedTrackingNumber)} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1e40af', textDecoration: 'none', borderRadius: '10px', padding: '9px 14px', fontWeight: '700', fontSize: '0.85rem', border: '1px solid #dbeafe', whiteSpace: 'nowrap' }}>
                          <ExternalLink size={14} /> اختبر الرابط
                        </a>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                      سيتم إنشاء رابط تتبع تلقائي على موقع البريد المصري وإظهاره للعميل في حسابه.
                      اتركه فارغاً إذا لم يكن لديك رقم تتبع بعد.
                    </p>
                  </div>
                )}
              </div>

              <div style={modalCard}>
                <h3 style={cardTitle}><User size={18} /> بيانات العميل والتوصيل</h3>
                {selectedOrder.whatsapp_reactivation_requested && (
                  <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🟢</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '900', fontSize: '0.92rem', color: '#14532d', marginBottom: '3px' }}>العميل أدخل رقم واتساب جديد — جاهز لإعادة التفعيل</div>
                      <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '700', direction: 'ltr', textAlign: 'right' }}>
                        📱 {selectedOrder.new_whatsapp_number}
                        {selectedOrder.new_whatsapp_number && (
                          <a href={`https://wa.me/2${String(selectedOrder.new_whatsapp_number).replace(/\D/g, '').slice(-11)}`} target="_blank" rel="noreferrer" style={{ marginRight: '10px', color: '#16a34a', fontWeight: '900', textDecoration: 'underline' }}>فتح واتساب</a>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: '600', marginTop: '4px' }}>غيّر حالة الطلب إلى "جديد" أو "تجهيز" لإعادة تفعيله</div>
                    </div>
                  </div>
                )}
                {!editMode ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', fontSize: '0.95rem', color: '#555' }}>
                    <p style={{ margin: 0 }}><strong>الاسم:</strong> {selectedOrder.customer_name}</p>
                    <p style={{ margin: 0 }}><strong>الموبايل:</strong> {selectedOrder.customer_phone}</p>
                    <p style={{ margin: 0 }}><strong>المحافظة:</strong> {selectedOrder.city}</p>
                    <p style={{ margin: 0 }}><strong>العنوان:</strong> {selectedOrder.customer_address}</p>
                    <p style={{ margin: 0 }}><strong>نوع الشحن:</strong>{' '}{selectedOrder.shipping_type === 'express' ? <span style={{ color: '#f59e0b', fontWeight: '800' }}>⚡ شحن سريع 48 ساعة — {selectedOrder.shipping_cost} ج.م</span> : <span>شحن عادي — {selectedOrder.shipping_cost || 0} ج.م</span>}</p>
                    {selectedOrder.car_mileage && <p style={{ margin: 0 }}><strong>قراءة العداد:</strong> {selectedOrder.car_mileage} كم</p>}
                    {(selectedOrder.promo_code || selectedOrder.discount_applied > 0 || selectedOrder.discount_amount > 0) && (
                      <div style={{ gridColumn: '1 / -1', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#854d0e', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>🏷️ كود الخصم والخصومات</div>
                        {selectedOrder.promo_code && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#555', fontWeight: '700' }}>الكود المستخدم:</span>
                            <span style={{ background: '#fff', border: '1px solid #fde047', borderRadius: '8px', padding: '3px 10px', fontFamily: 'monospace', fontWeight: '900', fontSize: '0.88rem', color: '#854d0e', letterSpacing: '1px' }}>{selectedOrder.promo_code}</span>
                          </div>
                        )}
                        {(parseFloat(selectedOrder.discount_applied || selectedOrder.discount_amount || 0) > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#555', fontWeight: '700' }}>قيمة الخصم:</span>
                            <span style={{ color: '#16a34a', fontWeight: '900', fontSize: '0.95rem' }}>- {parseFloat(selectedOrder.discount_applied || selectedOrder.discount_amount || 0).toFixed(2)} ج.م</span>
                          </div>
                        )}
                        {(parseFloat(selectedOrder.wallet_discount || 0) > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#555', fontWeight: '700' }}>خصم المحفظة:</span>
                            <span style={{ color: '#15803d', fontWeight: '900', fontSize: '0.95rem' }}>- {parseFloat(selectedOrder.wallet_discount).toFixed(2)} ج.م</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(parseFloat(selectedOrder.cashback_amount || 0) > 0) ? (
                      <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#22c55e', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '1rem' }}>🎁</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#15803d', marginBottom: '2px' }}>كاش باك أُضيف لمحفظة العميل</div>
                          <div style={{ fontWeight: '900', fontSize: '1rem', color: '#15803d' }}>+ {parseFloat(selectedOrder.cashback_amount).toFixed(2)} ج.م</div>
                        </div>
                      </div>
                    ) : selectedOrder.status === 'delivered' && selectedOrder.user_id && selectedOrder.payment_method !== 'cash' ? (
                      /* Manual cashback button for delivered orders that didn't get it automatically (not for cash on delivery) */
                      <div style={{ gridColumn: '1 / -1', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' as const }}>
                        <div style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: '700' }}>⚠️ لم يُطبَّق الكاش باك على هذا الطلب بعد</div>
                        <button
                          onClick={async () => {
                            toast.loading('جاري تطبيق الكاش باك...', { id: 'cb' });
                            try {
                              const r = await fetch('/api/admin/update-order-status', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: selectedOrder.id, newStatus: 'delivered', forceCashback: true }),
                              });
                              const data = await r.json();
                              toast.dismiss('cb');
                              if (data.error) { toast.error('فشل: ' + data.error); }
                              else { toast.success('✅ تم تطبيق الكاش باك'); setSelectedOrder((p: any) => ({ ...p, cashback_amount: data.cashbackAmount })); }
                            } catch (e: any) { toast.dismiss('cb'); toast.error(e.message); }
                          }}
                          style={{ padding: '8px 18px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                          🎁 تطبيق الكاش باك
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      <div><label style={labelStyle}>اسم العميل</label><input value={editedName} onChange={e => setEditedName(e.target.value)} style={inputStyle} placeholder="الاسم الكامل" /></div>
                      <div><label style={labelStyle}>رقم الهاتف</label><input value={editedPhone} onChange={e => setEditedPhone(e.target.value)} style={inputStyle} placeholder="01xxxxxxxxx" /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      <div><label style={labelStyle}>المحافظة</label><input value={editedCity} onChange={e => setEditedCity(e.target.value)} style={inputStyle} placeholder="المحافظة" /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>العنوان</label><input value={editedAddress} onChange={e => setEditedAddress(e.target.value)} style={inputStyle} placeholder="العنوان التفصيلي" /></div>
                    </div>
                    <div>
                      <label style={labelStyle}>طريقة الدفع</label>
                      <select value={editedPaymentMethod} onChange={e => setEditedPaymentMethod(e.target.value)} style={{ ...inputStyle, appearance: 'none' as any, cursor: 'pointer' }}>
                        <option value="cash">كاش عند الاستلام</option><option value="vodafone_cash">فودافون كاش</option><option value="instapay">انستاباي</option><option value="bank_transfer">تحويل بنكي</option><option value="card_installments">بطاقة / تقسيط</option><option value="wallets">محفظة إلكترونية</option>
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
                  {(editMode ? editedItems : (enrichedItems.length > 0 && enrichedItems[0]?._orderId === selectedOrder?.id ? enrichedItems : selectedOrder.items))?.map((item: any, i: number) => (
                    <div key={i} style={productDetailCard}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={miniProductImgBox}><img src={item.image_url || item.image || 'https://via.placeholder.com/150'} alt="" style={miniProductImg} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ ...productName, fontSize: 'clamp(0.85rem, 2vw, 1rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{item.name}</span>
                            <span style={productPrice}>{(parseFloat(item.price) * item.quantity).toFixed(0)} ج.م</span>
                          </div>
                          <div style={extraDetailsGrid}>
                            {item.brand && <div style={detailTag}><Factory size={12} /> {item.brand}</div>}
                            {(item.car_make || item.car_model) && <div style={detailTag}><CarFront size={12} /> {[item.car_make, item.car_model, item.car_model_year].filter(Boolean).join(' ')}</div>}
                          </div>
                          {editMode && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
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
                        <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', marginTop: '12px', border: '1px solid #dcfce7' }}>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>🔍 بحث سريع باسم المنتج</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                                <input value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchFilteredProducts()} placeholder="اكتب اسم المنتج..." style={{ ...inputStyle, paddingRight: '38px', background: '#fff' }} />
                              </div>
                              <button onClick={fetchFilteredProducts} style={saveBtnStyle}><Search size={15} /> بحث</button>
                              {productSearchQuery && <button onClick={() => { setProductSearchQuery(''); setFilteredProducts([]); }} style={cancelBtnStyle}><X size={15} /></button>}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                            <div><label style={labelStyle}>ماركة القطعة</label><select style={inputStyle} value={addItemFilter.brand} onChange={e => setAddItemFilter(f => ({ ...f, brand: e.target.value }))}><option value="">{loadingBrands ? 'جاري التحميل...' : 'كل الماركات'}</option>{partBrands.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
                            <div><label style={labelStyle}>ماركة السيارة</label><select style={inputStyle} value={addItemFilter.car_make} onChange={e => { const val = e.target.value; setAddItemFilter(f => ({ ...f, car_make: val, car_model: '', car_year: '' })); fetchCarModels(val); }}><option value="">الكل</option>{carMakes.map((m: string) => <option key={m} value={m}>{m}</option>)}</select></div>
                            <div><label style={labelStyle}>موديل السيارة</label><select style={{ ...inputStyle, opacity: !addItemFilter.car_make ? 0.5 : 1 }} value={addItemFilter.car_model} disabled={!addItemFilter.car_make} onChange={e => { const val = e.target.value; setAddItemFilter(f => ({ ...f, car_model: val, car_year: '' })); fetchCarYears(addItemFilter.car_make, val); }}><option value="">{!addItemFilter.car_make ? 'اختر ماركة أولاً' : 'الكل'}</option>{carModels.map((m: string) => <option key={m} value={m}>{m}</option>)}</select></div>
                            <div><label style={labelStyle}>سنة السيارة</label><select style={{ ...inputStyle, opacity: !addItemFilter.car_model ? 0.5 : 1 }} value={addItemFilter.car_year} disabled={!addItemFilter.car_model} onChange={e => setAddItemFilter(f => ({ ...f, car_year: e.target.value }))}><option value="">{!addItemFilter.car_model ? 'اختر موديل أولاً' : 'الكل'}</option>{carYears.map((y: string) => <option key={y} value={y}>{y}</option>)}</select></div>
                          </div>
                          <button onClick={fetchFilteredProducts} style={{ ...saveBtnStyle, width: '100%', justifyContent: 'center', marginBottom: '14px' }}>{loadingProducts ? 'جاري البحث...' : 'بحث بالفلاتر'}</button>
                          <div style={{ display: 'grid', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                            {loadingProducts && <p style={{ color: '#27ae60', textAlign: 'center', padding: '20px' }}>جاري البحث...</p>}
                            {!loadingProducts && filteredProducts.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>ابحث باسم المنتج أو استخدم الفلاتر أعلاه</p>}
                            {filteredProducts.map((prod: any) => (
                              <div key={prod.id} style={searchProductRow}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <img src={prod.image_url || 'https://via.placeholder.com/50'} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #eee' }} alt="" />
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1a1a1a' }}>{prod.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{prod.brand}{prod.car_make ? ` • ${prod.car_make} ${prod.car_model}` : ''}</div>
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
                    <div style={{ background: '#fffbeb', borderRadius: '16px', padding: '16px', border: '1px solid #fef3c7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h4 style={{ margin: 0, color: '#92400e', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}><Tag size={16} /> تعديلات السعر</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                        <div><label style={labelStyle}>رسوم الشحن (ج.م)</label><input type="number" min={0} value={editedShipping} onChange={e => { setEditedShipping(parseFloat(e.target.value) || 0); setRemoveShipping(false); }} style={inputStyle} /></div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', width: '100%' }} onClick={() => setRemoveShipping(r => !r)}>
                            <input type="checkbox" checked={removeShipping} onChange={e => setRemoveShipping(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }} />
                            <span style={{ fontWeight: '700', color: '#555', fontSize: '0.85rem' }}>إلغاء الشحن بالكامل</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>الخصم</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select value={discount.type} onChange={e => setDiscount(d => ({ ...d, type: e.target.value as any }))} style={{ ...inputStyle, width: 'clamp(130px, 40%, 160px)' }}><option value="amount">خصم بمبلغ (ج.م)</option><option value="percent">خصم بنسبة (%)</option></select>
                          <input type="number" min={0} value={discount.value || ''} onChange={e => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))} placeholder={discount.type === 'percent' ? 'مثال: 10' : 'مثال: 50'} style={{ ...inputStyle, width: '100px' }} />
                          <span style={{ color: '#6b7280', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>{discount.type === 'percent' ? '%' : 'ج.م'}</span>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>رسوم إضافية</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <input type="number" min={0} value={extraFee.amount || ''} onChange={e => setExtraFee(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="المبلغ (ج.م)" style={{ ...inputStyle, width: 'clamp(100px, 35%, 130px)' }} />
                          <input value={extraFee.reason} onChange={e => setExtraFee(f => ({ ...f, reason: e.target.value }))} placeholder="سبب الرسوم الإضافية..." style={{ ...inputStyle, flex: 1, minWidth: '120px' }} />
                        </div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(() => {
                          const itemsTotal = editedItems.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0);
                          const discVal = discount.type === 'amount' ? discount.value : (itemsTotal * discount.value / 100);
                          const ship = removeShipping ? 0 : editedShipping;
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#666' }}><span>المنتجات</span><span>{itemsTotal.toLocaleString()} ج.م</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#666' }}><span>الشحن</span><span style={{ color: ship === 0 ? '#22c55e' : '#666' }}>{ship === 0 ? 'مجاني' : `${ship.toLocaleString()} ج.م`}</span></div>
                              {discVal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#16a34a' }}><span>الخصم</span><span>- {discVal.toFixed(0)} ج.م</span></div>}
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
              <OrderPriceManager order={selectedOrder} />
              <OrderCostManager order={selectedOrder} onSaved={(update) => setSelectedOrder((prev: any) => prev ? { ...prev, ...update } : prev)} />
              <div style={modalCard}>
                <h3 style={cardTitle}><CreditCard size={18} /> إثبات وتفاصيل الدفع</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: 'clamp(24px, 5vw, 40px) clamp(20px, 5vw, 36px)', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🗑️</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '10px', color: '#1a1a1a' }}>تأكيد الحذف</h3>
            <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '8px', lineHeight: 1.6 }}>هل أنت متأكد من حذف هذا الطلب نهائياً؟</p>
            <p style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.9rem', marginBottom: '28px' }}>لا يمكن التراجع عن هذا الإجراء</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => handleDelete(deleteConfirmId)} style={{ padding: '12px 28px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={16} /> نعم، احذف</button>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '12px 28px', backgroundColor: '#ffffff', color: '#555', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirm Modal */}
      {cancelConfirmOrderId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: 'clamp(24px, 5vw, 40px) clamp(20px, 5vw, 36px)', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🚫</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '10px', color: '#1a1a1a' }}>تأكيد إلغاء الطلب</h3>
            <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '20px', lineHeight: 1.6 }}>هل أنت متأكد من إلغاء هذا الطلب؟</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: banCodOnCancel ? '#f0fdf4' : '#f9fafb', border: banCodOnCancel ? '2px solid #16a34a' : '2px solid #e5e7eb', borderRadius: '14px', padding: '16px', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.15s', textAlign: 'right' }}>
              <input
                type="checkbox"
                checked={banCodOnCancel}
                onChange={(e) => setBanCodOnCancel(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#16a34a', flexShrink: 0, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1a1a1a', marginBottom: '2px' }}>منع العميل من الدفع عند الاستلام</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: '600' }}>لن يتمكن العميل من استخدام خيار الدفع عند الاستلام في طلباته القادمة</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: noWhatsappOnCancel ? '#f0fdf4' : '#f9fafb', border: noWhatsappOnCancel ? '2px solid #16a34a' : '2px solid #e5e7eb', borderRadius: '14px', padding: '16px', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.15s', textAlign: 'right' }}>
              <input
                type="checkbox"
                checked={noWhatsappOnCancel}
                onChange={(e) => setNoWhatsappOnCancel(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#16a34a', flexShrink: 0, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1a1a1a', marginBottom: '2px' }}>العميل ليس لديه واتساب</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: '600' }}>سيظهر السبب للعميل في صفحة طلباته مع إمكانية إدخال رقم واتساب جديد لإعادة تفعيل الطلب</div>
              </div>
            </label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={confirmCancelOrder} style={{ padding: '12px 28px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} /> نعم، إلغاء الطلب</button>
              <button onClick={() => { setCancelConfirmOrderId(null); setBanCodOnCancel(false); setNoWhatsappOnCancel(false); }} style={{ padding: '12px 28px', backgroundColor: '#ffffff', color: '#555', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const headerSection: any = { marginBottom: '30px' };
const mainTitle: any = { color: '#1a1a1a', fontSize: '2.2rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' };
const badgeCount: any = { background: '#27ae60', color: '#fff', padding: '4px 14px', borderRadius: '12px', fontSize: '1.1rem' };
const tableWrapper: any = { background: '#fff', borderRadius: '25px', border: '1px solid #eee', overflow: 'auto', maxWidth: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { background: '#fcfcfc', borderBottom: '1px solid #eee' };
const th: any = { padding: '10px 8px', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'bold', whiteSpace: 'nowrap' };
const tr: any = { borderBottom: '1px solid #f9f9f9', transition: '0.2s' };
const td: any = { padding: '10px 8px', fontSize: '0.82rem', color: '#d1d5db', verticalAlign: 'middle' };
const cityBadge: any = { display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#15803d', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', width: 'fit-content' };
const payTypeStyle: any = { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#555' };
// ── CHANGED: added pending_payment color to miniSelectStyle ──
const miniSelectStyle = (s: string): any => ({
  background: s === 'pending_payment' ? '#f5f3ff' : s === 'pending' ? '#fff7ed' : s === 'delivered' ? '#f0fdf4' : s === 'shipped' ? '#eff6ff' : s === 'cancelled' ? '#f0fdf4' : s === 'refunded' ? '#f5f3ff' : '#fef3c7',
  color: s === 'pending_payment' ? '#7c3aed' : s === 'pending' ? '#c2410c' : s === 'delivered' ? '#15803d' : s === 'shipped' ? '#1e40af' : s === 'cancelled' ? '#16a34a' : s === 'refunded' ? '#6d28d9' : '#ca8a04',
  border: `1px solid ${s === 'pending_payment' ? '#ddd6fe' : s === 'pending' ? '#ffedd5' : s === 'delivered' ? '#dcfce7' : s === 'shipped' ? '#dbeafe' : s === 'cancelled' ? '#dcfce7' : s === 'refunded' ? '#ddd6fe' : '#fef3c7'}`,
  padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem', fontWeight: 'bold'
});
const iconBtn: any = { background: '#f8f9fa', border: '1px solid #eee', color: '#555', padding: '9px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const invoiceRowBtn: any = { background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: 'none', color: '#22c55e', padding: '9px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const delBtn: any = { background: '#fff5f5', border: '1px solid #ffebeb', color: '#e74c3c', padding: '9px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const modalOverlay: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'clamp(8px, 3vw, 20px)', backdropFilter: 'blur(4px)' };
const modalContent: any = { background: '#fff', width: '100%', maxHeight: '95vh', overflowY: 'auto', borderRadius: 'clamp(16px, 4vw, 35px)', padding: 'clamp(16px, 4vw, 35px)', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' };
const modalHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' };
const closeBtn: any = { background: '#f8f9fa', border: 'none', color: '#9ca3af', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const modalBody: any = { display: 'flex', flexDirection: 'column', gap: '20px' };
const modalCard: any = { background: '#fcfcfc', padding: 'clamp(14px, 3vw, 25px)', borderRadius: '20px', border: '1px solid #f0f0f0' };
const cardTitle: any = { fontSize: '1.1rem', color: '#1a1a1a', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' };
const itemsContainer: any = { display: 'grid', gap: '12px' };
const productDetailCard: any = { background: '#fff', padding: '12px', borderRadius: '16px', border: '1px solid #eee' };
const miniProductImgBox: any = { width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #eee', flexShrink: 0 };
const miniProductImg: any = { width: '100%', height: '100%', objectFit: 'contain' };
const productName: any = { color: '#1a1a1a', fontWeight: '800', fontSize: '1rem' };
const productPrice: any = { color: '#15803d', fontWeight: '900', fontSize: '1.05rem' };
const extraDetailsGrid: any = { display: 'flex', flexWrap: 'wrap', gap: '8px' };
const detailTag: any = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#666', background: '#f8f9fa', padding: '4px 8px', borderRadius: '7px', border: '1px solid #eee' };
const modalTotalRow: any = { display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontWeight: '900', borderTop: '2px dashed #eee', paddingTop: '16px', color: '#1a1a1a', fontSize: '1.1rem', flexWrap: 'wrap', gap: '8px' };
const imagePreviewBox: any = { marginTop: '15px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #eee', maxHeight: '400px', background: '#f8f9fa' };
const fullImg: any = { width: '100%', display: 'block', objectFit: 'contain' };
const viewLink: any = { color: '#27ae60', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' };
const loaderStyle: any = { color: '#15803d', textAlign: 'center', padding: '100px 20px', fontWeight: '900', fontSize: 'clamp(1rem, 4vw, 1.5rem)', direction: 'rtl' };
const labelStyle: any = { fontSize: '0.8rem', fontWeight: '700', color: '#666', display: 'block', marginBottom: '5px' };
const inputStyle: any = { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '9px 13px', fontSize: '0.9rem', color: '#1a1a1a', width: '100%', outline: 'none', boxSizing: 'border-box' as any };
const editBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', whiteSpace: 'nowrap' };
const saveBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', whiteSpace: 'nowrap' };
const cancelBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#f8f9fa', color: '#666', border: '1px solid #eee', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', whiteSpace: 'nowrap' };
const qtyBtn: any = { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#f8f9fa', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const removeItemBtn: any = { display: 'flex', alignItems: 'center', gap: '5px', background: '#fff5f5', color: '#e74c3c', border: '1px solid #ffebeb', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap' };
const addItemBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', color: '#15803d', border: '2px dashed #86efac', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', width: '100%', justifyContent: 'center' };
const addrBtnStyle: any = { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', textAlign: 'right', fontSize: '0.85rem', color: '#6b7280', width: '100%' };
const searchProductRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 12px', borderRadius: '12px', border: '1px solid #eee', flexWrap: 'wrap', gap: '8px' };

export function CustomerTrackingBanner({ order }: { order: { tracking_number?: string | null; status?: string } }) {
  if (!order?.tracking_number) return null;
  const trackingUrl = buildTrackingUrl(order.tracking_number);
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '1.5px solid #86efac',
      borderRadius: '18px',
      padding: '20px 24px',
      direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', background: '#22c55e', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Truck size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: '900', fontSize: '1rem', color: '#15803d' }}>شحنتك في الطريق إليك!</div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '2px' }}>تم شحن طلبك عبر البريد المصري</div>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9ca3af', marginBottom: '4px', letterSpacing: '0.5px' }}>رقم تتبع الشحنة</div>
          <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#1a1a1a', fontFamily: 'monospace', letterSpacing: '1.5px' }}>{order.tracking_number}</div>
        </div>
        <a
          href={trackingUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '12px',
            padding: '11px 20px',
            fontWeight: '800',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
            whiteSpace: 'nowrap',
          }}>
          <ExternalLink size={16} />
          تتبع شحنتي على البريد المصري
        </a>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <CheckCircle size={13} color="#22c55e" />
        سيتم توصيل طلبك خلال 3-7 أيام عمل من تاريخ الشحن
      </div>
    </div>
  );
}