import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function buildAdminNotificationHtml(order: any): string {
  const orderNum = order.id.slice(0, 8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const paymentLabels: Record<string, string> = {
    instapay: 'InstaPay',
    card_installments: 'بطاقة / تقسيط',
    wallets: 'محفظة إلكترونية',
    cash: 'الدفع عند الاستلام',
  };

  const shippingLabels: Record<string, string> = {
    express: 'شحن سريع (48 ساعة)',
    standard: 'شحن عادي (2-5 أيام عمل)',
  };

  const itemsList = (order.items || []).map((item: any) => {
    const qty = item.quantity || 1;
    const lineTotal = (parseFloat(item.price || 0) * qty).toFixed(0);

    // Build the car compatibility line: make · model · year
    const carParts = [item.car_make, item.car_model, item.car_model_year]
      .map((v) => (v && String(v).trim() && v !== 'UNIVERSAL' ? String(v).trim() : ''))
      .filter(Boolean);
    const carLine = carParts.length ? carParts.join(' · ') : '';

    const detailRow = (label: string, value: string) => value
      ? `<div style="font-size:0.78rem; color:#475569; margin-top:2px;"><span style="color:#94a3b8;">${label}:</span> <strong style="color:#1a1a1a;">${value}</strong></div>`
      : '';

    return `
      <div style="padding:12px 0; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="font-size:0.88rem; font-weight:800; color:#0f172a;">${item.name || 'منتج'}</div>
          <div style="font-size:0.85rem; font-weight:900; color:#15803d; white-space:nowrap;">${lineTotal} ج.م</div>
        </div>
        ${detailRow('الكمية', String(qty))}
        ${detailRow('الماركة', item.brand || '')}
        ${detailRow('السيارة', carLine)}
      </div>`;
  }).join('');

  const addressParts = [
    order.customer_address, order.address, order.city, order.area,
    order.street, order.building_number, order.apartment_number,
  ].filter(Boolean);

  const orderTotal = parseFloat(order.total_price ?? order.total ?? 0);

  return `
<body style="margin:0; padding:0; background:#f5f5f5; font-family:system-ui,-apple-system,sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:20px;">
      <table cellpadding="0" cellspacing="0" width="600" style="margin:0 auto; background:#fff; border-radius:16px;">
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a,#14532d); border-radius:16px 16px 0 0; padding:24px 32px; text-align:center;">
            <div style="font-size:1.3rem; font-weight:900; color:#fff; margin-bottom:4px;">
              🔔 طلب جديد #${orderNum}
            </div>
            <div style="font-size:0.82rem; color:rgba(255,255,255,0.6);">${orderDate}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <div style="display:grid; gap:16px;">
              <div style="background:#f8fafc; border-radius:10px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:4px;">العميل</div>
                <div style="font-size:0.9rem; font-weight:800; color:#1a1a1a;">${order.customer_name || 'غير معروف'}</div>
                <div style="font-size:0.82rem; color:#15803d;">${order.customer_email || '—'}</div>
                <div style="font-size:0.82rem; color:#64748b;">${order.phone || order.customer_phone || order.mobile || '—'}</div>
              </div>
              <div style="background:#f8fafc; border-radius:10px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:4px;">طريقة الدفع</div>
                <div style="font-size:0.9rem; font-weight:800; color:#1a1a1a;">${paymentLabels[order.payment_method] || order.payment_method}</div>
                <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">الحالة: ${order.payment_status || 'pending'}</div>
              </div>
              <div style="background:#f8fafc; border-radius:10px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:4px;">الشحن</div>
                <div style="font-size:0.9rem; font-weight:800; color:#1a1a1a;">${shippingLabels[order.shipping_type] || 'شحن عادي (2-5 أيام عمل)'}</div>
                <div style="font-size:0.82rem; color:#64748b;">${addressParts.join('، ')}</div>
              </div>
              <div style="background:#f8fafc; border-radius:10px; padding:14px 16px;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:4px;">المنتجات</div>
                <div style="font-size:0.82rem; color:#1a1a1a; line-height:1.7;">${itemsList}</div>
                <div style="font-size:0.85rem; font-weight:900; color:#15803d; margin-top:8px;">
                  الإجمالي: ${orderTotal.toFixed(0)} ج.م
                </div>
              </div>
            </div>
            <div style="text-align:center; margin-top:20px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://zaitandfilters.com'}/admin/orders/${order.id}"
                 style="display:inline-block; padding:12px 24px; background:#15803d; color:#fff; border-radius:10px; text-decoration:none; font-weight:800; font-size:0.85rem;">
                عرض الطلب في لوحة التحكم
              </a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>`;
}

function buildOrderConfirmationHtml(order: any): string {
  const orderNum = order.id.slice(0, 8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const paymentLabels: Record<string, string> = {
    instapay: 'InstaPay',
    card_installments: 'بطاقة / تقسيط',
    wallets: 'محفظة إلكترونية',
    cash: 'الدفع عند الاستلام',
  };

  const isManualReview = ['instapay', 'wallets'].includes(order.payment_method);

  const shippingLabels: Record<string, string> = {
    express: 'شحن سريع (48 ساعة)',
    standard: 'شحن عادي (2-5 أيام عمل)',
  };

  const itemsHtml = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
        <table cellpadding="0" cellspacing="0" style="width:100%">
          <tr>
            ${item.image_url ? `
            <td style="width:48px; padding-left: 12px; vertical-align: top;">
              <img src="${item.image_url?.replace('/image/upload/', '/image/upload/f_auto,q_auto/') || ''}" width="48" height="48"
                style="border-radius:8px; object-fit:contain; background:#f8fafc; border:1px solid #e2e8f0;" />
            </td>` : ''}
            <td style="vertical-align: middle;">
              <div style="font-size:0.9rem; font-weight:700; color:#0f172a;">${item.name}</div>
              ${item.brand ? `<div style="font-size:0.75rem; color:#22c55e; font-weight:600;">${item.brand}</div>` : ''}
            </td>
            <td style="text-align:center; vertical-align:middle; white-space:nowrap; padding:0 8px;">
              <span style="background:#f0fdf4; color:#16a34a; padding:2px 8px; border-radius:6px; font-size:0.8rem; font-weight:800;">
                ×${item.quantity}
              </span>
            </td>
            <td style="text-align:left; vertical-align:middle; white-space:nowrap;">
              <div style="font-size:0.9rem; font-weight:800; color:#0f172a;">
                ${(parseFloat(item.price) * item.quantity).toFixed(0)} ج.م
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const shipping = order.shipping_cost || 0;
  const discount = order.discount_applied || 0;
  const walletDisc = order.wallet_discount || 0;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تأكيد الطلب - زيت أند فلترز</title>
</head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction:rtl;">

  <table cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a2f 100%);
                        border-radius: 20px 20px 0 0; padding: 36px 40px; text-align:center;">
              <div style="font-size:2rem; font-weight:900; font-style:italic; color:#fff; letter-spacing:-1px;">
                ZAIT <span style="color:#22c55e;">&amp; FILTERS</span>
              </div>
              <div style="color:rgba(255,255,255,0.7); font-size:0.9rem; margin-top:6px;">
                تم تأكيد طلبك بنجاح ✅
              </div>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background:#fff; padding: 40px;">

              <!-- Success Message -->
              <div style="text-align:center; margin-bottom: 32px;">
                <div style="font-size:3rem; margin-bottom:10px;">🎉</div>
                <div style="font-size:1.5rem; font-weight:900; color:#0f172a; margin-bottom:6px;">
                  شكراً لطلبك، ${order.customer_name}!
                </div>
                <div style="font-size:0.9rem; color:#64748b; line-height:1.7;">
                  تم استلام طلبك رقم <strong style="color:#15803d;">#${orderNum}</strong> وسيتم تجهيزه قريباً.
                </div>
              </div>

              <!-- Order Info Box -->
              <table cellpadding="0" cellspacing="0" width="100%"
                     style="background:#f8fafc; border-radius:14px; margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:0.8rem; color:#64748b; padding-bottom:8px;">رقم الطلب</td>
                        <td style="text-align:left; font-size:0.9rem; font-weight:800; color:#0f172a; padding-bottom:8px;">#${orderNum}</td>
                      </tr>
                      <tr>
                        <td style="font-size:0.8rem; color:#64748b; padding-bottom:8px;">تاريخ الطلب</td>
                        <td style="text-align:left; font-size:0.9rem; font-weight:700; color:#0f172a; padding-bottom:8px;">${orderDate}</td>
                      </tr>
                      <tr>
                        <td style="font-size:0.8rem; color:#64748b; padding-bottom:8px;">وسيلة الدفع</td>
                        <td style="text-align:left; font-size:0.9rem; font-weight:700; color:#0f172a; padding-bottom:8px;">${paymentLabels[order.payment_method] || order.payment_method}</td>
                      </tr>
                      <tr>
                        <td style="font-size:0.8rem; color:#64748b;">طريقة الشحن</td>
                        <td style="text-align:left; font-size:0.9rem; font-weight:700; color:#0f172a;">${shippingLabels[order.shipping_type] || 'شحن عادي (2-5 أيام عمل)'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Products -->
              <div style="font-size:0.8rem; font-weight:800; color:#94a3b8; margin-bottom:12px;">
                منتجات الطلب
              </div>
              <table cellpadding="0" cellspacing="0" width="100%"
                     style="border:1px solid #f1f5f9; border-radius:14px; overflow:hidden; margin-bottom:24px;">
                ${itemsHtml}
                <!-- Totals -->
                <tr>
                  <td style="padding: 16px 20px; background:#f8fafc; border-top:1px solid #f1f5f9;">
                    <table cellpadding="0" cellspacing="0" width="100%" style="font-size:0.85rem;">
                      <tr>
                        <td style="color:#64748b; padding-bottom:6px;">المجموع الفرعي</td>
                        <td style="text-align:left; font-weight:700; color:#0f172a; padding-bottom:6px;">
                          ${(order.total_price - shipping + discount + walletDisc).toFixed(0)} ج.م
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#64748b; padding-bottom:6px;">الشحن</td>
                        <td style="text-align:left; font-weight:700; color:#0f172a; padding-bottom:6px;">
                          ${shipping > 0 ? shipping.toFixed(0) + ' ج.م' : 'مجاني'}
                        </td>
                      </tr>
                      ${discount > 0 ? `
                      <tr>
                        <td style="color:#64748b; padding-bottom:6px;">الخصم</td>
                        <td style="text-align:left; font-weight:700; color:#ef4444; padding-bottom:6px;">
                          -${discount.toFixed(0)} ج.م
                        </td>
                      </tr>` : ''}
                      ${walletDisc > 0 ? `
                      <tr>
                        <td style="color:#64748b; padding-bottom:6px;">خصم المحفظة</td>
                        <td style="text-align:left; font-weight:700; color:#15803d; padding-bottom:6px;">
                          -${walletDisc.toFixed(0)} ج.م
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; background: linear-gradient(135deg, #0f172a, #1e293b);">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color:rgba(255,255,255,0.6); font-size:0.85rem; font-weight:700;">الإجمالي المدفوع</td>
                        <td style="text-align:left; color:#22c55e; font-size:1.2rem; font-weight:900;">
                          ${order.total_price.toFixed(0)} ج.م
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Shipping Address -->
              <table cellpadding="0" cellspacing="0" width="100%"
                     style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:0.85rem; font-weight:800; color:#15803d; margin-bottom:10px;">
                      🚚 عنوان التوصيل
                    </div>
                    <div style="font-size:0.9rem; font-weight:700; color:#0f172a; margin-bottom:4px;">
                      ${order.customer_name}
                    </div>
                    <div style="font-size:0.85rem; color:#475569; line-height:1.6;">
                      ${order.customer_address || ''}
                    </div>
                    <div style="font-size:0.85rem; color:#15803d; font-weight:600; margin-top:4px;">
                      ${order.city || ''}
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; direction:ltr; margin-top:6px; padding-top:8px; border-top:1px solid #dcfce7;">
                      📞 ${order.customer_phone}
                    </div>
                  </td>
                </tr>
              </table>

              ${isManualReview ? `<!-- Payment Review Notice -->
              <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:20px 24px; margin-bottom:24px;">
                <div style="font-size:0.85rem; font-weight:800; color:#991b1b; margin-bottom:8px;">
                  ⏳ قيد المراجعة
                </div>
                <div style="font-size:0.82rem; color:#7f1d1d; line-height:1.8;">
                  سيتم مراجعة عملية الدفع خلال <strong>24 ساعة</strong>. بعد تأكيد الدفع، سيتم تحديث حالة الطلب وإعلامك.
                </div>
              </div>` : ''}

              <!-- Next Steps -->
              <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:14px; padding:20px 24px; margin-bottom:24px;">
                <div style="font-size:0.85rem; font-weight:800; color:#92400e; margin-bottom:10px;">
                  📋 ${isManualReview ? 'بعد تأكيد الدفع' : 'الخطوات التالية'}
                </div>
                <div style="font-size:0.82rem; color:#78350f; line-height:1.8;">
                  <div>1. سيتم تجهيز طلبك خلال <strong>24 ساعة</strong></div>
                  <div>2. سيتم شحنه خلال <strong>2-5 أيام عمل</strong></div>
                  <div>3. سيتم إعلامك عند الشحن</div>
                  <div>4. يمكنك متابعة حالة الطلب من حسابك</div>
                </div>
              </div>

              <!-- Divider -->
              <div style="height:1px; background:#f1f5f9; margin-bottom:24px;"></div>

              <!-- Support -->
              <div style="text-align:center; margin-bottom:10px;">
                <div style="font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:8px;">
                  لديك استفسار؟ تواصل معنا
                </div>
                <div style="font-size:0.85rem; color:#15803d; font-weight:700;">
                  📞 01023862436
                </div>
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a, #1e293b);
                        border-radius: 0 0 20px 20px; padding: 28px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size:1rem; font-weight:900; font-style:italic; color:#fff;">
                      ZAIT <span style="color:#22c55e;">&amp; FILTERS</span>
                    </div>
                    <div style="color:rgba(255,255,255,0.35); font-size:0.7rem; margin-top:3px;">
                      zaitandfilters.com
                    </div>
                  </td>
                  <td style="text-align:left;">
                    <div style="color:#22c55e; font-size:0.78rem; font-weight:700;">شكراً لثقتكم بنا</div>
                    <div style="color:rgba(255,255,255,0.3); font-size:0.68rem; margin-top:2px;">
                      قطع غيار السيارات الأصلية
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, orderData } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Use inline orderData if provided (avoids Supabase fetch timing issues),
    // otherwise fetch from DB (for server-side calls like webhooks)
    let order;
    if (orderData) {
      order = orderData;
    } else {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        console.error('[OrderConfirmation] Order not found:', orderId, error);
        return NextResponse.json({ error: 'Order not found: ' + (error?.message || 'unknown') }, { status: 404 });
      }
      order = data;
    }

    if (!order.customer_email) {
      console.warn('[OrderConfirmation] No email on order:', orderId);
      return NextResponse.json({ error: 'No customer email' }, { status: 400 });
    }

    const resend = getResendClient();
    if (!resend) {
      console.error('[OrderConfirmation] Resend not configured — RESEND_API_KEY is missing');
      return NextResponse.json({ error: 'Email service not configured: RESEND_API_KEY not set' }, { status: 500 });
    }

    const html = buildOrderConfirmationHtml(order);

    const { data, error: emailError } = await resend.emails.send({
      from: 'Zait and Filters <orders@zaitandfilters.com>',
      to: order.customer_email,
      subject: `✅ تم تأكيد طلبك #${order.id.slice(0, 8).toUpperCase()} - زيت أند فلترز`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw emailError;
    }

    console.log('✅ Order confirmation email sent:', data?.id);

    // ── Admin notification ───────────────────────────────────────────────
    try {
      const adminHtml = buildAdminNotificationHtml(order);
      await resend.emails.send({
        from: 'Zait and Filters <orders@zaitandfilters.com>',
        to: 'zaitandfilter@gmail.com',
        subject: `🔔 طلب جديد #${order.id.slice(0, 8).toUpperCase()} - ${order.customer_name || 'غير معروف'}`,
        html: adminHtml,
      });
      console.log('✅ Admin notification sent for order:', order.id);
    } catch (adminErr) {
      // Don't fail the request if admin notification fails
      console.error('❌ Admin notification failed:', adminErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Order confirmation email sent',
      emailId: data?.id,
    });

  } catch (error: any) {
    console.error('❌ Error sending order confirmation:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send email',
    }, { status: 500 });
  }
}
