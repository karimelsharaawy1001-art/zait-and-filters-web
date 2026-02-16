import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { cartId, customerEmail } = await request.json();

    // Get cart details
    const { data: cart, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('id', cartId)
      .single();

    if (error || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    // TODO: Integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll just log it
    console.log('Sending recovery email to:', customerEmail);
    console.log('Cart total:', cart.cart_total);
    
    // Example email content
    const emailContent = {
      to: customerEmail,
      subject: '🛒 لقد تركت منتجات في سلتك!',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>مرحباً ${cart.customer_name || 'عزيزي العميل'}! 👋</h2>
          <p>لاحظنا أنك تركت منتجات رائعة في سلتك بقيمة <strong>${cart.cart_total?.toFixed(2)} ج.م</strong></p>
          
          <h3>منتجاتك في انتظارك:</h3>
          <ul>
            ${cart.cart_items?.map((item: any) => `
              <li>${item.name} - ${item.quantity} قطعة - ${(parseFloat(item.price) * item.quantity).toFixed(2)} ج.م</li>
            `).join('')}
          </ul>
          
          <p><strong>احصل على خصم 5% باستخدام كود: COMEBACK5</strong></p>
          
          <a href="https://zaitandfilters.com/checkout" style="display: inline-block; padding: 15px 30px; background: #15803d; color: #fff; text-decoration: none; border-radius: 10px; font-weight: bold; margin-top: 20px;">
            أكمل طلبك الآن
          </a>
          
          <p style="margin-top: 30px; color: #666; font-size: 0.9rem;">
            هذا العرض صالح لمدة 48 ساعة فقط!
          </p>
        </div>
      `
    };

    // Here you would call your email service API
    // await sendEmail(emailContent);

    return NextResponse.json({ success: true, message: 'Email sent successfully' });

  } catch (error: any) {
    console.error('Error sending recovery email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
