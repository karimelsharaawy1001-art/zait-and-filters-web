-- Create faqs table for chatbot FAQ management
CREATE TABLE IF NOT EXISTS public.faqs (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Allow public read for active FAQs (chatbot needs this)
CREATE POLICY "Anyone can read active FAQs"
  ON public.faqs
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated admin to do everything
CREATE POLICY "Admins can manage FAQs"
  ON public.faqs
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed initial FAQs from the original hardcoded ones
INSERT INTO public.faqs (question, answer, sort_order) VALUES
('مكانكوا فين؟', 'المقر الإداري والمخازن في التجمع الخامس بالقاهرة.', 1),
('ضمان قطع الغيار؟', 'ضمان استبدال على جميع قطع الغيار. مدة الضمان مكتوبة في تفاصيل كل قطعة.', 2),
('التوصيل بياخد قد إيه؟', 'التوصيل خلال 2-5 أيام عمل. وفي توصيل إكسبريس داخل القاهرة والجيزة خلال 48 ساعة.', 3),
('في قطع غير أصلية؟', 'كل قطع الغيار على الموقع أصلية من الوكيل الرسمي. مفيش أي قطع كوبي أو هاي كوبي.', 4),
('أقدر أجي أستلم الأوردر؟', 'غير متاح الاستلام الشخصي. الطلب من الموقع أو الأبلكيشن والأوردر بيتشحن لباب بيتك.', 5),
('أتابع أوردري إزاي؟', 'من حسابك هتلاقي رقم التتبع داخل الأوردر. لو مش موجود تواصل مع خدمة العملاء.', 6),
('أقدر أرجع القطعة؟', 'متاح الاستبدال أو الاسترجاع خلال 14 يوم من تاريخ الاستلام، بشرط إن القطعة في حالتها الأصلية مع تغليفها وملحقاتها.', 7),
('الدفع عند الاستلام متاح؟', 'للأسف متوقف حاليًا. بس تقدر تدفع عن طريق انستاباي أو الفيزا أو المحافظ الإلكترونية أو شركات التقسيط.', 8);
