function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '20' + d.slice(1);
  else if (!d.startsWith('20')) d = '20' + d;
  return d;
}

export function waLink(phone: string, name?: string, message?: string): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  let text = `ازيك ${name || ''}، بخصوص رسالتك لمتجر زيت أند فلترز`.trim();
  if (message) text += `:\n«${message}»`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function orderWhatsAppLink(order: any): string | null {
  const digits = normalizePhone(order.customer_phone);
  if (!digits) return null;
  let text = orderConfirmationMessage(order);
  if (text.length > 1500) text = text.slice(0, 1500) + '...';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function fmt(n: any): number {
  const v = parseFloat(n);
  if (isNaN(v)) return 0;
  return v;
}

export function orderConfirmationMessage(order: any): string {
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : '';
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const items: any[] = order.items || [];
  const paymentLabels: Record<string, string> = {
    card_installments: 'بطاقة / تقسيط',
    instapay: 'انستا باي',
    wallets: 'محفظة إلكترونية',
    cash: 'كاش عند الاستلام',
    vodafone_cash: 'فودافون كاش',
    bank_transfer: 'تحويل بنكي',
  };

  const itemsList = items
    .map(i => `• ${i.quantity || 1}x ${i.name || 'منتج'} — ${(fmt(i.price) * (i.quantity || 1)).toFixed(0)} ج.م`)
    .join('\n');

  const shipping = parseFloat(order.shipping_cost || order.shipping_fee || 0);
  const discount = parseFloat(order.discount_applied || order.discount_amount || 0);
  const total = parseFloat(order.total_price || 0);

  const lines = [
    `ازيك ${order.customer_name || 'حبيبنا'}،`,
    '',
    'تشرفنا بطلبك من زيت أند فلترز',
    '',
    'تفاصيل الطلب:',
    `رقم الطلب: #${shortId}`,
    date ? `التاريخ: ${date}` : '',
    `العنوان: ${order.city || ''}${order.city && order.customer_address ? ' - ' : ''}${order.customer_address || ''}`,
    '',
    'المنتجات:',
    itemsList || '(بدون منتجات)',
    '',
    `الاجمالي: ${fmt(total)} ج.م`,
    `الدفع: ${paymentLabels[order.payment_method] || order.payment_method || 'غير محدد'}`,
    `الشحن: ${shipping === 0 ? 'مجاني' : `${fmt(shipping)} ج.م`}`,
    discount > 0 ? `الخصم: -${fmt(discount)} ج.م` : '',
    '',
    'ممكن تاكيد الطلب عشان نبدا التجهيز؟',
  ];

  return lines.filter(Boolean).join('\n');
}
