'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Phone, MapPin, ShoppingCart, Trash2, CreditCard, Banknote,
  Image as ImageIcon, ExternalLink, Eye, X, User, Hash,
  CarFront, Factory, Smartphone, Plus, Edit2, Save, Tag,
  Truck, AlertCircle, RefreshCw, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [editedAddress, setEditedAddress] = useState('');
  const [editedCity, setEditedCity] = useState('');
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
  const [addItemFilter, setAddItemFilter] = useState({
    brand: '', car_make: '', car_model: '', car_year: ''
  });
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const paymentLabels: any = {
    'card_installments': 'بطاقة / تقسيط',
    'instapay': 'انستا باي',
    'wallets': 'محفظة إلكترونية'
  };

  // ===================== FUNCTIONS FIRST =====================

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setOrders(data);
    } catch (err: any) {
      toast.error('خطأ في جلب الطلبات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPartBrands() {
    setLoadingBrands(true);
    try {
      const { data, error } = await supabase.from('part_brands').select('*').order('name');
      if (error) { toast.error('فشل تحميل ماركات القطع: ' + error.message); return; }
      setPartBrands(data || []);
    } finally {
      setLoadingBrands(false);
    }
  }

  async function fetchCarMakes() {
    const { data, error } = await supabase
      .from('products').select('car_make').not('car_make', 'is', null).neq('car_make', '');
    if (error) { console.error('fetchCarMakes error:', error); return; }
    if (data) {
      const unique = [...new Set(data.map((d: any) => d.car_make).filter(Boolean))].sort();
      setCarMakes(unique);
    }
  }

  async function fetchCarModels(make: string) {
    setCarModels([]);
    setCarYears([]);
    if (!make) return;
    const { data, error } = await supabase
      .from('products').select('car_model').eq('car_make', make)
      .not('car_model', 'is', null).neq('car_model', '');
    if (error) { console.error('fetchCarModels error:', error); return; }
    if (data) {
      const unique = [...new Set(data.map((d: any) => d.car_model).filter(Boolean))].sort();
      setCarModels(unique);
    }
  }

  async function fetchCarYears(make: string, model: string) {
    setCarYears([]);
    if (!make || !model) return;
    const { data, error } = await supabase
      .from('products').select('car_year').eq('car_make', make).eq('car_model', model)
      .not('car_year', 'is', null).neq('car_year', '');
    if (error) { console.error('fetchCarYears error:', error); return; }
    if (data) {
      const unique = [...new Set(data.map((d: any) => d.car_year).filter(Boolean))].sort();
      setCarYears(unique);
    }
  }

  async function fetchFilteredProducts() {
    setLoadingProducts(true);
    setFilteredProducts([]);
    try {
      let query = supabase.from('products').select('*');
      // Text search by name takes priority
      if (productSearchQuery.trim()) {
        query = query.ilike('name', `%${productSearchQuery.trim()}%`);
      } else {
        if (addItemFilter.brand) query = query.eq('brand', addItemFilter.brand);
        if (addItemFilter.car_make) query = query.eq('car_make', addItemFilter.car_make);
        if (addItemFilter.car_model) query = query.eq('car_model', addItemFilter.car_model);
        if (addItemFilter.car_year) query = query.eq('car_year', addItemFilter.car_year);
      }
      const { data, error } = await query.limit(50);
      if (error) { toast.error('فشل البحث: ' + error.message); return; }
      setFilteredProducts(data || []);
      if (!data || data.length === 0) toast('لا توجد منتجات بهذه الفلاتر', { icon: '🔍' });
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchCustomerAddresses(phone: string) {
    const { data } = await supabase.from('addresses').select('*').eq('phone', phone);
    if (data) setCustomerAddresses(data);
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const orderToUpdate = orders.find(o => o.id === orderId);
      const { error: orderError } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (orderError) throw orderError;
      if (newStatus === 'delivered' && orderToUpdate?.status !== 'delivered') {
        const deliveryDate = new Date().toISOString();
        const releaseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { error: commError } = await supabase.from('affiliate_commissions')
          .update({ delivery_date: deliveryDate, release_date: releaseDate }).eq('order_id', orderId);
        if (!commError) toast.success('تم تحديث حالة الطلب - سيتم إصدار العمولة بعد 14 يوم! ✅');
      } else {
        toast.success('تم تحديث حالة الطلب');
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      toast.error('فشل التحديث');
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    try {
      const { error, count } = await supabase.from('orders').delete({ count: 'exact' }).eq('id', orderId);
      if (error) throw error;
      if (count === 0) { toast.error('لم يتم الحذف — تحقق من صلاحيات RLS في Supabase'); return; }
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      toast.success('تم حذف الطلب ✅');
    } catch (err: any) {
      toast.error('فشل الحذف: ' + err.message);
    }
  }

  async function saveOrderEdits() {
    try {
      const origShipping = selectedOrder.shipping_fee || 0;
      const newTotal = calcTotal(editedItems, discount, extraFee, removeShipping, origShipping);
      const discAmount = discount.type === 'amount' ? discount.value :
        (editedItems.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0) * discount.value / 100);
      const updatePayload: any = {
        items: editedItems,
        customer_address: editedAddress,
        city: editedCity,
        total_price: newTotal.toFixed(2),
        discount_amount: discAmount,
        extra_fee: extraFee.amount,
        extra_fee_reason: extraFee.reason,
        shipping_removed: removeShipping,
      };
      const { error } = await supabase.from('orders').update(updatePayload).eq('id', selectedOrder.id);
      if (error) throw error;
      const updated = { ...selectedOrder, ...updatePayload };
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setEditMode(false);
      toast.success('تم حفظ التعديلات ✅');
    } catch (err: any) {
      toast.error('فشل الحفظ: ' + err.message);
    }
  }

  // ===================== useEffect AFTER functions =====================
  useEffect(() => {
    fetchOrders();
    fetchPartBrands();
    fetchCarMakes();
    const channel = supabase
      .channel('orders-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => [payload.new, ...prev]);
        toast.success('وصل طلب جديد الآن! 🛍️', { duration: 5000, position: 'top-center' });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function openEditMode(order: any) {
    setEditedItems(order.items ? JSON.parse(JSON.stringify(order.items)) : []);
    setEditedAddress(order.customer_address || '');
    setEditedCity(order.city || '');
    setDiscount({ type: 'amount', value: order.discount_amount || 0 });
    setExtraFee({ amount: order.extra_fee || 0, reason: order.extra_fee_reason || '' });
    setRemoveShipping(order.shipping_removed || false);
    setShowAddItem(false);
    setFilteredProducts([]);
    setProductSearchQuery('');
    setAddItemFilter({ brand: '', car_make: '', car_model: '', car_year: '' });
    fetchCustomerAddresses(order.customer_phone);
    setEditMode(true);
  }

  function calcTotal(items: any[], disc: any, extra: any, noShipping: boolean, origShipping: number) {
    const itemsTotal = items.reduce((sum: number, i: any) => sum + parseFloat(i.price) * i.quantity, 0);
    let discValue = 0;
    if (disc.type === 'amount') discValue = disc.value;
    else if (disc.type === 'percent') discValue = (itemsTotal * disc.value) / 100;
    const shipping = noShipping ? 0 : (origShipping || 0);
    return Math.max(0, itemsTotal - discValue + extra.amount + shipping);
  }

  function updateItemQuantity(index: number, qty: number) {
    if (qty < 1) return;
    setEditedItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  }

  function removeItem(index: number) {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
  }

  function addProductToOrder(product: any) {
    const exists = editedItems.findIndex(i => i.id === product.id);
    if (exists >= 0) {
      updateItemQuantity(exists, editedItems[exists].quantity + 1);
    } else {
      setEditedItems(prev => [...prev, {
        id: product.id, name: product.name, price: product.price,
        quantity: 1, image_url: product.image_url, brand: product.brand,
        car_make: product.car_make, car_model: product.car_model,
      }]);
    }
    toast.success('تمت إضافة المنتج ✅');
  }

  if (loading) return <div style={loaderStyle}>جاري تحميل الطلبات...</div>;

  const origShipping = selectedOrder?.shipping_fee || 0;
  const liveTotal = editMode ? calcTotal(editedItems, discount, extraFee, removeShipping, origShipping) : 0;

  return (
    <div style={{ padding: '30px', direction: 'rtl', maxWidth: '1400px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={headerSection}>
        <h1 style={mainTitle}>📦 إدارة الطلبات <span style={badgeCount}>{orders.length}</span></h1>
        <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '5px' }}>متابعة عمليات البيع وحالة الشحن لـ "زيت أند فلترز"</p>
      </div>

      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr style={thRow}>
              <th style={th}>العميل</th>
              <th style={th}>المحافظة</th>
              <th style={th}>طريقة الدفع</th>
              <th style={th}>الحالة</th>
              <th style={th}>التاريخ</th>
              <th style={th}>الإجمالي</th>
              <th style={th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={tr}>
                <td style={td}>
                  <div style={{ fontWeight: '800', color: '#1a1a1a' }}>{order.customer_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} /> {order.customer_phone}
                  </div>
                </td>
                <td style={td}>
                  <div style={cityBadge}><MapPin size={14} color="#15803d" /> {order.city || 'غير محدد'}</div>
                </td>
                <td style={td}>
                  <div style={payTypeStyle}>
                    {order.payment_method === 'instapay' ? <Banknote size={16} color="#9b59b6" /> :
                     order.payment_method === 'wallets' ? <Smartphone size={16} color="#e74c3c" /> :
                     <CreditCard size={16} color="#3498db" />}
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
                <td style={td}><div style={{ fontSize: '0.85rem', color: '#666' }}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</div></td>
                <td style={td}><span style={{ color: '#15803d', fontWeight: '900', fontSize: '1rem' }}>{order.total_price} <small>ج.م</small></span></td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setSelectedOrder(order); setEditMode(false); }} style={iconBtn}><Eye size={16} /></button>
                    <button onClick={() => deleteOrder(order.id)} style={delBtn}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: editMode ? '900px' : '750px' }}>
            <div style={modalHeader}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#1a1a1a' }}>
                <Hash size={24} color="#27ae60" />
                {editMode ? 'تعديل الطلب' : 'تفاصيل الطلب'}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!editMode ? (
                  <button onClick={() => openEditMode(selectedOrder)} style={editBtnStyle}>
                    <Edit2 size={16} /> تعديل
                  </button>
                ) : (
                  <>
                    <button onClick={saveOrderEdits} style={saveBtnStyle}><Save size={16} /> حفظ التعديلات</button>
                    <button onClick={() => setEditMode(false)} style={cancelBtnStyle}><X size={16} /> إلغاء</button>
                  </>
                )}
                <button onClick={() => { setSelectedOrder(null); setEditMode(false); }} style={closeBtn}><X size={24} /></button>
              </div>
            </div>

            <div style={modalBody}>

              {/* ADDRESS CARD */}
              <div style={modalCard}>
                <h3 style={cardTitle}><User size={18}/> بيانات العميل والتوصيل</h3>
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
                    <div style={modalGrid}>
                      <p><strong>الاسم:</strong> {selectedOrder.customer_name}</p>
                      <p><strong>الموبايل:</strong> {selectedOrder.customer_phone}</p>
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
                    {customerAddresses.length > 0 && (
                      <div>
                        <label style={labelStyle}>أو اختر من عناوين العميل المحفوظة</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                          {customerAddresses.map((addr: any, i: number) => (
                            <button key={i}
                              onClick={() => { setEditedAddress(addr.address); setEditedCity(addr.city); }}
                              style={{ ...addrBtnStyle, border: editedAddress === addr.address ? '2px solid #27ae60' : '1px solid #eee' }}>
                              <MapPin size={14} color="#27ae60" />
                              <span><strong>{addr.city}</strong> — {addr.address}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ITEMS CARD */}
              <div style={modalCard}>
                <h3 style={cardTitle}><ShoppingCart size={18}/> المنتجات المطلوبة</h3>
                <div style={itemsContainer}>
                  {(editMode ? editedItems : selectedOrder.items)?.map((item: any, i: number) => (
                    <div key={i} style={productDetailCard}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={miniProductImgBox}>
                          <img src={item.image_url || item.image || 'https://via.placeholder.com/150'} alt="" style={miniProductImg} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={productMainInfo}>
                            <span style={productName}>{item.name}</span>
                            <span style={productPrice}>{(parseFloat(item.price) * item.quantity).toFixed(0)} ج.م</span>
                          </div>
                          <div style={extraDetailsGrid}>
                            {item.brand && <div style={detailTag}><Factory size={12}/> {item.brand}</div>}
                            {(item.car_make || item.car_model) && <div style={detailTag}><CarFront size={12}/> {item.car_make} {item.car_model}</div>}
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

                  {/* ADD ITEM */}
                  {editMode && (
                    <div>
                      <button onClick={() => setShowAddItem(!showAddItem)} style={addItemBtnStyle}>
                        <Plus size={16} /> {showAddItem ? 'إخفاء البحث' : 'إضافة منتج'}
                      </button>

                      {showAddItem && (
                        <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '20px', marginTop: '12px', border: '1px solid #dcfce7' }}>

                          {/* ====== SEARCH BAR ====== */}
                          <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>🔍 بحث سريع باسم المنتج</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
                                <input
                                  value={productSearchQuery}
                                  onChange={e => setProductSearchQuery(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && fetchFilteredProducts()}
                                  placeholder="اكتب اسم المنتج... مثال: زيت موبيل"
                                  style={{ ...inputStyle, paddingRight: '38px', background: '#fff' }}
                                />
                              </div>
                              <button onClick={fetchFilteredProducts} style={saveBtnStyle}>
                                <Search size={15} /> بحث
                              </button>
                              {productSearchQuery && (
                                <button onClick={() => { setProductSearchQuery(''); setFilteredProducts([]); }} style={cancelBtnStyle}>
                                  <X size={15} />
                                </button>
                              )}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#888', margin: '5px 0 0' }}>
                              أو استخدم الفلاتر أدناه للبحث بماركة القطعة أو السيارة
                            </p>
                          </div>

                          {/* DIVIDER */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ flex: 1, height: '1px', background: '#d1fae5' }} />
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>أو فلتر بالتصنيف</span>
                            <div style={{ flex: 1, height: '1px', background: '#d1fae5' }} />
                          </div>

                          {/* FILTER GRID */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                            <div>
                              <label style={labelStyle}>
                                ماركة القطعة {loadingBrands && <span style={{ color: '#999' }}>جاري التحميل...</span>}
                              </label>
                              <select style={inputStyle} value={addItemFilter.brand}
                                onChange={e => setAddItemFilter(f => ({ ...f, brand: e.target.value }))}>
                                <option value="">{loadingBrands ? 'جاري التحميل...' : 'كل الماركات'}</option>
                                {partBrands.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>ماركة السيارة</label>
                              <select style={inputStyle} value={addItemFilter.car_make}
                                onChange={e => {
                                  const val = e.target.value;
                                  setAddItemFilter(f => ({ ...f, car_make: val, car_model: '', car_year: '' }));
                                  fetchCarModels(val);
                                }}>
                                <option value="">الكل</option>
                                {carMakes.map((m: string) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>موديل السيارة</label>
                              <select
                                style={{ ...inputStyle, opacity: !addItemFilter.car_make ? 0.5 : 1 }}
                                value={addItemFilter.car_model}
                                disabled={!addItemFilter.car_make}
                                onChange={e => {
                                  const val = e.target.value;
                                  setAddItemFilter(f => ({ ...f, car_model: val, car_year: '' }));
                                  fetchCarYears(addItemFilter.car_make, val);
                                }}>
                                <option value="">{!addItemFilter.car_make ? 'اختر ماركة أولاً' : 'الكل'}</option>
                                {carModels.map((m: string) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>سنة السيارة</label>
                              <select
                                style={{ ...inputStyle, opacity: !addItemFilter.car_model ? 0.5 : 1 }}
                                value={addItemFilter.car_year}
                                disabled={!addItemFilter.car_model}
                                onChange={e => setAddItemFilter(f => ({ ...f, car_year: e.target.value }))}>
                                <option value="">{!addItemFilter.car_model ? 'اختر موديل أولاً' : 'الكل'}</option>
                                {carYears.map((y: string) => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* FILTER SEARCH BUTTON */}
                          <button onClick={fetchFilteredProducts}
                            style={{ ...saveBtnStyle, width: '100%', justifyContent: 'center', marginBottom: '14px' }}>
                            {loadingProducts ? 'جاري البحث...' : 'بحث بالفلاتر'}
                          </button>

                          {/* RESULTS */}
                          <div style={{ display: 'grid', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                            {loadingProducts && (
                              <p style={{ color: '#27ae60', textAlign: 'center', padding: '20px' }}>جاري البحث...</p>
                            )}
                            {!loadingProducts && filteredProducts.length === 0 && (
                              <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                                ابحث باسم المنتج أو استخدم الفلاتر أعلاه
                              </p>
                            )}
                            {filteredProducts.map((prod: any) => (
                              <div key={prod.id} style={searchProductRow}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <img src={prod.image_url || 'https://via.placeholder.com/50'}
                                    style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #eee' }} alt="" />
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1a1a1a' }}>{prod.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                      {prod.brand}{prod.car_make ? ` • ${prod.car_make} ${prod.car_model}` : ''}
                                    </div>
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

                  {/* PRICING ADJUSTMENTS */}
                  {editMode && (
                    <div style={{ background: '#fffbeb', borderRadius: '16px', padding: '20px', border: '1px solid #fef3c7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h4 style={{ margin: 0, color: '#92400e', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}><Tag size={16}/> تعديلات السعر</h4>
                      <div>
                        <label style={labelStyle}>الخصم</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select value={discount.type} onChange={e => setDiscount(d => ({ ...d, type: e.target.value as any }))} style={{ ...inputStyle, width: '160px' }}>
                            <option value="amount">خصم بمبلغ (ج.م)</option>
                            <option value="percent">خصم بنسبة (%)</option>
                          </select>
                          <input type="number" min={0} value={discount.value || ''}
                            onChange={e => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))}
                            placeholder={discount.type === 'percent' ? 'مثال: 10' : 'مثال: 50'}
                            style={{ ...inputStyle, width: '120px' }} />
                          <span style={{ color: '#888', fontSize: '0.85rem' }}>{discount.type === 'percent' ? '%' : 'ج.م'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" id="removeShip" checked={removeShipping} onChange={e => setRemoveShipping(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        <label htmlFor="removeShip" style={{ cursor: 'pointer', fontWeight: '600', color: '#555' }}>
                          إلغاء رسوم الشحن ({origShipping} ج.م)
                        </label>
                      </div>
                      <div>
                        <label style={labelStyle}>رسوم إضافية</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" min={0} value={extraFee.amount || ''}
                            onChange={e => setExtraFee(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                            placeholder="المبلغ (ج.م)" style={{ ...inputStyle, width: '130px' }} />
                          <input value={extraFee.reason} onChange={e => setExtraFee(f => ({ ...f, reason: e.target.value }))}
                            placeholder="سبب الرسوم الإضافية..." style={{ ...inputStyle, flex: 1 }} />
                        </div>
                      </div>
                      <div style={{ borderTop: '2px dashed #fde68a', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', color: '#92400e', fontSize: '1rem' }}>الإجمالي الجديد:</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#15803d' }}>{liveTotal.toFixed(2)} ج.م</span>
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

              {/* PAYMENT CARD */}
              <div style={modalCard}>
                <h3 style={cardTitle}><CreditCard size={18}/> إثبات وتفاصيل الدفع</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span>الوسيلة: <strong>{paymentLabels[selectedOrder.payment_method] || selectedOrder.payment_method}</strong></span>
                  {selectedOrder.payment_screenshot_url && (
                    <a href={selectedOrder.payment_screenshot_url} target="_blank" rel="noreferrer" style={viewLink}>
                      <ExternalLink size={16} /> فتح الصورة الأصلية
                    </a>
                  )}
                </div>
                {selectedOrder.payment_screenshot_url && (
                  <div style={imagePreviewBox}>
                    <img src={selectedOrder.payment_screenshot_url} alt="Proof" style={fullImg} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STYLES ====================
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
const iconBtn: any = { background: '#f8f9fa', border: '1px solid #eee', color: '#555', padding: '10px', borderRadius: '12px', cursor: 'pointer' };
const delBtn: any = { background: '#fff5f5', border: '1px solid #ffebeb', color: '#e74c3c', padding: '10px', borderRadius: '12px', cursor: 'pointer' };
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
