// app/api/send-cart-email/route.ts
// Sends a rich HTML abandoned cart reminder email via Resend
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_API_URL = 'https://api.resend.com/emails';

// ── Build the promo code ──────────────────────────────────────────────────────
function generatePromoCode(cartId: string): string {
  return `BACK-${cartId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

// ── HTML email template ───────────────────────────────────────────────────────
function buildEmailHtml(params: {
  customerName: string;
  items: { name: string; price: number; quantity: number; image_url?: string; brand?: string }[];
  cartTotal: number;
  promoCode: string;
  checkoutUrl: string;
}): string {
  const { customerName, items, cartTotal, promoCode, checkoutUrl } = params;
  const discountedTotal = (cartTotal * 0.95).toFixed(2);

  const itemsHtml = items.slice(0, 4).map(item => `
    <tr>
      <td style="padding: 14px 20px; border-bottom: 1px solid #f1f5f9;">
        <table cellpadding="0" cellspacing="0" style="width:100%">
          <tr>
            ${item.image_url ? `
            <td style="width:56px; padding-left: 14px; vertical-align: top;">
              <img src="${item.image_url?.replace('/image/upload/', '/image/upload/f_auto,q_auto/') || ''}" width="56" height="56"
                style="border-radius:10px; object-fit:contain; background:#f8fafc; border:1px solid #e2e8f0;" />
            </td>` : ''}
            <td style="vertical-align: middle;">
              <div style="font-size:0.92rem; font-weight:700; color:#0f172a; margin-bottom:3px;">${item.name}</div>
              ${item.brand ? `<div style="font-size:0.78rem; color:#22c55e; font-weight:600;">${item.brand}</div>` : ''}
              <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">الكمية: ${item.quantity}</div>
            </td>
            <td style="text-align:left; vertical-align:middle; white-space:nowrap;">
              <div style="font-size:0.95rem; font-weight:800; color:#0f172a;">${(item.price * item.quantity).toFixed(0)} ج.م</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>سلتك بتستناك 🛒</title>
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
              <div style="color:rgb(255, 255, 255); font-size:1.00rem; letter-spacing:2px; margin-top:4px;">
                .أكبر موقع لقطع الغيار الأصلية و البديلة في مصر
              </div>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background:#fff; padding: 40px;">

              <!-- Greeting -->
              <div style="font-size:1.4rem; font-weight:900; color:#0f172a; margin-bottom:8px;">
                إزيك يا ${customerName}! 👋
              </div>
              <div style="font-size:0.95rem; color:#64748b; line-height:1.7; margin-bottom:28px;">
                لاحظنا إنك سبت بعض المنتجات في سلتك من غير ما تكمل الطلب.
                إحنا فاهمين إن الواحد ممكن يتشتت، عشان كده حفظنالك السلة وجهّزنالك
                <strong style="color:#0f172a;">مفاجأة صغيرة 🎁</strong>
              </div>

              <!-- Divider -->
              <div style="height:1px; background:#f1f5f9; margin-bottom:28px;"></div>

              <!-- Cart items -->
              <div style="font-size:0.8rem; font-weight:800; color:#94a3b8; letter-spacing:0.5px;
                           text-transform:uppercase; margin-bottom:12px;">
                منتجاتك المحجوزة
              </div>
              <table cellpadding="0" cellspacing="0" width="100%"
                     style="border:1px solid #f1f5f9; border-radius:14px; overflow:hidden; margin-bottom:24px;">
                ${itemsHtml}
                <tr>
                  <td style="padding: 16px 20px; background:#f8fafc;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:0.85rem; color:#64748b;">إجمالي السلة</td>
                        <td style="text-align:left; font-size:0.9rem; font-weight:700; color:#0f172a;">
                          ${cartTotal.toFixed(0)} ج.م
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Promo code box -->
              <table cellpadding="0" cellspacing="0" width="100%"
                     style="background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                            border: 1.5px solid #86efac; border-radius: 16px;
                            margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px 28px;">
                    <div style="font-size:0.82rem; font-weight:700; color:#15803d; margin-bottom:6px;">
                      🎁 كود خصم خاص بيك — ساري لمدة 48 ساعة فقط
                    </div>
                    <div style="font-size:1.8rem; font-weight:900; color:#0f172a;
                                font-family: 'Courier New', monospace; letter-spacing:3px;
                                background:#fff; border:2px dashed #86efac; border-radius:10px;
                                padding: 12px 20px; text-align:center; margin: 10px 0;">
                      ${promoCode}
                    </div>
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">
                      <tr>
                        <td style="font-size:0.85rem; color:#15803d;">
                          بعد الخصم (5%)
                        </td>
                        <td style="text-align:left;">
                          <span style="font-size:1.1rem; font-weight:900; color:#15803d;">
                            ${discountedTotal} ج.م
                          </span>
                          <span style="font-size:0.8rem; color:#94a3b8; text-decoration:line-through; margin-right:6px;">
                            ${cartTotal.toFixed(0)} ج.م
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center; margin-bottom:28px;">
                <a href="${checkoutUrl}"
                   style="display:inline-block; background: linear-gradient(135deg, #22c55e, #15803d);
                          color:#fff; text-decoration:none; font-size:1rem; font-weight:900;
                          padding: 16px 48px; border-radius:14px;
                          box-shadow: 0 8px 24px rgba(34,197,94,0.35);">
                  أكمل طلبك دلوقتي ←
                </a>
                <div style="font-size:0.75rem; color:#94a3b8; margin-top:10px;">
                  استخدم الكود في خانة الكوبون عند الدفع
                </div>
              </div>

              <!-- Divider -->
              <div style="height:1px; background:#f1f5f9; margin-bottom:24px;"></div>

              <!-- Trust badges -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align:center; padding: 0 8px;">
                    <div style="font-size:1.4rem;">🚚</div>
                    <div style="font-size:0.75rem; font-weight:700; color:#0f172a; margin-top:4px;">توصيل لكل مصر</div>
                    <div style="font-size:0.7rem; color:#94a3b8;">2 – 5 أيام عمل</div>
                  </td>
                  <td style="text-align:center; padding: 0 8px;">
                    <div style="font-size:1.4rem;">🛡️</div>
                    <div style="font-size:0.75rem; font-weight:700; color:#0f172a; margin-top:4px;">ضمان 6 شهور</div>
                    <div style="font-size:0.7rem; color:#94a3b8;">على جميع المنتجات</div>
                  </td>
                  <td style="text-align:center; padding: 0 8px;">
                    <div style="font-size:1.4rem;">💳</div>
                    <div style="font-size:0.75rem; font-weight:700; color:#0f172a; margin-top:4px;">دفع آمن</div>
                    <div style="font-size:0.7rem; color:#94a3b8;">InstaPay · كاش · تقسيط</div>
                  </td>
                  <td style="text-align:center; padding: 0 8px;">
                    <div style="font-size:1.4rem;">🎁</div>
                    <div style="font-size:0.75rem; font-weight:700; color:#0f172a; margin-top:4px;">كاش باك</div>
                    <div style="font-size:0.7rem; color:#94a3b8;">على كل طلب</div>
                  </td>
                </tr>
              </table>

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
                      لو مش عايز تستلم إيميلات، تقدر تتجاهله
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

// ── API Handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { cartId } = await req.json();
    if (!cartId) return NextResponse.json({ error: 'cartId required' }, { status: 400 });

    // Fetch cart from DB
    const { data: cart, error: cartError } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('id', cartId)
      .single();

    if (cartError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    if (!cart.customer_email) {
      return NextResponse.json({ error: 'No email on this cart' }, { status: 400 });
    }

    // Generate / reuse promo code
    const promoCode = cart.reminder_promo_code || generatePromoCode(cartId);

    // Save coupon to DB
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 2);
    const { error: couponError } = await supabase.from('coupons').upsert({
      code: promoCode,
      discount_type: 'percentage',
      discount_value: 5,
      is_active: true,
      expiry_date: expiry.toISOString(),
    }, { onConflict: 'code' });

    if (couponError) {
      return NextResponse.json({ error: 'Failed to create coupon: ' + couponError.message }, { status: 500 });
    }

    // Build email HTML
    const html = buildEmailHtml({
      customerName: cart.customer_name || 'عزيزنا',
      items: cart.cart_items || [],
      cartTotal: cart.cart_total || 0,
      promoCode,
      checkoutUrl: 'https://zaitandfilters.com/checkout',
    });

    // Send via Resend
    const resendRes = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@zaitandfilters.com>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Zait and Filters <orders@zaitandfilters.com>',
        to: [cart.customer_email],
        subject: `${cart.customer_name ? cart.customer_name + '،' : ''} حجزنالك منتجاتك و عملنالك عليها خصم كمان`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error('[Resend Error]', err);
      return NextResponse.json({ error: 'Email send failed: ' + err }, { status: 500 });
    }

    // Mark email sent in DB
    await supabase.from('abandoned_carts').update({
      recovery_email_sent: true,
      recovery_email_sent_at: new Date().toISOString(),
      reminder_promo_code: promoCode,
      reminder_sent: true,
      reminder_sent_at: new Date().toISOString(),
    }).eq('id', cartId);

    return NextResponse.json({ success: true, promoCode });

  } catch (err: any) {
    console.error('[Cart Email Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}