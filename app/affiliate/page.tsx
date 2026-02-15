'use client';
import Link from 'next/link';
import { 
  Trophy, Rocket, DollarSign, ShieldCheck, 
  BarChart3, Share2, Wallet, CheckCircle2, 
  Zap, Users, Percent, Ticket, ArrowRight, Star
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AffiliateLanding() {
  return (
    <div style={container}>
      {/* تأثيرات CSS متقدمة للتفاعل */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hero-gradient { background: radial-gradient(circle at center, #1a472a 0%, #050505 100%); }
        .btn-glow:hover { box-shadow: 0 0 25px rgba(39, 174, 96, 0.6); transform: translateY(-3px); background: #2ecc71 !important; }
        .feature-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .feature-card:hover { border-color: #27ae60 !important; background: rgba(39, 174, 96, 0.05) !important; transform: scale(1.02); }
        .step-card:hover { border-color: #27ae60 !important; transform: translateY(-10px); }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
        .float-anim { animation: float 4s ease-in-out infinite; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}} />

      {/* --- القسم الأول: الهيرو (Hero Section) --- */}
      <section style={heroSection} className="hero-gradient">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="float-anim" 
          style={badge}
        >
          <Star size={14} fill="#27ae60" /> برنامج النخبة للمسوقين 2026
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          style={mainTitle}
        >
          حول شبكة علاقاتك إلى <br />
          <span style={highlightText}>أرباح تصل إلى 10%</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={heroDesc}
        >
          انضم إلى "زيت أند فلترز" وسوّق لأجود أنواع قطع الغيار الأصلية. 
          نحن لا نعطيك عمولة فقط، نحن نعطيك نظاماً ذكياً لإدارة دخلك الشهري بالكامل.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={actions}
        >
          <Link href="/affiliate/signup" style={primaryBtn} className="btn-glow">
            ابدأ رحلة الربح الآن <ArrowRight size={20} />
          </Link>
          <Link href="/affiliate/login" style={secondaryBtn}>
            تسجيل دخول المسوقين
          </Link>
        </motion.div>

        <div style={statsBanner} className="glass-panel">
          {/* تم تعديل عدد المسوقين هنا */}
          <div style={statItem}><Users size={22} color="#27ae60"/> <span>+500 مسوق نشط</span></div>
          <div style={{...dividerV, display: 'block'}} />
          <div style={statItem}><BarChart3 size={22} color="#27ae60"/> <span>نظام تتبع لحظي</span></div>
          <div style={{...dividerV, display: 'block'}} />
          <div style={statItem}><ShieldCheck size={22} color="#27ae60"/> <span>سحب أرباح أسبوعي</span></div>
        </div>
      </section>

      {/* --- القسم الثاني: خطوات العمل (3 Steps) --- */}
      <section style={sectionPadding}>
        <div style={{textAlign: 'center', marginBottom: '60px'}}>
          <h2 style={sectionTitle}>كيف تبدأ بجني المال؟</h2>
          <p style={{color: '#666'}}>ثلاث خطوات تفصلك عن أول عمولة في حسابك</p>
        </div>
        
        <div style={stepsGrid}>
          <div style={stepCard} className="step-card">
            <div style={stepNumber}>01</div>
            <div style={iconBox}><Users size={32} color="#27ae60" /></div>
            <h3 style={cardHeader}>سجل حسابك</h3>
            <p style={cardText}>عملية تسجيل بسيطة تمنحك وصولاً فورياً للوحة التحكم الخاصة بك وبدء العمل.</p>
          </div>
          
          <div style={stepCard} className="step-card">
            <div style={stepNumber}>02</div>
            <div style={iconBox}><Share2 size={32} color="#27ae60" /></div>
            <h3 style={cardHeader}>انشر الكود</h3>
            <p style={cardText}>شارك رابط الإحالة أو كود الخصم الحصري (باسمك) مع جمهورك وعملائك.</p>
          </div>
          
          <div style={stepCard} className="step-card">
            <div style={stepNumber}>03</div>
            <div style={iconBox}><Wallet size={32} color="#27ae60" /></div>
            <h3 style={cardHeader}>استلم عمولتك</h3>
            <p style={cardText}>عند كل عملية شراء ناجحة، نرسل لك 10% من قيمة الأوردر مباشرة إلى محفظتك.</p>
          </div>
        </div>
      </section>

      {/* --- القسم الثالث: المميزات (Why Us) --- */}
      <section style={{ ...sectionPadding, backgroundColor: '#080808', position: 'relative', overflow: 'hidden' }}>
        <div style={bgGlow} />
        <h2 style={sectionTitle}>لماذا يختارنا المحترفون؟</h2>
        <div style={featuresGrid}>
          {features.map((f, i) => (
            <motion.div 
              whileHover={{ y: -5 }}
              key={i} 
              style={featureCard} 
              className="feature-card glass-panel"
            >
              <div style={iconCircle}>{f.icon}</div>
              <h4 style={cardHeader}>{f.title}</h4>
              <p style={cardText}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- القسم الرابع: الخاتمة (CTA) --- */}
      <section style={ctaSection}>
        <motion.div 
          whileInView={{ scale: [0.9, 1], opacity: [0, 1] }}
          viewport={{ once: true }}
          style={ctaBox}
        >
          <Zap size={50} color="#fff" className="float-anim" />
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '20px 0' }}>مستعد لتغيير دخلك الشهري؟</h2>
          <p style={{ marginBottom: '40px', fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 40px' }}>
            لا تنتظر طويلاً، انضم الآن لشبكة مسوقي زيت أند فلترز واحصُل على أول عمولة لك اليوم.
          </p>
          <Link href="/affiliate/signup" style={ctaBtn} className="btn-glow">
            أنشئ حسابك المجاني الآن
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

// --- البيانات ---
const features = [
  { title: "عمولات تصاعدية", desc: "ابدأ بـ 5% وتدرج حتى تصل إلى 10% بناءً على نشاطك الشهري مبيعاتك.", icon: <Percent size={24} color="#27ae60" /> },
  { title: "لوحة تحكم احترافية", desc: "تتبع النقرات، التحويلات، والأرباح بالتفصيل الممل في شاشة واحدة ذكية.", icon: <BarChart3 size={24} color="#27ae60" /> },
  { title: "أكواد خصم خاصة", desc: "امنح عملاءك خصم 5% بكود يحمل اسمك لزيادة مبيعاتك وبناء براندك الشخصي.", icon: <Ticket size={24} color="#27ae60" /> },
  { title: "أدوات تسويقية جاهزة", desc: "نوفر لك صوراً وفيديوهات احترافية للمنتجات لتنشرها فوراً على حساباتك.", icon: <Rocket size={24} color="#27ae60" /> },
  { title: "دفعات سريعة", desc: "نظام دفع مرن يضمن وصول أرباحك إليك في أسرع وقت ممكن وبكل شفافية.", icon: <DollarSign size={24} color="#27ae60" /> },
  { title: "دعم فني 24/7", desc: "مدير حساب مخصص للرد على استفساراتك ومساعدتك في تطوير خطتك التسويقية.", icon: <CheckCircle2 size={24} color="#27ae60" /> },
];

// --- التنسيقات ---
const container: any = { backgroundColor: '#050505', color: '#fff', direction: 'rtl', minHeight: '100vh', fontFamily: 'inherit' };
const heroSection: any = { padding: '120px 20px', textAlign: 'center', borderBottom: '1px solid #111', position: 'relative' };
const badge: any = { background: 'rgba(39, 174, 96, 0.1)', color: '#27ae60', padding: '10px 25px', borderRadius: '50px', fontSize: '0.95rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '30px', border: '1px solid rgba(39, 174, 96, 0.3)' };
// تم زيادة الـ lineHeight هنا لتوسيع المسافة بين السطرين في العنوان
const mainTitle: any = { fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: '950', marginBottom: '25px', lineHeight: '1.4', letterSpacing: '-1px' };
const highlightText: any = { color: '#27ae60', textShadow: '0 0 40px rgba(39, 174, 96, 0.4)' };
const heroDesc: any = { fontSize: '1.25rem', color: '#999', maxWidth: '850px', margin: '0 auto 50px', lineHeight: '1.8' };
const actions: any = { display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' };
const primaryBtn: any = { background: '#27ae60', color: '#fff', padding: '20px 45px', borderRadius: '18px', textDecoration: 'none', fontWeight: '900', fontSize: '1.2rem', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '12px' };
const secondaryBtn: any = { background: 'transparent', color: '#fff', padding: '20px 45px', borderRadius: '18px', textDecoration: 'none', fontWeight: '900', fontSize: '1.2rem', border: '1px solid #333', transition: '0.3s' };
const statsBanner: any = { display: 'inline-flex', justifyContent: 'center', gap: '30px', marginTop: '80px', padding: '20px 40px', borderRadius: '25px', flexWrap: 'wrap' };
const statItem: any = { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', fontWeight: '600' };
const dividerV: any = { width: '1px', height: '25px', background: 'rgba(255,255,255,0.1)' };

const sectionPadding: any = { padding: '100px 20px', maxWidth: '1200px', margin: '0 auto' };
const sectionTitle: any = { textAlign: 'center', fontSize: '2.8rem', fontWeight: '900', marginBottom: '20px', letterSpacing: '-1px' };
const stepsGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '50px' };
const stepCard: any = { position: 'relative', padding: '50px 30px', textAlign: 'center', background: '#0a0a0a', borderRadius: '35px', border: '1px solid #151515', transition: '0.4s' };
const stepNumber: any = { position: 'absolute', top: '25px', left: '25px', color: 'rgba(39, 174, 96, 0.2)', fontWeight: '900', fontSize: '3rem', lineHeight: '1' };
const iconBox: any = { width: '80px', height: '80px', background: 'rgba(39, 174, 96, 0.05)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', border: '1px solid rgba(39, 174, 96, 0.1)' };

const featuresGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', marginTop: '20px' };
const featureCard: any = { padding: '40px', borderRadius: '35px', transition: '0.3s', textAlign: 'right', position: 'relative', zIndex: 1 };
const iconCircle: any = { width: '60px', height: '60px', background: 'rgba(39, 174, 96, 0.1)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '25px', border: '1px solid rgba(39, 174, 96, 0.2)' };
const cardHeader: any = { fontSize: '1.5rem', fontWeight: '800', marginBottom: '15px', color: '#fff' };
const cardText: any = { color: '#888', lineHeight: '1.7', fontSize: '1.05rem', margin: 0 };

const ctaSection: any = { padding: '100px 20px', textAlign: 'center' };
const ctaBox: any = { maxWidth: '1000px', margin: '0 auto', background: 'linear-gradient(145deg, #1a472a 0%, #27ae60 100%)', padding: '80px 40px', borderRadius: '50px', position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' };
const ctaBtn: any = { background: '#fff', color: '#1a472a', padding: '22px 60px', borderRadius: '20px', textDecoration: 'none', fontWeight: '950', fontSize: '1.3rem', display: 'inline-block', transition: '0.3s' };
const bgGlow: any = { position: 'absolute', top: '50%', left: '50%', width: '500px', height: '500px', background: 'rgba(39, 174, 96, 0.1)', filter: 'blur(150px)', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' };