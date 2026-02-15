'use client';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext'; 
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  User, MapPin, ShoppingCart, Loader2, CheckCircle, Car, Globe, 
  Settings2, Calendar, Tags, Upload, ExternalLink, Plus, Gauge, 
  Banknote, CreditCard, Wallet, SmartphoneNfc 
} from 'lucide-react';

export default function CheckoutPage() {
  const { cart, clearCart, isInitialized } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('card_installments'); 
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [carMileage, setCarMileage] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    secondary_phone: '',
    address: ''
  });

  // بيانات EasyKash
  const EASYKASH_API_KEY = "gf8ueul7plkntb5r";
  const CALLBACK_URL = "https://zait-and-filters-web.vercel.app/order-success";

  const CLOUD_NAME = "dxtncdxfh";
  const UPLOAD_PRESET = "zaitandfiltersnew";

  useEffect(() => {
    async function initCheckout() {
      const { data: shippingData } = await supabase.from('shipping_rates').select('*').order('city_name', { ascending: true });
      if (shippingData && shippingData.length > 0) {
        setShippingRates(shippingData);
        setSelectedCity(shippingData[0]); 
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name, phone_number').eq('id', user.id).single();
        if (profile) setCustomerInfo(prev => ({ ...prev, name: profile.full_name || '', phone: profile.phone_number || '' }));
        const { data: addresses } = await supabase.from('addresses').select('*').eq('user_id', user.id);
        if (addresses && addresses.length > 0) {
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
          setSelectedAddressId(defaultAddr.id);
          setCustomerInfo(prev => ({ ...prev, address: defaultAddr.full_address }));
          if (shippingData) {
            const city = shippingData.find(c => c.city_name === defaultAddr.city_name);
            if (city) setSelectedCity(city);
          }
        }
      }
    }
    initCheckout();
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0), [cart]);
  const finalTotal = subtotal + (selectedCity?.price || 0);

  useEffect(() => { if (isInitialized) setTimeout(() => setIsReady(true), 800); }, [isInitialized]);

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setScreenshot(e.target.files[0]);
      toast.success('تم اختيار إثبات التحويل');
    }
  };

  const initiateEasyKashPayment = async (orderId: string) => {
    try {
      const response = await fetch('https://api.easykash.net/api/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: EASYKASH_API_KEY,
          amount: finalTotal,
          currency: "EGP",
          order_id: orderId,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          callback_url: CALLBACK_URL,
          payment_methods: ["card", "installments", "valu", "aman"]
        })
      });

      const data = await response.json();
      if (data.status === 'success' && data.checkout_url) {
        window.location.href = data.checkout_url; 
      } else {
        throw new Error(data.message || 'فشل الاتصال ببوابة الدفع');
      }
    } catch (err: any) {
      toast.error('خطأ في بوابة الدفع: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subtotal <= 0) return toast.error('السلة فارغة');
    if (paymentMethod !== 'card_installments' && !screenshot) return toast.error('يرجى رفع سكرين شوت التحويل');

    setLoading(true);
    try {
      // جلب بيانات المستخدم الحالي (إذا وجد) لربط الطلب بحسابه
      const { data: { user } } = await supabase.auth.getUser();
      
      let uploadedImageUrl = screenshot ? await uploadToCloudinary(screenshot) : null;
      
      const orderData = {
        user_id: user?.id || null, // التعديل هنا لربط الطلب بالحساب تلقائياً
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        city: selectedCity?.city_name,
        shipping_cost: selectedCity?.price,
        total_price: finalTotal,
        items: cart, 
        payment_method: paymentMethod,
        payment_screenshot_url: uploadedImageUrl,
        car_mileage: carMileage,
        status: paymentMethod === 'card_installments' ? 'pending_payment' : 'pending',
        created_at: new Date().toISOString()
      };

      const { data: newOrder, error } = await supabase.from('orders').insert([orderData]).select().single();
      if (error) throw error;

      if (paymentMethod === 'card_installments') {
        await initiateEasyKashPayment(newOrder.id);
      } else {
        toast.success('تم تسجيل طلبك بنجاح! 🎉');
        clearCart();
        router.push(`/order-success?orderId=${newOrder.id}`); 
      }
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isReady || shippingRates.length === 0) return <div style={loaderStyle}><Loader2 className="animate-spin" size={40} color="#15803d" /> جاري تجهيز الطلب...</div>;

  return (
    <div style={container}>
      <style dangerouslySetInnerHTML={{ __html: `
        .btn-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(21, 128, 61, 0.4); background: #14532d !important; }
        .action-hover:hover { background: #000 !important; transform: translateY(-1px); }
        .upload-hover:hover { background: #f0fdf4 !important; border-color: #15803d !important; }
        input:focus, select:focus, textarea:focus { border-color: #15803d !important; box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.1); }
      `}} />
      
      <h1 style={title}>🏁 إتمام عملية الشراء</h1>
      <div style={layoutGrid}>
        
        <div style={summarySide}>
          <h3 style={sectionTitle}><ShoppingCart size={18} /> تفاصيل فاتورتك</h3>
          <div style={itemsList}>
            {cart.map((item: any) => {
               const country = item.country_origin || item.country_of_origin || 'أصلي';
               return (
                <div key={item.id} style={cartItem}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={imageBox}><img src={item.image_url || item.image} alt="" style={imgFluid} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '900', fontSize: '0.95rem' }}>{item.name}</span>
                        <span style={{ fontWeight: '900' }}>{(parseFloat(item.price) * item.quantity).toFixed(2)} ج.م</span>
                      </div>
                      <div style={detailsGrid}>
                        <div style={detailItem}><Settings2 size={11} color="#15803d" /> <span>الماركة: <b>{item.brand}</b></span></div>
                        <div style={detailItem}><Globe size={11} color="#15803d" /> <span>المنشأ: <b>{country}</b></span></div>
                        <div style={detailItem}><Car size={11} color="#15803d" /> <span>لـ: <b>{item.car_make} {item.car_model}</b></span></div>
                        {item.car_model_year && <div style={detailItem}><Calendar size={11} color="#15803d" /> <span>سنة: <b>{item.car_model_year}</b></span></div>}
                        {(item.category || item.subcategory) && <div style={detailItem}><Tags size={11} color="#15803d" /> <span>القسم: <b>{item.subcategory || item.category}</b></span></div>}
                      </div>
                      <div style={{ marginTop: '5px' }}>
                        <span style={qtyBadge}>الكمية: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={totalBox}>
            <div style={rowPrice}><span>إجمالي المنتجات:</span><span>{subtotal.toFixed(2)} ج.م</span></div>
            <div style={rowPrice}><span>الشحن ({selectedCity?.city_name}):</span><span>{(selectedCity?.price || 0).toFixed(2)} ج.م</span></div>
            <div style={finalRow}><span>الإجمالي النهائي:</span><span>{finalTotal.toFixed(2)} ج.م</span></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={formSide}>
          <h3 style={sectionTitle}><User size={18} /> بيانات المستلم</h3>
          <div style={inputGroup}>
            <label style={lab}>الاسم بالكامل</label>
            <input value={customerInfo.name} onChange={(e)=>setCustomerInfo({...customerInfo, name: e.target.value})} required style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}>رقم الموبايل</label>
            <input value={customerInfo.phone} onChange={(e)=>setCustomerInfo({...customerInfo, phone: e.target.value})} required style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}><Gauge size={14} /> قراءة العداد</label>
            <input type="number" value={carMileage} onChange={(e) => setCarMileage(e.target.value)} style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}>المحافظة</label>
            <select style={inp} value={selectedCity?.city_name} onChange={(e) => setSelectedCity(shippingRates.find(c => c.city_name === e.target.value))}>
              {shippingRates.map(city => <option key={city.id} value={city.city_name}>{city.city_name}</option>)}
            </select>
          </div>
          <div style={inputGroup}>
            <label style={lab}>العنوان بالتفصيل</label>
            <textarea value={customerInfo.address} onChange={(e)=>setCustomerInfo({...customerInfo, address: e.target.value})} required style={{...inp, height: '80px', paddingTop: '12px'}} />
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={sectionTitle}><Banknote size={18} /> وسيلة الدفع</h3>
            <div style={paymentContainer}>
              
              <label style={paymentCard(paymentMethod === 'card_installments')}>
                <input type="radio" value="card_installments" checked={paymentMethod === 'card_installments'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={payIconWrapper}><CreditCard size={22} color={paymentMethod === 'card_installments' ? '#15803d' : '#666'} /></div>
                    <div style={payTextContent}>
                      <span style={payTitle}>دفع بالتقسيط أو البطاقة</span>
                      <span style={paySubTitle}>أمان، فوري، فاليو، كونتكت، البنك الأهلي والعديد..</span>
                    </div>
                  </div>
                  
                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/Njw3g5JW/visa-logo-png-seeklogo-149697.png" alt="Visa" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/sgRkVv64/1280px-Master-Card-Logo-svg.png" alt="Mastercard" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/wjdC67fn/VALU.jpg" alt="Valu" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/dVKbqLHB/AMAN.jpg" alt="Aman" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/pLtw2pGk/FAWRY.jpg" alt="Fawry" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/vZdJQcqN/SOHOOLA.jpg" alt="Souhoola" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/52Mhx67g/CONTACT.jpg" alt="Contact" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/FHQM97WT/HALAN.jpg" alt="Halan" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/kgd0nB1f/EL-AHLY.jpg" alt="NBE" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/7ZyFxfsB/MEEZA.jpg" alt="Meeza" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/VkcxYdGp/TAKKA.jpg" alt="Takka" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/wjdC67ff/lucky.jpg" alt="Lucky" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/qvdPkzbY/TRU.jpg" alt="Tru" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/RZzkMNsb/mogo.jpg" alt="Mogo" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/zG1sJVt2/apple-pay.png" alt="Apple Pay" style={miniLogoImg} />
                  </div>
                </div>
              </label>

              <label style={paymentCard(paymentMethod === 'instapay')}>
                <input type="radio" value="instapay" checked={paymentMethod === 'instapay'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={payIconWrapper}><SmartphoneNfc size={22} color={paymentMethod === 'instapay' ? '#15803d' : '#666'} /></div>
                    <div style={payTextContent}>
                      <span style={payTitle}>تطبيق انستا باي (InstaPay)</span>
                      <span style={paySubTitle}>دفع لحظي من حسابك البنكي</span>
                    </div>
                  </div>
                  
                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/3r19c1zy/Pv1p8v-KJq4Z-LLOj-Qj-BZp-K8DNJg4Zb5.png" alt="InstaPay" style={miniLogoImg} />
                  </div>

                  {paymentMethod === 'instapay' && (
                    <div style={payDetailsBox}>
                      <a href="https://ipn.eg/S/jimmydodo/instapay/3Jvfcf" target="_blank" className="action-hover" style={actionBtnLink}><ExternalLink size={14} /> اذهب للدفع الآن</a>
                      <label htmlFor="u-insta" className="upload-hover" style={uploadArea}><Upload size={14}/> {screenshot ? '✅ تم الاختيار' : 'رفع سكرين شوت التحويل'}</label>
                      <input id="u-insta" type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}}/>
                    </div>
                  )}
                </div>
              </label>

              <label style={paymentCard(paymentMethod === 'wallets')}>
                <input type="radio" value="wallets" checked={paymentMethod === 'wallets'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={payIconWrapper}><Wallet size={22} color={paymentMethod === 'wallets' ? '#15803d' : '#666'} /></div>
                    <div style={payTextContent}>
                      <span style={payTitle}>محافظ إلكترونية (كاش)</span>
                      <span style={paySubTitle}>
                        التحويل للرقم: <strong style={{ fontSize: '1.05rem', color: '#1a1a1a' }}>01023862436</strong>
                        <br />
                        بإسم: <strong style={{ color: '#1a1a1a' }}>محمد جمال ابراهيم</strong>
                      </span>
                    </div>
                  </div>

                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/ryjgPj7K/VODAFONE.jpg" alt="Vodafone Cash" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/Y2R8sRTj/ORANGE.jpg" alt="Orange Money" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/59gpRgDy/ETTISALAT.jpg" alt="Etisalat Cash" style={miniLogoImg} />
                  </div>

                  {paymentMethod === 'wallets' && (
                    <div style={payDetailsBox}>
                      <label htmlFor="u-cash" className="upload-hover" style={uploadArea}><Upload size={14}/> {screenshot ? '✅ تم الاختيار' : 'رفع إثبات التحويل'}</label>
                      <input id="u-cash" type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}}/>
                    </div>
                  )}
                </div>
              </label>

            </div>
          </div>

          <button disabled={loading} type="submit" className="btn-hover" style={btnStyle}>
            {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> {paymentMethod === 'card_installments' ? 'الانتقال للدفع والتقسيط' : 'تأكيد وإتمام الطلب'}</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- التنسيقات ---
const container: any = { padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' };
const title: any = { marginBottom: '30px', fontWeight: '900', textAlign: 'center', fontSize: '2rem' };
const layoutGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '25px', alignItems: 'start' };
const sectionTitle: any = { marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px', fontWeight: '800' };
const formSide: any = { background: '#fff', padding: '25px', borderRadius: '25px', border: '1px solid #eee', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' };
const summarySide: any = { background: '#fcfcfc', padding: '25px', borderRadius: '25px', border: '1px solid #eee' };
const inp: any = { width: '100%', height: '50px', padding: '0 15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '10px', outline: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center' };
const lab: any = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#444' };
const inputGroup: any = { marginBottom: '10px' };
const cartItem: any = { padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: '10px' };
const imageBox: any = { width: '65px', height: '65px', borderRadius: '12px', overflow: 'hidden', background: '#fff', border: '1px solid #eee' };
const imgFluid: any = { width: '100%', height: '100%', objectFit: 'contain' };
const totalBox: any = { background: '#f0fdf4', padding: '15px', borderRadius: '15px', marginTop: '10px', border: '1px solid #dcfce7' };
const rowPrice: any = { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' };
const finalRow: any = { display: 'flex', justifyContent: 'space-between', fontWeight: '1000', fontSize: '1.4rem', color: '#166534', borderTop: '1px solid #dcfce7', paddingTop: '10px', marginTop: '5px' };
const btnStyle: any = { width: '100%', padding: '18px', background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(21, 128, 61, 0.25)' };
const loaderStyle: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '10px', color: '#15803d', fontWeight: 'bold' };
const itemsList: any = { maxHeight: '350px', overflowY: 'auto' };
const detailsGrid = { display: 'flex', flexDirection: 'column' as const, gap: '3px', marginTop: '8px' };
const detailItem = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#666' };
const qtyBadge = { backgroundColor: '#f0fdf4', color: '#15803d', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' };
const paymentContainer: any = { display: 'flex', flexDirection: 'column', gap: '12px' };
const paymentCard = (isActive: boolean) => ({ display: 'block', padding: '18px', borderRadius: '20px', border: isActive ? '2.5px solid #15803d' : '1px solid #eee', background: isActive ? '#f7fff9' : '#fff', cursor: 'pointer', transition: '0.3s', boxShadow: isActive ? '0 5px 15px rgba(21, 128, 61, 0.1)' : 'none' });
const payCardInner: any = { display: 'flex', flexDirection: 'column', gap: '10px' };
const payHeader: any = { display: 'flex', alignItems: 'center', gap: '12px' };
const payIconWrapper: any = { width: '45px', height: '45px', borderRadius: '14px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f0f0f0', flexShrink: 0 };
const payTextContent: any = { display: 'flex', flexDirection: 'column' };
const payTitle: any = { fontWeight: '900', fontSize: '0.95rem', color: '#1a1a1a' };
const paySubTitle: any = { fontSize: '0.75rem', color: '#777', fontWeight: '500' };
const hideRadio: any = { display: 'none' };
const logosGrid: any = { display: 'flex', gap: '12px', flexWrap: 'wrap', paddingRight: '57px', marginTop: '10px' };
const miniLogoImg: any = { height: '36px', width: 'auto', borderRadius: '8px', objectFit: 'contain' as const, border: '1px solid #f0f0f0', padding: '3px', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' };
const payDetailsBox: any = { marginTop: '12px', padding: '18px', background: '#fff', borderRadius: '15px', border: '1px dashed #15803d', display: 'flex', flexDirection: 'column', gap: '10px' };
const actionBtnLink: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#1a1a1a', color: '#fff', padding: '12px', borderRadius: '12px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold', transition: '0.3s ease' };
const uploadArea: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '2px dashed #15803d', color: '#15803d', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '900', transition: '0.3s ease' };