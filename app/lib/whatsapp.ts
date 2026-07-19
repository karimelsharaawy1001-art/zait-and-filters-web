// Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western 0-9.
function toWesternDigits(s: string): string {
  return String(s)
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));
}

// Extract the first valid Egyptian mobile (01[0125]xxxxxxxx) from a digit
// string, tolerating a country code / leading zero prefix.
function firstEgMobile(digits: string): string | null {
  let d = digits;
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20')) d = d.slice(2);
  else if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  const m = d.match(/1[0125]\d{8}/);
  return m ? '20' + m[0] : null;
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  // Normalize Arabic/Persian digits first — JS \d only matches ASCII 0-9.
  const western = toWesternDigits(phone);
  // Split into digit groups first so a field with two numbers
  // (e.g. "01003270353 / 0114268793") doesn't get glued into one.
  const groups = western.match(/\d+/g) || [];
  if (groups.length === 0) return null;

  // Prefer a valid Egyptian mobile from any single group…
  for (const g of groups) {
    const r = firstEgMobile(g);
    if (r) return r;
  }
  // …then try across the joined digits (handles no-separator concatenation)…
  const joined = firstEgMobile(groups.join(''));
  if (joined) return joined;

  // …otherwise best-effort for a non-Egyptian number (use the first group).
  let d = groups[0] || '';
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '20' + d.slice(1);
  else if (!d.startsWith('20')) d = '20' + d;
  return d;
}

export function waLink(phone: string, name?: string, message?: string): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  let text = `ازيك يا أ. ${name || ''}، بخصوص رسالتك لمتجر زيت أند فلترز`.trim();
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

// WhatsApp link telling the customer their ordered item is out of stock.
export function outOfStockWhatsAppLink(order: any): string | null {
  const digits = normalizePhone(order.customer_phone);
  if (!digits) return null;
  let text = outOfStockMessage(order);
  if (text.length > 1500) text = text.slice(0, 1500) + '...';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// WhatsApp link notifying the customer that some product prices changed.
export function priceChangeWhatsAppLink(
  order: any,
  changes: { name: string; oldPrice: number; newPrice: number }[],
): string | null {
  const digits = normalizePhone(order.customer_phone);
  if (!digits || changes.length === 0) return null;
  let text = priceChangeMessage(order, changes);
  if (text.length > 1500) text = text.slice(0, 1500) + '...';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Message telling the customer their ordered item is out of stock.
export function outOfStockMessage(order: any): string {
  const items: any[] = order.items || [];
  const names = items.map(i => `• ${i.name || 'منتج'}`).join('\n');
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : '';
  return [
    `ازيك يا أ. ${order.customer_name || 'حبيبنا'}،`,
    '',
    `للأسف المنتج اللي طلبته${shortId ? ` في طلب #${shortId}` : ''} غير متوفر حالياً في المخزون:`,
    names,
    '',
    'وهنبعتلك رسالة تاني أول ما يتوفر مرة أخرى.',
    'نعتذر عن الإزعاج ونشكر تفهمك 🌹',
  ].filter(Boolean).join('\n');
}

// Message notifying the customer that some product prices changed.
export function priceChangeMessage(
  order: any,
  changes: { name: string; oldPrice: number; newPrice: number }[],
): string {
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : '';
  return [
    `ازيك يا أ. ${order.customer_name || 'حبيبنا'}،`,
    '',
    `للأسف حصل تغيير في أسعار بعض المنتجات في طلبك${shortId ? ` رقم #${shortId}` : ''}:`,
    '',
    ...changes.map(
      c => `• ${c.name}: السعر اتغير من ${c.oldPrice.toFixed(0)} لـ ${c.newPrice.toFixed(0)} ج.م`,
    ),
    '',
    'تحب تكمل الطلب بالأسعار الجديدة، ولا تحب نلغي المنتجات دي من طلبك؟',
    '',
    'في انتظار ردك 🌹',
  ].join('\n');
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
    `ازيك يا أ. ${order.customer_name || 'حبيبنا'}،`,
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
    `الشحن: ${shipping === 0 ? 'مجاني' : `${fmt(shipping)} ج.م`}`,
    `الاجمالي: ${fmt(total)} ج.م`,
    `الدفع: ${paymentLabels[order.payment_method] || order.payment_method || 'غير محدد'}`,
    discount > 0 ? `الخصم: -${fmt(discount)} ج.م` : '',
    '',
    'ممكن تاكيد الطلب عشان نبدا التجهيز؟',
  ];

  return lines.filter(Boolean).join('\n');
}
