import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Email the customer that their phone has no WhatsApp and how to fix it.
async function sendNoWhatsappEmail(order: { id: string; customer_email?: string | null; customer_name?: string | null }) {
  if (!order.customer_email || !process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const ref = order.id.slice(0, 8).toUpperCase();
    const name = order.customer_name || 'عميلنا العزيز';
    const link = 'https://zaitandfilters.com/my-orders';
    const html = `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f4f6f8;padding:24px;color:#1a1a1a;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:22px 24px;color:#fff;">
          <div style="font-size:1.3rem;font-weight:900;">زيت أند فلترز</div>
        </div>
        <div style="padding:26px 24px;">
          <h2 style="margin:0 0 12px;font-size:1.15rem;color:#14532d;">طلبك بحاجة إلى رقم واتساب للمتابعة</h2>
          <p style="font-size:0.95rem;line-height:1.9;color:#374151;margin:0 0 14px;">
            مرحباً ${name}،<br/>
            حاولنا التواصل معك بخصوص طلبك رقم <strong>#${ref}</strong>، لكن الرقم المسجّل على الطلب
            <strong>لا يحتوي على حساب واتساب</strong>، ولذلك لم نتمكن من متابعة الطلب.
          </p>
          <p style="font-size:0.95rem;line-height:1.9;color:#374151;margin:0 0 20px;">
            من فضلك اذهب إلى صفحة طلباتك وأضف رقم واتساب صحيح حتى نتمكن من إعادة تفعيل طلبك ومتابعته معك.
          </p>
          <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:900;font-size:1rem;padding:13px 28px;border-radius:12px;">
            إضافة رقم واتساب لطلبي
          </a>
          <p style="font-size:0.8rem;color:#9ca3af;margin:22px 0 0;line-height:1.7;">
            إذا لم يظهر الزر، افتح الرابط التالي:<br/>
            <span style="color:#16a34a;direction:ltr;display:inline-block;">${link}</span>
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:0.75rem;color:#9ca3af;">
          زيت أند فلترز · قطع غيار السيارات
        </div>
      </div>
    </div>`;

    await resend.emails.send({
      from: 'Zait and Filters <orders@zaitandfilters.com>',
      to: order.customer_email,
      subject: `⚠️ طلبك #${ref} بحاجة إلى رقم واتساب للمتابعة - زيت أند فلترز`,
      html,
    });
    console.log('✅ No-WhatsApp email sent for order:', order.id);
  } catch (err) {
    console.error('❌ No-WhatsApp email failed:', err);
  }
}

export async function POST(req: Request) {
  try {
    const { orderId, newStatus, forceCashback, banCod, cancelReason } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    const db = makeAdmin();

    // Update order status (skip if forceCashback-only call keeping existing status)
    if (!forceCashback) {
      const { error: orderError } = await db
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (orderError) throw orderError;

      // Optional cancellation/reactivation metadata — never block the status change
      // if the columns aren't present yet (migration 013).
      const meta: Record<string, any> = {};
      if (newStatus === 'cancelled') {
        if (cancelReason) meta.cancel_reason = cancelReason;
      } else {
        // Reactivating (moving out of cancelled) clears the reason + reactivation flag
        meta.cancel_reason = null;
        meta.whatsapp_reactivation_requested = false;
        // If the customer submitted a new WhatsApp number, promote it to the
        // order's phone so staff can see/contact them on it.
        const { data: o } = await db
          .from('orders')
          .select('new_whatsapp_number, whatsapp_reactivation_requested')
          .eq('id', orderId)
          .single();
        if (o?.whatsapp_reactivation_requested && o?.new_whatsapp_number) {
          meta.customer_phone = o.new_whatsapp_number;
          meta.guest_phone = o.new_whatsapp_number;
        }
      }
      if (Object.keys(meta).length) {
        const { error: metaErr } = await db.from('orders').update(meta).eq('id', orderId);
        if (metaErr) console.warn('order metadata update skipped:', metaErr.message);
      }
    }

    if (newStatus === 'delivered' || forceCashback) {
      const deliveryDate = new Date().toISOString();
      const releaseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      if (!forceCashback) {
        // Move commission to "in_review" and set the 14-day release date
        // (pending_balance was already updated at order placement — no need to add again)
        await db
          .from('affiliate_commissions')
          .update({ delivery_date: deliveryDate, release_date: releaseDate, status: 'in_review' })
          .eq('order_id', orderId);
      }

      // Award cashback — pass forceOverride=true to re-award even if already awarded
      const cashbackAmount = await awardCashbackOnDelivery(orderId, !!forceCashback);
      if (forceCashback) {
        return NextResponse.json({ success: true, cashbackAmount });
      }
    }

    // When an order is cancelled, revert any abandoned cart that was recovered by it
    if (newStatus === 'cancelled') {
      await db
        .from('abandoned_carts')
        .update({ recovered: false, recovered_at: null })
        .eq('recovery_order_id', orderId)
        .eq('recovered', true);

      // Cancelled for "no WhatsApp": email the customer to add a valid number
      if (cancelReason === 'no_whatsapp') {
        const { data: emailOrder } = await db
          .from('orders')
          .select('id, customer_email, customer_name')
          .eq('id', orderId)
          .single();
        if (emailOrder?.customer_email) {
          await sendNoWhatsappEmail(emailOrder);
        }
      }

      // Ban customer from COD if requested
      if (banCod) {
        const { data: orderData } = await db
          .from('orders')
          .select('user_id, customer_phone, customer_name')
          .eq('id', orderId)
          .single();

        if (orderData) {
          // Check for existing ban to avoid duplicates
          const { data: existingBan } = await db
            .from('cod_bans')
            .select('id')
            .eq('order_id', orderId)
            .maybeSingle();

          if (!existingBan) {
            await db.from('cod_bans').insert({
              user_id: orderData.user_id || null,
              customer_phone: orderData.customer_phone,
              customer_name: orderData.customer_name,
              order_id: orderId,
              reason: 'تم الإلغاء من قبل الإدارة',
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('update-order-status error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function awardCashbackOnDelivery(orderId: string, forceOverride = false): Promise<number> {
  const db = makeAdmin();
  try {
    const { data: order, error: orderErr } = await db
      .from('orders')
      .select('user_id, total_price, shipping_cost, discount_applied, wallet_discount, promo_code, payment_method')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error('[cashback] Could not fetch order:', orderErr?.message);
      return 0;
    }

    const { user_id, total_price, shipping_cost, discount_applied, wallet_discount, promo_code, payment_method } = order as {
      user_id: string | null; total_price: number;
      shipping_cost: number | null; discount_applied: number | null;
      wallet_discount: number | null; promo_code: string | null;
      payment_method: string | null;
    };

    if (!user_id) return 0;
    // No cashback on cash-on-delivery orders
    if (payment_method === 'cash') {
      console.log('[cashback] Skipped — cash on delivery');
      return 0;
    }
    // Never award cashback on orders that used a promo code — not even via admin force-override
    if (promo_code) {
      console.log(`[cashback] Skipped — promo "${promo_code}" (no cashback with promo codes)`);
      return 0;
    }

    // Duplicate check (skip if forceOverride = manual re-apply)
    const orderRef = orderId.slice(0, 8).toUpperCase();
    if (!forceOverride) {
      const { data: existing } = await db
        .from('wallet_transactions').select('id')
        .eq('user_id', user_id).eq('type', 'cashback')
        .ilike('description', `%${orderRef}%`).maybeSingle();
      if (existing) { console.log(`[cashback] Already awarded`); return 0; }
    }

    const { data: settings } = await db
      .from('cashback_settings').select('cashback_percentage, is_enabled').single();
    if (!(settings as any)?.is_enabled) { console.log('[cashback] Disabled'); return 0; }

    const pct: number = (settings as any)?.cashback_percentage ?? 5;
    const finalTotal   = parseFloat(String(total_price))     || 0;
    const shipping     = parseFloat(String(shipping_cost))   || 0;
    const discApplied  = parseFloat(String(discount_applied))|| 0;
    const walletUsed   = parseFloat(String(wallet_discount)) || 0;
    const subtotal     = parseFloat((finalTotal - shipping + discApplied + walletUsed).toFixed(2));
    const base         = subtotal > 0 ? subtotal : finalTotal;
    const cashbackAmount = parseFloat((base * pct / 100).toFixed(2));
    if (cashbackAmount <= 0) return 0;

    const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user_id).maybeSingle();
    const currentBalance: number = (wallet as any)?.balance ?? 0;
    const newBalance = parseFloat((currentBalance + cashbackAmount).toFixed(2));

    const { error: walletErr } = await db.from('wallets')
      .upsert({ user_id, balance: newBalance }, { onConflict: 'user_id' });
    if (walletErr) { console.error('[cashback] Wallet upsert failed:', walletErr.message); return 0; }

    const { error: txErr } = await db.from('wallet_transactions').insert({
      user_id, amount: cashbackAmount, type: 'cashback',
      description: `كاش باك ${pct}% - طلب #${orderRef}`, balance_after: newBalance,
    });
    if (txErr) { console.error('[cashback] TX insert failed:', txErr.message); return 0; }

    // Save to order record so it shows in admin and customer profile
    await db.from('orders').update({ cashback_amount: cashbackAmount }).eq('id', orderId);
    console.log(`[cashback] ✅ ${cashbackAmount} EGP → user ${user_id} (order ${orderId})`);
    return cashbackAmount;
  } catch (err: any) {
    console.error('[cashback] Unexpected error:', err.message);
    return 0;
  }
}
