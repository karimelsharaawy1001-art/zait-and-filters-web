import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cartId, customerEmail } = await request.json();

    // Log the recovery email action
    console.log('📧 Recovery email requested:', {
      cartId,
      customerEmail,
      timestamp: new Date().toISOString()
    });

    // Simulate email sending (replace with actual email service later)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return success
    return NextResponse.json({ 
      success: true, 
      message: 'Recovery email sent successfully'
    });

  } catch (error: any) {
    console.error('❌ Error in recovery email API:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send recovery email'
    }, { status: 500 });
  }
}
