'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Trash2, User, Phone, MapPin,
  ShoppingCart, CheckCircle, ChevronDown, X,
  Package, Car, Tag, Layers, AlertCircle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  brand: string;
  regular_price: number;
  sale_price: number;
  image_url: string;
  car_make: string;
  car_model: string;
  car_model_year: string;
  category: string;
  subcategory: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  brand: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string;
}

// ── Dropdown Component ─────────────────────────────────────────────────────
function Dropdown({ label, options, value, onChange, disabled, placeholder }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        style={{
          ...inputStyle,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          color: value ? '#1a1a1a' : '#999',
        }}
      >
        <span>{value || placeholder || `اختر ${label}`}</span>
        <ChevronDown size={16} color="#999" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>
      {open && options.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto', marginTop: '4px',
        }}>
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            style={dropdownItemStyle}
          >
            <span style={{ color: '#999' }}>— بدون تحديد —</span>
          </div>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ ...dropdownItemStyle, backgroundColor: value === opt ? '#f0fdf4' : '#fff', fontWeight: value === opt ? '800' : '600', color: value === opt ? '#16a34a' : '#1a1a1a' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminCreateOrder() {
  const router = useRouter();

  // Product search & filters
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter options
  const [makesOptions, setMakesOptions] = useState<string[]>([]);
  const [modelsOptions, setModelsOptions] = useState<string[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<string[]>([]);
  const [subcategoriesOptions, setSubcategoriesOptions] = useState<string[]>([]);

  // Selected filters
  const [filterMake, setFilterMake] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');

  // Order items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Customer info
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  // Manual customer fields (if user not found)
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Shipping
  const [shippingCost, setShippingCost] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  // ── Init: load filter options ────────────────────────────────────────────
  useEffect(() => {
    loadFilterOptions();

    // Close dropdowns on outside click
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load models when make changes
  useEffect(() => {
    setFilterModel('');
    setModelsOptions([]);
    if (filterMake) loadModels(filterMake);
  }, [filterMake]);

  // Load subcategories when category changes
  useEffect(() => {
    setFilterSubcategory('');
    setSubcategoriesOptions([]);
    if (filterCategory) loadSubcategories(filterCategory);
  }, [filterCategory]);

  // Search products when query or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (productSearch.trim().length >= 1 || filterMake || filterCategory) {
        searchProducts();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, filterMake, filterModel, filterYear, filterCategory, filterSubcategory]);

  async function loadFilterOptions() {
    const { data } = await supabase.from('products').select('car_make, category').not('car_make', 'is', null);
    if (data) {
      const makes = Array.from(new Set(data.map(p => p.car_make?.trim()).filter(Boolean))).sort() as string[];
      const cats = Array.from(new Set(data.map(p => p.category?.trim()).filter(Boolean))).sort() as string[];
      setMakesOptions(makes);
      setCategoriesOptions(cats);
    }
  }

  async function loadModels(make: string) {
    const { data } = await supabase.from('products').select('car_model').ilike('car_make', make);
    if (data) {
      const models = Array.from(new Set(data.map(p => p.car_model?.trim()).filter(Boolean))).sort() as string[];
      setModelsOptions(models);
    }
  }

  async function loadSubcategories(category: string) {
    const { data } = await supabase.from('products').select('subcategory').ilike('category', category);
    if (data) {
      const subs = Array.from(new Set(data.map(p => p.subcategory?.trim()).filter(Boolean))).sort() as string[];
      setSubcategoriesOptions(subs);
    }
  }

  async function searchProducts() {
    setSearching(true);
    try {
      let query = supabase.from('products').select('*').limit(20);

      if (productSearch.trim()) query = query.ilike('name', `%${productSearch.trim()}%`);
      if (filterMake) query = query.ilike('car_make', filterMake);
      if (filterModel) query = query.ilike('car_model', filterModel);
      if (filterCategory) query = query.ilike('category', filterCategory);
      if (filterSubcategory) query = query.ilike('subcategory', filterSubcategory);
      if (filterYear) {
        query = query.or(`car_model_year.ilike.%${filterYear}%,car_model_year.is.null`);
      }

      const { data } = await query;
      setSearchResults(data || []);
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  }

  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.trim().length < 2) { setCustomerResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number')
      .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%`)
      .limit(8);
    setCustomerResults(data || []);
    setShowCustomerResults(true);
  }

  function addProduct(p: Product) {
    const price = p.sale_price > 0 ? p.sale_price : p.regular_price;
    const exists = orderItems.find(i => i.id === p.id);
    if (exists) {
      setOrderItems(prev => prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setOrderItems(prev => [...prev, { id: p.id, name: p.name, price, quantity: 1, image_url: p.image_url, brand: p.brand }]);
    }
    setShowResults(false);
    setProductSearch('');
    toast.success(`تمت إضافة "${p.name}"`);
  }

  function updateQty(id: string, qty: number) {
    if (qty < 1) return;
    setOrderItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  }

  function removeItem(id: string) {
    setOrderItems(prev => prev.filter(i => i.id !== id));
  }

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + shippingCost - discount;

  async function submitOrder() {
    if (orderItems.length === 0) { toast.error('أضف منتجاً على الأقل'); return; }

    const customerName = selectedUser?.full_name || manualName;
    const customerPhone = selectedUser?.phone_number || manualPhone;

    if (!customerName || !customerPhone) { toast.error('أدخل اسم العميل ورقم هاتفه'); return; }
    if (!manualAddress && !selectedUser) { toast.error('أدخل عنوان التوصيل'); return; }

    setSubmitting(true);
    try {
      const orderData: any = {
        user_id: selectedUser?.id || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: manualAddress,
        city: manualCity,
        items: orderItems.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url })),
        total_price: total,
        shipping_cost: shippingCost,
        discount_applied: discount,
        payment_method: paymentMethod,
        status: 'processing',
        created_at: new Date().toISOString(),
      };

      if (notes) orderData.notes = notes;

      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      toast.success('تم إنشاء الطلب بنجاح ✅');
      router.push('/admin/orders');
    } catch (err: any) {
      toast.error('خطأ في إنشاء الطلب: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '30px 20px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1a1a1a', margin: 0 }}>إنشاء طلب يدوي</h1>
          <p style={{ color: '#888', marginTop: '6px', fontSize: '0.9rem' }}>ابحث عن منتجات وأضفها لطلب جديد لأي عميل</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'flex-start' }}>

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Product Search Card */}
            <div style={cardStyle}>
              <h2 style={cardTitleStyle}><Package size={20} color="#22c55e" /> البحث عن منتجات</h2>

              {/* Filters Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <Dropdown label="الماركة" options={makesOptions} value={filterMake} onChange={setFilterMake} />
                <Dropdown label="الموديل" options={modelsOptions} value={filterModel} onChange={setFilterModel} disabled={!filterMake} />
                <div>
                  <label style={labelStyle}>سنة الصنع</label>
                  <input
                    type="text" placeholder="مثال: 2020" value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <Dropdown label="الفئة" options={categoriesOptions} value={filterCategory} onChange={setFilterCategory} />
                <Dropdown label="القسم الفرعي" options={subcategoriesOptions} value={filterSubcategory} onChange={setFilterSubcategory} disabled={!filterCategory} />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => { setFilterMake(''); setFilterModel(''); setFilterYear(''); setFilterCategory(''); setFilterSubcategory(''); }}
                    style={{ ...btnStyle, backgroundColor: '#fee', color: '#dc2626', width: '100%' }}
                  >
                    <X size={14} /> مسح الفلاتر
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div ref={searchRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={18} color="#999" style={{ position: 'absolute', right: '14px', top: '14px' }} />
                  {searching && <Loader2 size={16} color="#22c55e" style={{ position: 'absolute', left: '14px', top: '14px', animation: 'spin 1s linear infinite' }} />}
                  <input
                    type="text"
                    placeholder="ابحث باسم المنتج..."
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowResults(true); }}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    style={{ ...inputStyle, paddingRight: '44px', paddingLeft: '44px', fontSize: '1rem' }}
                  />
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '380px', overflowY: 'auto', marginTop: '6px',
                  }}>
                    {searchResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => addProduct(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', transition: '0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                      >
                        <img src={p.image_url || '/placeholder.png'} alt={p.name} style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '8px', background: '#f9f9f9', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#22c55e', fontWeight: '700' }}>{p.brand}</span>
                            {p.car_make && <span>{p.car_make} {p.car_model}</span>}
                            {p.category && <span style={{ color: '#666' }}>{p.category}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <div style={{ fontWeight: '900', fontSize: '1rem', color: '#1a1a1a' }}>
                            {(p.sale_price > 0 ? p.sale_price : p.regular_price).toLocaleString()} ج.م
                          </div>
                          {p.sale_price > 0 && <div style={{ fontSize: '0.72rem', color: '#bbb', textDecoration: 'line-through' }}>{p.regular_price.toLocaleString()}</div>}
                        </div>
                        <div style={{ backgroundColor: '#22c55e', color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0 }}>
                          + إضافة
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showResults && searchResults.length === 0 && productSearch.length >= 1 && !searching && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '24px', textAlign: 'center', marginTop: '6px', color: '#888', fontSize: '0.9rem' }}>
                    لا توجد نتائج
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            {orderItems.length > 0 && (
              <div style={cardStyle}>
                <h2 style={cardTitleStyle}><ShoppingCart size={20} color="#22c55e" /> منتجات الطلب ({orderItems.length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {orderItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                      <img src={item.image_url || '/placeholder.png'} alt={item.name} style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '8px', background: '#fff', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '2px' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '700' }}>{item.brand}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} style={qtyBtnStyle}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '1rem', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} style={qtyBtnStyle}>+</button>
                      </div>
                      <div style={{ fontWeight: '900', minWidth: '90px', textAlign: 'left' }}>
                        {(item.price * item.quantity).toLocaleString()} ج.م
                      </div>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Info */}
            <div style={cardStyle}>
              <h2 style={cardTitleStyle}><User size={20} color="#22c55e" /> بيانات العميل</h2>

              {/* Customer Search */}
              <div ref={customerRef} style={{ position: 'relative', marginBottom: '16px' }}>
                <label style={labelStyle}>ابحث عن عميل موجود (بالاسم أو رقم الهاتف)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#999" style={{ position: 'absolute', right: '12px', top: '14px' }} />
                  <input
                    type="text"
                    placeholder="اكتب اسم العميل أو رقم هاتفه..."
                    value={selectedUser ? `${selectedUser.full_name} — ${selectedUser.phone_number}` : customerSearch}
                    onChange={e => { setSelectedUser(null); searchCustomers(e.target.value); }}
                    style={{ ...inputStyle, paddingRight: '40px' }}
                  />
                  {selectedUser && (
                    <button onClick={() => { setSelectedUser(null); setCustomerSearch(''); }} style={{ position: 'absolute', left: '10px', top: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={16} color="#999" />
                    </button>
                  )}
                </div>

                {showCustomerResults && customerResults.length > 0 && !selectedUser && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '4px' }}>
                    {customerResults.map(u => (
                      <div
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setManualName(u.full_name); setManualPhone(u.phone_number); setShowCustomerResults(false); }}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={16} color="#16a34a" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>{u.phone_number}</div>
                        </div>
                        <CheckCircle size={16} color="#22c55e" style={{ marginRight: 'auto' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <span style={{ fontWeight: '700', color: '#15803d', fontSize: '0.9rem' }}>
                    تم اختيار: {selectedUser.full_name} ({selectedUser.phone_number})
                  </span>
                </div>
              )}

              {/* Manual Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}><User size={13} /> اسم العميل *</label>
                  <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="الاسم الكامل" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}><Phone size={13} /> رقم الهاتف *</label>
                  <input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="01xxxxxxxxx" style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}><MapPin size={13} /> العنوان *</label>
                  <input value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="العنوان بالتفصيل" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>المدينة</label>
                  <input value={manualCity} onChange={e => setManualCity(e.target.value)} placeholder="مثال: القاهرة" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>طريقة الدفع</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="cash">كاش عند الاستلام</option>
                    <option value="vodafone_cash">فودافون كاش</option>
                    value="instapay"<option value="instapay">انستاباي</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="credit_card">بطاقة ائتمان</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>ملاحظات</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي تعليمات خاصة بالطلب..." rows={2} style={{ ...inputStyle, resize: 'vertical', height: 'auto', paddingTop: '10px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Order Summary ──────────────────────── */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={cardStyle}>
              <h2 style={cardTitleStyle}><Tag size={20} color="#22c55e" /> ملخص الطلب</h2>

              {orderItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#bbb' }}>
                  <ShoppingCart size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.9rem' }}>لم تُضف منتجات بعد</p>
                </div>
              ) : (
                <>
                  {orderItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name} ×{item.quantity}</span>
                      <span style={{ fontWeight: '800', flexShrink: 0, marginRight: '8px' }}>{(item.price * item.quantity).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666' }}>
                      <span>المجموع الفرعي</span>
                      <span>{subtotal.toLocaleString()} ج.م</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <label style={{ color: '#666' }}>الشحن (ج.م)</label>
                      <input
                        type="number" min={0} value={shippingCost}
                        onChange={e => setShippingCost(Number(e.target.value))}
                        style={{ width: '90px', height: '34px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '700' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <label style={{ color: '#666' }}>خصم (ج.م)</label>
                      <input
                        type="number" min={0} value={discount}
                        onChange={e => setDiscount(Number(e.target.value))}
                        style={{ width: '90px', height: '34px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '700' }}
                      />
                    </div>
                    <div style={{ borderTop: '2px solid #22c55e', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '900', fontSize: '1rem' }}>الإجمالي</span>
                      <span style={{ fontWeight: '900', fontSize: '1.3rem', color: '#22c55e' }}>{total.toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={submitOrder}
                disabled={submitting || orderItems.length === 0}
                style={{
                  width: '100%', marginTop: '20px', padding: '14px',
                  backgroundColor: orderItems.length === 0 ? '#ccc' : '#22c55e',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  fontWeight: '900', fontSize: '1rem', cursor: orderItems.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s',
                }}
              >
                {submitting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={20} />}
                {submitting ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
              </button>

              {orderItems.length > 0 && (
                <div style={{ marginTop: '10px', backgroundColor: '#f0f9ff', borderRadius: '10px', padding: '10px', fontSize: '0.75rem', color: '#0369a1', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>سيتم إنشاء الطلب بحالة "قيد المعالجة" ويمكن تعديلها لاحقاً</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #22c55e !important; outline: none; box-shadow: 0 0 0 3px rgba(34,197,94,0.1); }
        button:hover { opacity: 0.9; }
      `}} />
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const cardStyle: any = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  border: '1px solid #f0f0f0',
};

const cardTitleStyle: any = {
  fontSize: '1.1rem',
  fontWeight: '900',
  color: '#1a1a1a',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const labelStyle: any = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  marginBottom: '6px',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#555',
};

const inputStyle: any = {
  width: '100%',
  height: '46px',
  padding: '0 14px',
  backgroundColor: '#fff',
  border: '1px solid #e5e5e5',
  borderRadius: '10px',
  fontSize: '0.9rem',
  color: '#1a1a1a',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const btnStyle: any = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '700',
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
};

const qtyBtnStyle: any = {
  width: '30px',
  height: '30px',
  borderRadius: '8px',
  border: '1px solid #e5e5e5',
  backgroundColor: '#f9f9f9',
  fontWeight: '900',
  fontSize: '1.1rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dropdownItemStyle: any = {
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: '0.88rem',
  fontWeight: '600',
  borderBottom: '1px solid #f9f9f9',
  transition: '0.15s',
};