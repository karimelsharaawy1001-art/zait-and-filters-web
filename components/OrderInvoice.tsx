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
import { Download, Printer, CheckCircle, Package, Truck, User, Phone, MapPin, Calendar, Hash } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  brand?: string;
  image_url?: string;
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

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
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
    <div style={{ direction: 'rtl', backgroundColor: '#f0f0f0', minHeight: '100vh', padding: '30px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Action buttons (hidden when printing) ── */}
      <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={handlePrint}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', backgroundColor: '#fff',
            color: '#1a1a1a', border: '1.5px solid #ddd',
            borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem',
            cursor: 'pointer', transition: 'all 0.2s',
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
            background: isGenerating ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', border: 'none', borderRadius: '12px',
            fontWeight: '800', fontSize: '0.9rem',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(34,197,94,0.35)',
            transition: 'all 0.2s',
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
          backgroundColor: '#fff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
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
                ZAIT <span style={{ color: '#22c55e' }}>& FILTERS</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '2px' }}>
                AUTO PARTS · قطع غيار
              </div>
            </div>

            {/* ORDER label + number */}
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '2.8rem', fontWeight: '900', color: '#22c55e',
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
              <CheckCircle size={14} color="#22c55e" />
              <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px' }}>
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
          borderBottom: '1px solid #f0f0f0',
        }}>
          {[
            { icon: <Hash size={15} color="#22c55e" />, label: 'رقم الطلب', value: `#${orderNumber}` },
            { icon: <Calendar size={15} color="#22c55e" />, label: 'تاريخ الطلب', value: orderDate },
            { icon: <Package size={15} color="#22c55e" />, label: 'عدد المنتجات', value: `${order.items.length} منتج` },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '20px 24px',
              borderRight: i < 2 ? '1px solid #f0f0f0' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {item.icon}
                <span style={{ fontSize: '0.72rem', color: '#999', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1a1a1a' }}>{item.value}</div>
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
              backgroundColor: '#f9fafb', borderRadius: '14px', padding: '22px',
              border: '1px solid #f0f0f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={14} color="#fff" />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}>بيانات العميل</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '10px' }}>{order.customer_name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={13} color="#22c55e" />
                  <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', direction: 'ltr' }}>{order.customer_phone}</span>
                </div>
                {order.customer_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600' }}>{order.customer_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ship To */}
            <div style={{
              backgroundColor: '#f9fafb', borderRadius: '14px', padding: '22px',
              border: '1px solid #f0f0f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={14} color="#22c55e" />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}>عنوان التوصيل</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={14} color="#22c55e" style={{ marginTop: '3px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: '#1a1a1a', fontWeight: '700', lineHeight: '1.5' }}>{order.customer_address}</span>
              </div>
              {order.payment_method && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e5e5' }}>
                  <span style={{ fontSize: '0.75rem', color: '#999', fontWeight: '700' }}>طريقة الدفع: </span>
                  <span style={{ fontSize: '0.85rem', color: '#1a1a1a', fontWeight: '800' }}>{order.payment_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>
              تفاصيل المنتجات
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 0.8fr 1fr 1fr',
              backgroundColor: '#0f172a',
              borderRadius: '10px 10px 0 0',
              padding: '12px 18px',
            }}>
              {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                <div key={i} style={{
                  fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8',
                  letterSpacing: '0.5px', textTransform: 'uppercase',
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
                  backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                  alignItems: 'center',
                  borderRight: '1px solid #f0f0f0',
                  borderLeft: '1px solid #f0f0f0',
                }}
              >
                {/* Product name */}
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '2px' }}>{item.name}</div>
                  {item.brand && (
                    <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>{item.brand}</div>
                  )}
                </div>
                {/* Qty */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    backgroundColor: '#f0fdf4', color: '#16a34a',
                    padding: '3px 10px', borderRadius: '6px',
                    fontSize: '0.85rem', fontWeight: '800',
                  }}>
                    ×{item.quantity}
                  </span>
                </div>
                {/* Unit price */}
                <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '700', color: '#444' }}>
                  {item.price.toLocaleString('ar-EG')} ج.م
                </div>
                {/* Line total */}
                <div style={{ textAlign: 'center', fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a' }}>
                  {(item.price * item.quantity).toLocaleString('ar-EG')} ج.م
                </div>
              </div>
            ))}

            {/* Table bottom border */}
            <div style={{ height: '4px', backgroundColor: '#0f172a', borderRadius: '0 0 10px 10px' }} />
          </div>

          {/* ── TOTALS ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px' }}>
              {/* Subtotal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #e5e5e5' }}>
                <span style={{ color: '#666', fontSize: '0.88rem', fontWeight: '700' }}>المجموع الجزئي</span>
                <span style={{ color: '#1a1a1a', fontSize: '0.9rem', fontWeight: '800' }}>{subtotal.toLocaleString('ar-EG')} ج.م</span>
              </div>

              {/* Shipping */}
              {shipping > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #e5e5e5' }}>
                  <span style={{ color: '#666', fontSize: '0.88rem', fontWeight: '700' }}>
                    <Truck size={13} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                    الشحن
                  </span>
                  <span style={{ color: '#1a1a1a', fontSize: '0.9rem', fontWeight: '800' }}>{shipping.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}
              {shipping === 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #e5e5e5' }}>
                  <span style={{ color: '#666', fontSize: '0.88rem', fontWeight: '700' }}>الشحن</span>
                  <span style={{ color: '#22c55e', fontSize: '0.88rem', fontWeight: '800' }}>مجاني</span>
                </div>
              )}

              {/* Discount */}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #e5e5e5' }}>
                  <span style={{ color: '#666', fontSize: '0.88rem', fontWeight: '700' }}>الخصم</span>
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
                <span style={{ color: '#22c55e', fontSize: '1.4rem', fontWeight: '900' }}>
                  {total.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* ── NOTES ── */}
          {order.notes && (
            <div style={{
              marginTop: '30px', padding: '18px 22px',
              backgroundColor: '#fffbeb', borderRadius: '12px',
              border: '1px solid #fde68a',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#92400e', letterSpacing: '0.5px', marginBottom: '8px', textTransform: 'uppercase' }}>
                ملاحظات
              </div>
              <p style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: '1.6', margin: 0 }}>{order.notes}</p>
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
              ZAIT <span style={{ color: '#22c55e' }}>& FILTERS</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: '4px' }}>
              zaitandfilters.com
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: '800' }}>شكراً لثقتكم بنا</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '2px' }}>Thank you for your order</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '8px', padding: '6px 14px',
              color: '#22c55e', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px',
            }}>
              ORDER #{orderNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #invoice-content { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}