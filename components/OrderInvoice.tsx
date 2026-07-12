'use client';

// ============================================================
// OrderInvoice.tsx
// Usage: <OrderInvoice order={orderObject} />
// Or as a standalone page: /app/orders/[id]/invoice/page.tsx
//
// Generates a professional PDF "ORDER" document (not فاتورة)
// - Customer can download it
// - Admin can access via /orders/[id]/invoice
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Download, Printer, CheckCircle, Package, Truck, User, Phone, MapPin, Calendar, Hash, Car, Globe } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  brand?: string;
  image_url?: string;
  // ✅ FIX 2: Added missing car + origin fields
  car_make?: string;
  car_model?: string;
  car_model_year?: string;
  country_origin?: string;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_email?: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost?: number;
  discount?: number;
  total: number;
  payment_method?: string;
  status?: string;
  notes?: string;
}

interface Props {
  order: Order;
}

export default function OrderInvoice({ order }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const subtotal = order.subtotal ?? order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = order.shipping_cost ?? 0;
  const discount = order.discount ?? 0;
  const total = order.total ?? subtotal + shipping - discount;

  // ── PDF Download using html2canvas + jsPDF (loaded dynamically) ──────────
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const element = invoiceRef.current;
      if (!element) return;

      // ✅ FIX 1: Wait for Cairo font to fully load before capturing canvas
      await document.fonts.ready;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1c1c1c',
        logging: false,
        // ✅ FIX 1: Ensure cloned document also has fonts ready
        onclone: (_clonedDoc) => document.fonts.ready,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If content exceeds one page, add extra pages
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ORDER-${orderNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    // ✅ FIX 1: Use Cairo font for proper Arabic letter shaping
    <div style={{ direction: 'rtl', backgroundColor: '#242424', minHeight: '100vh', padding: '30px 20px', fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}>

      {/* ✅ FIX 1: Load Cairo Arabic font from Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #invoice-content { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* ── Action buttons (hidden when printing) ── */}
      <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={handlePrint}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', backgroundColor: '#1c1c1c',
            color: '#f5f5f5', border: '1.5px solid #ddd',
            borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem',
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: "'Cairo', system-ui, sans-serif",
          }}
        >
          <Printer size={18} />
          طباعة
        </button>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 24px',
            background: isGenerating ? '#ccc' : 'linear-gradient(135deg, #e50914, #dc2626)',
            color: '#fff', border: 'none', borderRadius: '12px',
            fontWeight: '800', fontSize: '0.9rem',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(34,197,94,0.35)',
            transition: 'all 0.2s',
            fontFamily: "'Cairo', system-ui, sans-serif",
          }}
        >
          <Download size={18} />
          {isGenerating ? 'جاري التحميل...' : 'تحميل PDF'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          THE INVOICE — this is what gets captured into the PDF
      ══════════════════════════════════════════════════════════ */}
      <div
        ref={invoiceRef}
        id="invoice-content"
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: '#1c1c1c',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          // ✅ FIX 1: Enforce Cairo font inside the captured element too
          fontFamily: "'Cairo', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f4c2a 100%)',
            padding: '40px 50px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-40px', right: '10%', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.06)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            {/* Brand */}
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '900', fontStyle: 'italic', color: '#fff', letterSpacing: '-1px', marginBottom: '4px' }}>
                ZAIT <span style={{ color: '#e50914' }}>& FILTERS</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '2px' }}>
                AUTO PARTS · قطع غيار
              </div>
            </div>

            {/* ORDER label + number */}
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '2.8rem', fontWeight: '900', color: '#e50914',
                letterSpacing: '-1px', lineHeight: 1, textTransform: 'uppercase',
              }}>
                ORDER
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', marginTop: '4px', letterSpacing: '1px' }}>
                #{orderNumber}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              padding: '6px 14px', borderRadius: '20px',
            }}>
              <CheckCircle size={14} color="#e50914" />
              <span style={{ color: '#e50914', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                {order.status === 'delivered' ? 'تم التسليم' :
                 order.status === 'shipped' ? 'قيد الشحن' :
                 order.status === 'cancelled' ? 'ملغي' : 'تم تأكيد الطلب'}
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginRight: '8px' }}>
              {orderDate}
            </div>
          </div>
        </div>

        {/* ── META ROW ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          borderBottom: '1px solid #242424',
        }}>
          {[
            { icon: <Hash size={15} color="#e50914" />, label: 'رقم الطلب', value: `#${orderNumber}` },
            { icon: <Calendar size={15} color="#e50914" />, label: 'تاريخ الطلب', value: orderDate },
            { icon: <Package size={15} color="#e50914" />, label: 'عدد المنتجات', value: `${order.items.length} منتج` },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '20px 24px',
              borderRight: i < 2 ? '1px solid #242424' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {item.icon}
                <span style={{ fontSize: '0.72rem', color: '#999', fontWeight: '700', letterSpacing: '0.5px' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#f5f5f5' }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '35px 50px' }}>

          {/* ── CUSTOMER INFO ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
            marginBottom: '35px',
          }}>
            {/* Bill To */}
            <div style={{
              backgroundColor: '#161616', borderRadius: '14px', padding: '22px',
              border: '1px solid #242424',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#e50914', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={14} color="#fff" />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px' }}>بيانات العميل</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f5f5f5', marginBottom: '10px' }}>{order.customer_name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={13} color="#e50914" />
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: '600', direction: 'ltr' }}>{order.customer_phone}</span>
                </div>
                {order.customer_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: '600' }}>{order.customer_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ship To */}
            <div style={{
              backgroundColor: '#161616', borderRadius: '14px', padding: '22px',
              border: '1px solid #242424',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={14} color="#e50914" />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px' }}>عنوان التوصيل</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={14} color="#e50914" style={{ marginTop: '3px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: '#f5f5f5', fontWeight: '700', lineHeight: '1.5' }}>{order.customer_address}</span>
              </div>
              {order.payment_method && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2a2a2a' }}>
                  <span style={{ fontSize: '0.75rem', color: '#999', fontWeight: '700' }}>طريقة الدفع: </span>
                  <span style={{ fontSize: '0.85rem', color: '#f5f5f5', fontWeight: '800' }}>{order.payment_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px', marginBottom: '14px' }}>
              تفاصيل المنتجات
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 0.8fr 1fr 1fr',
              backgroundColor: '#1c1c1c',
              borderRadius: '10px 10px 0 0',
              padding: '12px 18px',
            }}>
              {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                <div key={i} style={{
                  fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8',
                  letterSpacing: '0.5px',
                  textAlign: i === 0 ? 'right' : 'center',
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Table rows */}
            {order.items.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 0.8fr 1fr 1fr',
                  padding: '14px 18px',
                  backgroundColor: i % 2 === 0 ? '#fff' : '#161616',
                  borderBottom: '1px solid #242424',
                  alignItems: 'center',
                  borderRight: '1px solid #242424',
                  borderLeft: '1px solid #242424',
                }}
              >
                {/* ✅ FIX 2: Product name + brand + car make/model + country */}
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#f5f5f5', marginBottom: '3px' }}>
                    {item.name}
                  </div>
                  {item.brand && (
                    <div style={{ fontSize: '0.72rem', color: '#e50914', fontWeight: '700', marginBottom: '3px' }}>
                      {item.brand}
                    </div>
                  )}
                  {/* ✅ Car make + model */}
                  {(item.car_make || item.car_model) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <Car size={11} color="#9ca3af" />
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '700' }}>
                        {[item.car_make, item.car_model, item.car_model_year].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}
                  {/* ✅ Country of origin */}
                  {item.country_origin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={11} color="#9ca3af" />
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '700' }}>
                        {item.country_origin}
                      </span>
                    </div>
                  )}
                </div>

                {/* Qty */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    backgroundColor: '#1a0d0d', color: '#dc2626',
                    padding: '3px 10px', borderRadius: '6px',
                    fontSize: '0.85rem', fontWeight: '800',
                  }}>
                    ×{item.quantity}
                  </span>
                </div>
                {/* Unit price */}
                <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '700', color: '#cbd5e1' }}>
                  {item.price.toLocaleString('ar-EG')} ج.م
                </div>
                {/* Line total */}
                <div style={{ textAlign: 'center', fontSize: '0.95rem', fontWeight: '900', color: '#f5f5f5' }}>
                  {(item.price * item.quantity).toLocaleString('ar-EG')} ج.م
                </div>
              </div>
            ))}

            {/* Table bottom border */}
            <div style={{ height: '4px', backgroundColor: '#1c1c1c', borderRadius: '0 0 10px 10px' }} />
          </div>

          {/* ── TOTALS ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px' }}>
              {/* Subtotal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #2a2a2a' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.88rem', fontWeight: '700' }}>المجموع الجزئي</span>
                <span style={{ color: '#f5f5f5', fontSize: '0.9rem', fontWeight: '800' }}>{subtotal.toLocaleString('ar-EG')} ج.م</span>
              </div>

              {/* Shipping */}
              {shipping > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #2a2a2a' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.88rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Truck size={13} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                    الشحن
                  </span>
                  <span style={{ color: '#f5f5f5', fontSize: '0.9rem', fontWeight: '800' }}>{shipping.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}
              {shipping === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #2a2a2a' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.88rem', fontWeight: '700' }}>الشحن</span>
                  <span style={{ color: '#e50914', fontSize: '0.88rem', fontWeight: '800' }}>مجاني</span>
                </div>
              )}

              {/* Discount */}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #2a2a2a' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.88rem', fontWeight: '700' }}>الخصم</span>
                  <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '800' }}>- {discount.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}

              {/* TOTAL */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '12px', padding: '16px 20px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                borderRadius: '12px',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: '700' }}>الإجمالي الكلي</span>
                <span style={{ color: '#e50914', fontSize: '1.4rem', fontWeight: '900' }}>
                  {total.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* ── NOTES ── */}
          {order.notes && (
            <div style={{
              marginTop: '30px', padding: '18px 22px',
              backgroundColor: '#1c1c1c', borderRadius: '12px',
              border: '1px solid #7f1d1d',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fbbf24', letterSpacing: '0.5px', marginBottom: '8px' }}>
                ملاحظات
              </div>
              <p style={{ fontSize: '0.9rem', color: '#fbbf24', lineHeight: '1.6', margin: 0 }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          padding: '28px 50px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', fontStyle: 'italic', color: '#fff', letterSpacing: '-0.5px' }}>
              ZAIT <span style={{ color: '#e50914' }}>& FILTERS</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: '4px' }}>
              zaitandfilters.com
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#e50914', fontSize: '0.8rem', fontWeight: '800' }}>شكراً لثقتكم بنا</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '2px' }}>Thank you for your order</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '8px', padding: '6px 14px',
              color: '#e50914', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px',
            }}>
              ORDER #{orderNumber}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
