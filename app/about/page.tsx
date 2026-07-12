'use client';

import { useState } from 'react';
import {
  Shield, Package, Clock, DollarSign, Wrench, Heart,
  CheckCircle, Star, Truck, Phone, MessageCircle
} from 'lucide-react';

export default function AboutPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const features = [
    {
      icon: <Shield size={32} color="#b91c1c" />,
      title: 'الأصلي.. وما أدراك ما الأصلي',
      subtitle: 'الجودة المضمونة',
      desc: 'في "زيت أند فلترز" مفيش مكان لكلمة "كوبي" أو "هاي كوبي". كل الزيوت، الفلاتر، وقطع الغيار جاية من مصادرها المعتمدة وأصلية 100%. إحنا بنخاف على موتورك زي ما بنخاف على عربياتنا.',
      bg: '#1a0d0d',
      border: '#ef4444',
      num: '01',
    },
    {
      icon: <Package size={32} color="#60a5fa" />,
      title: 'كل حاجة في مكان واحد',
      subtitle: 'التنوع الشامل',
      desc: 'سواء عربيتك كوري، ياباني، ألماني، أو حتى صيني — هتلاقي الزيت المناسب، والفلتر الصح، وقطع الغيار اللي بتدور عليها. بنوفر أشهر الماركات العالمية اللي السوق المصري بيثق فيها.',
      bg: '#161616',
      border: '#93c5fd',
      num: '02',
    },
    {
      icon: <Clock size={32} color="#9b59b6" />,
      title: 'سهولة وتوفير للوقت',
      subtitle: 'الاحترافية في الخدمة',
      desc: 'انسى مشوار السبتية أو التوفيقية. وإنت قاعد في بيتك، ادخل اختار ماركة عربيتك وموديلها، والموقع هيعرضلك كل المناسب ليها. اطلب وإحنا هنوصلك في أسرع وقت لأي مكان في مصر.',
      bg: '#faf5ff',
      border: '#d8b4fe',
      num: '03',
    },
    {
      icon: <DollarSign size={32} color="#d97706" />,
      title: 'أسعار في المعقول',
      subtitle: 'الشفافية الكاملة',
      desc: 'بنقدم أسعار تنافسية وواضحة من غير أي مصاريف مخفية. هدفنا إن الصيانة الدورية متبقاش عبء عليك، وتقدر تحافظ على عربيتك من غير ما تكسر جيبك.',
      bg: '#1c1c1c',
      border: '#fcd34d',
      num: '04',
    },
  ];

  const stats = [
    { value: '100%', label: 'قطع غيار أصلية' },
    { value: '+12,000', label: 'منتج متاح' },
    { value: '27', label: 'محافظة توصيل' },
    { value: '4.9', label: 'تقييم العملاء' },
  ];

  return (
    <div style={{ direction: 'rtl', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'inherit' }}>

      {/* ===== HERO ===== */}
      <div style={{
        background: 'linear-gradient(135deg, #052e16 0%, #b91c1c 60%, #dc2626 100%)',
        padding: '80px 30px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-40px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '750px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.12)', borderRadius: '50px', padding: '8px 20px', marginBottom: '25px' }}>
            <Wrench size={18} color="#ef4444" />
            <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.9rem' }}>منصتك المصرية لصيانة عربيتك</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: '900', margin: '0 0 20px', lineHeight: 1.3 }}>
            زيت أند فلترز 🛢️
          </h1>
          <p style={{ color: '#7f1d1d', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', lineHeight: 1.9, margin: 0 }}>
            أهلاً بيك في منصتك الإلكترونية المصرية الأولى المتخصصة في كل حاجة موتور عربيتك محتاجها عشان يتنفس ويعيش أطول.
          </p>
        </div>
      </div>

      {/* ===== STATS BAR ===== */}
      <div style={{ background: '#1c1c1c', borderBottom: '1px solid #2a2a2a', padding: '0 30px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '28px 10px',
              borderLeft: i < 3 ? '1px solid #242424' : 'none',
            }}>
              <div style={{ fontSize: '1.9rem', fontWeight: '900', color: '#b91c1c', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '6px', fontWeight: '600' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 30px' }}>

        {/* ===== WHO WE ARE ===== */}
        <div style={{ background: '#1c1c1c', borderRadius: '30px', padding: '45px', marginBottom: '40px', border: '1px solid #2a2a2a', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#1a0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={24} color="#b91c1c" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#1c1c1c' }}>إحنا مين</h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {[
              'إحنا مجموعة من الشباب المصري اللي فاهم كويس يعني إيه "عربية" في مصر. عارفين إنها مش مجرد وسيلة مواصلات، دي شريك أساسي في يومنا، وأي عطلة فيها بتعمل أزمة.',
              'وعارفين كمان قد إيه المشوار للصنايعية ولفّة محلات قطع الغيار متعبة، والأصعب هو السؤال الدايم: "يا ترى القطعة دي أصلي ولا مضروبة؟"',
              'من هنا جت فكرتنا. قررنا نعمل مكان واحد، مضمون واحترافي، يجمعلك كل اللي تحتاجه لصيانة عربيتك الدورية، ويجيلك لحد عندك بضغطة زرار.',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <CheckCircle size={20} color="#b91c1c" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.85, fontSize: '1rem' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== MISSION ===== */}
        <div style={{
          background: 'linear-gradient(135deg, #052e16, #b91c1c)',
          borderRadius: '30px', padding: '45px', marginBottom: '40px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
              <Star size={28} color="#fbbf24" fill="#fbbf24" />
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#fff' }}>مهمتنا</h2>
            </div>
            <p style={{ color: '#7f1d1d', fontSize: '1.05rem', lineHeight: 1.9, margin: '0 0 18px' }}>
              في سوق قطع الغيار، <strong style={{ color: '#fff' }}>الثقة هي أهم عملة</strong>. ومهمتنا الأساسية في "زيت أند فلترز" إننا نكون مصدر الثقة ده ليك. إحنا مش بس بنبيع منتج، إحنا بنبيعلك <strong style={{ color: '#fbbf24' }}>"ضمان"</strong> إن اللي هتحطه جوه موتور عربيتك هو الأفضل والأنسب ليها.
            </p>
            <p style={{ color: '#7f1d1d', fontSize: '1.05rem', lineHeight: 1.9, margin: 0 }}>
              ركزنا في اسمنا على "الزيت والفلتر" لأنهم <strong style={{ color: '#fff' }}>خط الدفاع الأول عن الموتور</strong> — لو مظبوطين، العربية كلها بتبقى تمام.
            </p>
          </div>
        </div>

        {/* ===== WHY US ===== */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#b91c1c', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}> </p>
            <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: '900', color: '#1c1c1c' }}>إيه اللي بيميزنا؟</h2>
            <p style={{ margin: '10px 0 0', color: '#888', fontSize: '0.95rem' }}>بنينا خدماتنا على 4 قواعد أساسية عشان نستاهل ثقتك</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {features.map((f, i) => (
              <div key={i}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: hoveredCard === i ? f.bg : '#fff',
                  border: `2px solid ${hoveredCard === i ? f.border : '#2a2a2a'}`,
                  borderRadius: '24px', padding: '30px',
                  transition: 'all 0.25s ease',
                  cursor: 'default',
                  boxShadow: hoveredCard === i ? '0 8px 30px rgba(0,0,0,0.06)' : '0 2px 10px rgba(0,0,0,0.02)',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: f.bg, border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {f.icon}
                  </div>
                  <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#242424', lineHeight: 1 }}>{f.num}</span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '900', color: '#1c1c1c' }}>{f.title}</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.78rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.subtitle}</p>
                <p style={{ margin: 0, color: '#9ca3af', lineHeight: 1.8, fontSize: '0.93rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== CLOSING CTA ===== */}
        <div style={{
          background: '#1c1c1c', borderRadius: '30px', padding: '45px',
          border: '1px solid #2a2a2a', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1a0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <MessageCircle size={30} color="#b91c1c" />
          </div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '900', color: '#1c1c1c', margin: '0 0 16px' }}>كلمة أخيرة ليك 💚</h2>
          <p style={{ color: '#9ca3af', lineHeight: 1.9, fontSize: '1.02rem', maxWidth: '620px', margin: '0 auto 20px' }}>
            في "زيت أند فلترز"، إحنا مش مجرد تاجر — إحنا <strong style={{ color: '#b91c1c' }}>مستشارك الفني</strong>. لو محتار تختار إيه، فريق الدعم بتاعنا جاهز يساعدك تختار الأنسب لعربيتك.
          </p>
          <p style={{ color: '#b91c1c', fontWeight: '900', fontSize: '1.1rem', margin: '0 0 30px' }}>
            خليك في المضمون، وحافظ على قلب عربيتك مع "زيت أند فلترز" 🛢️
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/products" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#b91c1c', color: '#fff', borderRadius: '14px',
              padding: '13px 28px', fontWeight: '800', fontSize: '1rem',
              textDecoration: 'none', border: 'none',
            }}>
              <Package size={18} /> تصفح المنتجات
            </a>
            <a href="/contact" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#1a0d0d', color: '#b91c1c', borderRadius: '14px',
              padding: '13px 28px', fontWeight: '800', fontSize: '1rem',
              textDecoration: 'none', border: '2px solid #ef4444',
            }}>
              <Phone size={18} /> تواصل معنا
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
