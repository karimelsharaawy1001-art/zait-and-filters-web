'use client';
import Link from 'next/link';
import { 
  Facebook, Instagram, Mail, MapPin, 
  ChevronLeft, ShieldCheck, Clock, MessageCircle, FileText, ShieldAlert, RefreshCcw, Users, Truck 
} from 'lucide-react';


// --- قسم التعديل السريع لروابط السوشيال ميديا ---
const SOCIAL_LINKS = {
  facebook: "https://facebook.com/zaitandfilters",
  instagram: "https://instagram.com/zaitandfilters",
  tiktok: "https://tiktok.com/@zai.tand.filters"
};


export default function ProfessionalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={footerContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        .footer-cta:hover { background-color: #7f1d1d !important; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4) !important; }
        .footer-link-item:hover { color: #e50914 !important; padding-right: 5px; }
        .footer-social-icon:hover { background-color: #e50914 !important; color: #fff !important; transform: scale(1.1); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .footer-column { animation: fadeInUp 0.6s ease-out; }
        @media (max-width: 768px) {
          footer { padding: 28px 16px 24px !important; }
          .footer-grid { gap: 24px !important; margin-bottom: 24px !important; }
        }
      `}} />

      <div className="footer-grid" style={footerContent}>
        
        {/* العمود الأول: عن البراند */}
        <div className="footer-column" style={footerColumn}>
          <Link href="/" style={logoStyle}>
            ZAIT <span style={{ color: '#e50914' }}>& FILTERS</span>
          </Link>
          <p style={brandDesc}>
            وجهتك الأولى والموثوقة لجميع أنواع زيوت المحركات وفلاتر السيارات الأصلية. نضمن لك الجودة والأداء العالي لسيارتك.
          </p>
          <div style={socialLinks}>
            <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" className="footer-social-icon" style={socialIcon} aria-label="Facebook">
              <Facebook size={20} />
            </a>
            <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="footer-social-icon" style={socialIcon} aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noreferrer" className="footer-social-icon" style={socialIcon} aria-label="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* العمود الثاني: روابط سريعة وصفحات قانونية */}
        <div className="footer-column" style={footerColumn}>
          <h4 style={columnTitle}>روابط هامة</h4>
          <ul style={linkList}>
            <li><Link href="/store" className="footer-link-item" style={footerLink}><ChevronLeft size={14} /> المتجر</Link></li>
            <li><Link href="/profile" className="footer-link-item" style={footerLink}><ChevronLeft size={14} /> حسابي الشخصي</Link></li>
            {/* --- رابط برنامج المسوقين --- */}
            <li><Link href="/affiliate" className="footer-link-item" style={{...footerLink, color: '#e50914', fontWeight: 'bold'}}><Users size={14} /> انضم لبرنامج المسوقين</Link></li>
            {/* --------------------------- */}
            <li><Link href="/about" className="footer-link-item" style={footerLink}><ChevronLeft size={14} /> من نحن</Link></li>
            <hr style={divider} />
            {/* الصفحات القانونية المرتبطة بالأكواد الجديدة */}
            <li><Link href="/privacy" className="footer-link-item" style={footerLink}><ShieldAlert size={14} /> سياسة الخصوصية</Link></li>
            <li><Link href="/terms" className="footer-link-item" style={footerLink}><FileText size={14} /> الشروط والأحكام</Link></li>
            <li><Link href="/refund" className="footer-link-item" style={footerLink}><RefreshCcw size={14} /> سياسة الاستبدال والاسترجاع</Link></li>
            <li><Link href="/shipping" className="footer-link-item" style={footerLink}><Truck size={14} /> سياسة الشحن والتوصيل</Link></li>
          </ul>
        </div>

        {/* العمود الثالث: التواصل */}
        <div className="footer-column" style={footerColumn}>
          <h4 style={columnTitle}>تواصل معنا</h4>
          <div style={{ marginBottom: '15px' }}>
            <span style={contactLabel}>دعم العملاء:</span>
            <Link href="/contact" className="footer-cta" style={contactBtn}>
              <MessageCircle size={18} /> تواصل معنا الآن
            </Link>
          </div>
          <div style={contactItem}>
            <MapPin size={18} color="#e50914" />
            <div style={{ textAlign: 'right' }}>
              <span style={contactLabel}>المقر الرئيسي:</span>
              <span style={contactValue}>القاهرة، مصر</span>
            </div>
          </div>
          <div style={contactItem}>
            <Clock size={18} color="#e50914" />
            <div style={{ textAlign: 'right' }}>
              <span style={contactLabel}>مواعيد العمل:</span>
              <span style={contactValue}>يومياً من 10 ص حتى 6 م</span>
            </div>
          </div>
        </div>

        {/* العمود الرابع: الثقة والدفع */}
        <div className="footer-column" style={footerColumn}>
          <h4 style={columnTitle}>تسوق بأمان</h4> 
          <div style={trustBadge}>
            <ShieldCheck size={18} color="#e50914" />
            <span>منتجات أصلية 100%</span>
          </div>
          <p style={paymentText}>نقبل الدفع عبر:</p>
          
          {/* طرق الدفع الرئيسية */}
          <div style={paymentSection}>
            <h5 style={paymentCategory}>البطاقات البنكية:</h5>
            <div style={paymentLogos}>
              <img src="https://i.postimg.cc/Njw3g5JW/visa-logo-png-seeklogo-149697.png" alt="Visa" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/sgRkVv64/1280px-Master-Card-Logo-svg.png" alt="Mastercard" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/7ZyFxfsB/MEEZA.jpg" alt="Meeza" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/zG1sJVt2/apple-pay.png" alt="Apple Pay" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
            </div>
          </div>

          {/* التقسيط والدفع الإلكتروني */}
          <div style={paymentSection}>
            <h5 style={paymentCategory}>التقسيط والدفع:</h5>
            <div style={paymentLogos}>
              <img src="https://i.postimg.cc/wjdC67fn/VALU.jpg" alt="Valu" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/pLtw2pGk/FAWRY.jpg" alt="Fawry" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/vZdJQcqN/SOHOOLA.jpg" alt="Sohoola" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/52Mhx67g/CONTACT.jpg" alt="Contact" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/FHQM97WT/HALAN.jpg" alt="Halan" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/dVKbqLHB/AMAN.jpg" alt="Aman" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/kgd0nB1f/EL-AHLY.jpg" alt="El Ahly" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/VkcxYdGp/TAKKA.jpg" alt="Takka" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/wjdC67ff/lucky.jpg" alt="Lucky" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/qvdPkzbY/TRU.jpg" alt="Tru" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/RZzkMNsb/mogo.jpg" alt="Mogo" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/3r19c1zy/Pv1p8v-KJq4Z-LLOj-Qj-BZp-K8DNJg4Zb5.png" alt="Payment" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
            </div>
          </div>

          {/* شبكات المحمول */}
          <div style={paymentSection}>
            <h5 style={paymentCategory}>محافظ المحمول:</h5>
            <div style={paymentLogos}>
              <img src="https://i.postimg.cc/ryjgPj7K/VODAFONE.jpg" alt="Vodafone Cash" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/Y2R8sRTj/ORANGE.jpg" alt="Orange Money" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
              <img src="https://i.postimg.cc/59gpRgDy/ETTISALAT.jpg" alt="Etisalat Cash" style={payImg} width="40" height="24" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>

      </div>

      <div style={bottomBar}>
        <p>© {currentYear} زيت أند فلترز. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}

// --- التنسيقات ---
const footerContainer: any = { backgroundColor: '#050505', borderTop: '1px solid #111', padding: '60px 20px 20px', direction: 'rtl' };
const footerContent: any = { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px', width: '100%', boxSizing: 'border-box' as const };
const footerColumn: any = { display: 'flex', flexDirection: 'column', gap: '15px' };
const logoStyle: any = { fontSize: '1.8rem', fontWeight: '900', fontStyle: 'italic', color: '#fff', textDecoration: 'none', letterSpacing: '-1px' };
const brandDesc: any = { color: '#999', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 };
const socialLinks: any = { display: 'flex', gap: '12px', marginTop: '10px' };
const socialIcon: any = { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: '0.3s', cursor: 'pointer' };
const columnTitle: any = { fontSize: '1.1rem', fontWeight: '900', color: '#fff', marginBottom: '10px', position: 'relative', paddingBottom: '10px' };
const linkList: any = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' };
const footerLink: any = { textDecoration: 'none', color: '#bbb', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.3s ease' };
const divider: any = { border: 'none', borderTop: '1px solid #111', margin: '5px 0' };
const contactItem: any = { display: 'flex', gap: '12px', alignItems: 'center' };
const contactLabel: any = { display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' };
const contactValue: any = { fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', textDecoration: 'none' };
const contactBtn: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#e50914', color: '#fff', padding: '12px 20px', borderRadius: '14px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '5px', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 12px rgba(39, 174, 96, 0.2)', width: 'fit-content' };
const trustBadge: any = { display: 'flex', alignItems: 'center', gap: '8px', background: '#111', color: '#e50914', padding: '10px 15px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #222' };
const paymentText: any = { fontSize: '0.9rem', color: '#aaa', margin: '15px 0 10px', fontWeight: '700' };
const paymentSection: any = { marginBottom: '15px' };
const paymentCategory: any = { fontSize: '0.75rem', color: '#9ca3af', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' };
const paymentLogos: any = { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' };
const payImg: any = { height: '24px', width: '40px', borderRadius: '4px', objectFit: 'contain', filter: 'brightness(0.9)', transition: 'filter 0.3s', cursor: 'pointer' };
const bottomBar: any = { borderTop: '1px solid #111', paddingTop: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' };
