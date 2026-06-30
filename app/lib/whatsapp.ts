export function waLink(phone: string, name?: string, message?: string): string | null {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '20' + digits.slice(1);
  else if (!digits.startsWith('20')) digits = '20' + digits;
  let text = `ازيك ${name || ''}، بخصوص رسالتك لمتجر زيت أند فلترز`.trim();
  if (message) text += `:\n«${message}»`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
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
    .map(i => `• ${i.quantity}x ${i.name} — ${(parseFloat(i.price) * i.quantity).toLocaleString()} ج.م`)
    .join('\n');

  const shipping = parseFloat(order.shipping_cost || order.shipping_fee || 0);
  const discount = parseFloat(order.discount_applied || order.discount_amount || 0);
  const total = parseFloat(order.total_price || 0);

  const lines = [
    `ازيك ${order.customer_name || 'حبيبنا'}، 🙏`,
    '',
    'تشرفنا بطلبك من **زيت أند فلترز** 🎉',
    '',
    '📋 تفاصيل الطلب:',
    `🆔 رقم الطلب: #${shortId}`,
    date ? `📅 التاريخ: ${date}` : '',
    `📍 العنوان: ${order.city || ''}${order.city && order.customer_address ? ' — ' : ''}${order.customer_address || ''}`,
    '',
    '🛍️ المنتجات:',
    itemsList || '(بدون منتجات)',
    '',
    `💰 الإجمالي: ${total.toLocaleString()} ج.م`,
    `💳 الدفع: ${paymentLabels[order.payment_method] || order.payment_method || 'غير محدد'}`,
    `🚚 الشحن: ${shipping === 0 ? 'مجاني' : `${shipping.toLocaleString()} ج.م`}`,
    discount > 0 ? `🏷️ الخصم: -${discount.toLocaleString()} ج.م` : '',
    '',
    'ممكن تأكيد الطلب عشان نبدأ تجهيزه؟ 🙏',
  ];

  return lines.filter(Boolean).join('\n');
}
