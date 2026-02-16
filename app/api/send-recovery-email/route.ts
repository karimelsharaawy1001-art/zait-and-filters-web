import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use environment variables properly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { cartId, customerEmail } = await request.json();

    if (!cartId || !customerEmail) {
      return NextResponse.json({ 
        error: 'Missing required fields: cartId and customerEmail' 
      }, { status: 400 });
    }

    // Get cart details
    const { data: cart, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('id', cartId)
      .single();

    if (error || !cart) {
      console.error('Cart not found:', error);
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    // Log the recovery email action
    console.log('📧 Sending recovery email to:', customerEmail);
    console.log('🛒 Cart ID:', cartId);
    console.log('💰 Cart total:', cart.cart_total);
    
    // TODO: Integrate with your email service (SendGrid, Resend, etc.)
    // Example email content structure
    const emailContent = {
      to: customerEmail,
      subject: '🛒 لقد تركت منتجات في سلتك - زيت أند فلترز',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: #fff; border-radius: 20px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #15803d; margin-bottom: 20px;">مرحباً ${cart.customer_name || 'عزيزي العميل'}! 👋</h2>
            <p style="font-size: 16px; color: #333; line-height: 1.8;">
              لاحظنا أنك تركت منتجات رائعة في سلتك بقيمة <strong style="color: #15803d;">${cart.cart_total?.toFixed(2)} ج.م</strong>
            </p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <h3 style="color: #15803d; margin-bottom: 15px;">منتجاتك في انتظارك:</h3>
              <ul style="list-style: none; padding: 0;">
                ${cart.cart_items?.map((item: any) => `
                  <li style="padding: 10px 0; border-bottom: 1px solid #dcfce7;">
                    <strong>${item.name}</strong><br/>
                    <span style="color: #666;">الكمية: ${item.quantity} - السعر: ${(parseFloat(item.price) * item.quantity).toFixed(2)} ج.م</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">
                🎁 احصل على خصم 10% باستخدام كود: <span style="color: #b45309;">COMEBACK10</span>
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://zaitandfilters.com/checkout" 
                 style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #15803d 0%, #166534 100%); color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(21, 128, 61, 0.3);">
                أكمل طلبك الآن 🚀
              </a>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 13px; text-align: center;">
              ⏰ هذا العرض صالح لمدة 48 ساعة فقط!<br/>
              <span style="color: #15803d; font-weight: bold;">زيت أند فلترز</span> - وجهتك لقطع غيار السيارات الأصلية
            </p>
          </div>
        </div>
      `
    };

    // Here you would integrate with your email service
    // Example with Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'ZaitAndFilters <orders@zaitandfilters.com>',
      to: emailContent.to,
      subject: emailContent.subject,
      html: emailContent.html
    });
    */

    // For now, just log it
    console.log('✅ Email content prepared successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Recovery email queued successfully',
      emailContent // Remove this in production
    });

  } catch (error: any) {
    console.error('❌ Error sending recovery email:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
