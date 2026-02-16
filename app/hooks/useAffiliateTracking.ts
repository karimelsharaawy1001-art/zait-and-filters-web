import { supabase } from '@/app/lib/supabase';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function useAffiliateTracking() {
  useEffect(() => {
    // Track referral clicks
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store in localStorage for later use
      localStorage.setItem('affiliate_ref', refCode);
      
      // Track click in database
      trackReferralClick(refCode);
      
      toast.success('تم تطبيق رابط الإحالة!');
    }
  }, []);
}

async function trackReferralClick(refCode: string) {
  try {
    // Increment click count
    const { data: marketer } = await supabase
      .from('marketers')
      .select('id, total_clicks')
      .eq('referral_id', refCode)
      .single();
    
    if (marketer) {
      await supabase
        .from('marketers')
        .update({ total_clicks: (marketer.total_clicks || 0) + 1 })
        .eq('id', marketer.id);
    }
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

export async function applyPromoCode(code: string, orderTotal: number) {
  try {
    const { data: promoCode } = await supabase
      .from('promo_codes')
      .select('*, marketers(id, full_name)')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();
    
    if (!promoCode) {
      toast.error('كود الخصم غير صحيح');
      return null;
    }
    
    const discount = orderTotal * (promoCode.discount_percentage / 100);
    const newTotal = orderTotal - discount;
    
    // Update usage count
    await supabase
      .from('promo_codes')
      .update({ usage_count: (promoCode.usage_count || 0) + 1 })
      .eq('id', promoCode.id);
    
    toast.success(`تم تطبيق خصم ${promoCode.discount_percentage}%!`);
    
    return {
      discount,
      newTotal,
      marketerId: promoCode.marketer_id,
      discountPercentage: promoCode.discount_percentage
    };
  } catch (error) {
    console.error('Error applying promo code:', error);
    toast.error('حدث خطأ في تطبيق الكود');
    return null;
  }
}

export async function trackAffiliateCommission(orderId: string, orderTotal: number, marketerId: string) {
  try {
    const commissionRate = 5; // 5%
    const commissionAmount = orderTotal * (commissionRate / 100);
    
    // Create commission record
    const { error: commissionError } = await supabase
      .from('affiliate_commissions')
      .insert([{
        marketer_id: marketerId,
        order_id: orderId,
        commission_amount: commissionAmount,
        order_total: orderTotal,
        status: 'pending'
      }]);
    
    if (commissionError) {
      console.error('Commission error:', commissionError);
      return;
    }
    
    // Update marketer stats
    const { data: marketer } = await supabase
      .from('marketers')
      .select('total_earnings, total_conversions, balance')
      .eq('id', marketerId)
      .single();
    
    if (marketer) {
      await supabase
        .from('marketers')
        .update({
          total_earnings: (marketer.total_earnings || 0) + commissionAmount,
          total_conversions: (marketer.total_conversions || 0) + 1,
          balance: (marketer.balance || 0) + commissionAmount
        })
        .eq('id', marketerId);
    }
    
    // Clear stored referral
    localStorage.removeItem('affiliate_ref');
    
  } catch (error) {
    console.error('Error tracking commission:', error);
  }
}
