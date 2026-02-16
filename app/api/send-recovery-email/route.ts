import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Don't initialize at build time
let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function POST(request: NextRequest) {
  try {
    const { cartId, customerEmail } = await request.json();

    if (!cartId || !customerEmail) {
      return NextResponse.json({ 
        error: 'Missing required fields: cartId and customerEmail' 
      }, { status: 400 });
    }

    // Initialize Supabase only at runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Get Resend client
    const resend = getResendClient();
    
    if (!resend) {
      console.error('Resend not configured');
      return NextResponse.json({ 
        error: 'Email service not configured' 
      }, { status: 500 });
    }

    // Send email using Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'زيت أند فلترز <orders@sales.zaitandfilters.com>',
      to: customerEmail,
      subject: '🛒 لقد تركت منتجات في سلتك - زيت أند فلترز',
      html: `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #ffffff; border-radius: 20px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #15803d; font-size: 28px; margin: 0; font-weight: 900; font-style: italic; letter-spacing: 1px;">
                  ZAIT & FILTERS
                </h1>
                <p style="color: #666; font-size: 14px; margin-top: 5px;">قطع غيار السيارات الأصلية</p>
              </div>

              <!-- Main Content -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #15803d; font-size: 24px; margin-bottom: 15px;">
                  مرحباً ${cart.customer_name || 'عزيزي العميل'}! 👋
                </h2>
                <p style="font-size: 16px; color: #333; line-height: 1.8; margin-bottom: 20px;">
                  لاحظنا أنك تركت منتجات رائعة في سلتك بقيمة 
                  <strong style="color: #15803d; font-size: 20px;">${cart.cart_total?.toFixed(2)} ج.م</strong>
                </p>
              </div>

              <!-- Products Section -->
              <div style="background: #f0fdf4; padding: 25px; border-radius: 15px; margin-bottom: 25px;">
                <h3 style="color: #15803d; margin: 0 0 20px 0; font-size: 18px;">
                  📦 منتجاتك في انتظارك:
                </h3>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  ${cart.cart_items?.map((item: any) => `
                    <div style="background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #dcfce7;">
                      <div style="font-weight: bold; font-size: 15px; color: #1a1a1a; margin-bottom: 5px;">
                        ${item.name}
                      </div>
                      <div style="font-size: 13px; color: #666; margin-bottom: 3px;">
                        <strong>${item.brand || ''}</strong> ${item.car_make || ''} ${item.car_model || ''} ${item.car_model_year || ''}
                      </div>
                      <div style="font-size: 14px; color: #15803d; font-weight: bold;">
                        ${item.quantity} قطعة × ${parseFloat(item.price).toFixed(2)} ج.م = ${(item.quantity * parseFloat(item.price)).toFixed(2)} ج.م
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Discount Offer -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 15px; margin-bottom: 25px; text-align: center; border: 2px dashed #f59e0b;">
                <p style="margin: 0; font-size: 20px; font-weight: bold; color: #92400e;">
                  🎁 عرض خاص لك!
                </p>
                <p style="margin: 10px 0 0 0; font-size: 16px; color: #78350f;">
                  احصل على خصم <strong style="font-size: 24px; color: #b45309;">10%</strong> باستخدام كود:
                </p>
                <div style="background: #fff; display: inline-block; padding: 12px 30px; border-radius: 10px; margin-top: 10px; border: 2px solid #f59e0b;">
                  <span style="font-size: 24px; font-weight: bold; color: #b45309; letter-spacing: 2px;">COMEBACK10</span>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://zaitandfilters.com/checkout" 
                   style="display: inline-block; padding: 18px 50px; background: linear-gradient(135deg, #15803d 0%, #166534 100%); color: #ffffff; text-decoration: none; border-radius: 15px; font-weight: bold; font-size: 18px; box-shadow: 0 6px 20px rgba(21, 128, 61, 0.3);">
                  أكمل طلبك الآن 🚀
                </a>
              </div>

              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb; text-align: center;">
                <p style="color: #ef4444; font-size: 14px; font-weight: bold; margin: 0 0 15px 0;">
                  ⏰ هذا العرض صالح لمدة 48 ساعة فقط!
                </p>
                <p style="color: #999; font-size: 13px; margin: 0; line-height: 1.6;">
                  <strong style="color: #15803d;">زيت أند فلترز</strong> - وجهتك الموثوقة لقطع غيار السيارات الأصلية في مصر<br/>
                  📞 للاستفسار: 01023862436 | 📧 orders@sales.zaitandfilters.com
                </p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw emailError;
    }

    console.log('✅ Email sent successfully:', data);

    return NextResponse.json({ 
      success: true, 
      message: 'Recovery email sent successfully',
      emailId: data?.id
    });

  } catch (error: any) {
    console.error('❌ Error sending recovery email:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
}
