'use client';
import Link from 'next/link';
import { 
  Facebook, Instagram, Phone, Mail, MapPin, 
  ChevronLeft, MessageSquare, ShieldCheck, Clock 
} from 'lucide-react';

export default function ProfessionalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={footerContainer}>
      <div style={footerContent}>
        
        {/* العمود الأول: عن البراند */}
        <div style={footerColumn}>
          <Link href="/" style={logoStyle}>
            ZAIT <span style={{ color: '#27ae60' }}>& FILTERS</span>
          </Link>
          <p style={brandDesc}>
            وجهتك الأولى والموثوقة لجميع أنواع زيوت المحركات وفلاتر السيارات الأصلية. نضمن لك الجودة والأداء العالي لسيارتك.
          </p>
          <div style={socialLinks}>
            <a href="https://facebook.com" style={socialIcon}><Facebook size={20} /></a>
            <a href="https://instagram.com" style={socialIcon}><Instagram size={20} /></a>
            <a href="https://wa.me/201023862436" style={socialIcon}><MessageSquare size={20} /></a>
          </div>
        </div>

        {/* العمود الثاني: روابط سريعة */}
        <div style={footerColumn}>
          <h4 style={columnTitle}>روابط سريعة</h4>
          <ul style={linkList}>
            <li><Link href="/store" style={footerLink}><ChevronLeft size={14} /> المتجر</Link></li>
            <li><Link href="/profile" style={footerLink}><ChevronLeft size={14} /> حسابي الشخصي</Link></li>
            <li><Link href="/about" style={footerLink}><ChevronLeft size={14} /> من نحن</Link></li>
            <li><Link href="/contact" style={footerLink}><ChevronLeft size={14} /> اتصل بنا</Link></li>
          </ul>
        </div>

        {/* العمود الثالث: التواصل */}
        <div style={footerColumn}>
          <h4 style={columnTitle}>تواصل معنا</h4>
          <div style={contactItem}>
            <Phone size={18} color="#27ae60" />
            <div style={{ textAlign: 'right' }}>
              <span style={contactLabel}>اتصل بنا:</span>
              <a href="tel:+201023862436" style={contactValue}>01023862436</a>
            </div>
          </div>
          <div style={contactItem}>
            <MapPin size={18} color="#27ae60" />
            <div style={{ textAlign: 'right' }}>
              <span style={contactLabel}>المقر الرئيسي:</span>
              <span style={contactValue}>القاهرة، مصر</span>
            </div>
          </div>
          <div style={contactItem}>
            <Clock size={18} color="#27ae60" />
            <div style={{ textAlign: 'right' }}>
              <span style={contactLabel}>مواعيد العمل:</span>
              <span style={contactValue}>يومياً من 10 ص حتى 10 م</span>
            </div>
          </div>
        </div>

        {/* العمود الرابع: الثقة والدفع */}
        <div style={footerColumn}>
          <h4 style={columnTitle}>تسوق بآمان</h4>
          <div style={trustBadge}>
            <ShieldCheck size={18} color="#27ae60" />
            <span>منتجات أصلية 100%</span>
          </div>
          <p style={paymentText}>نقبل الدفع عبر:</p>
          <div style={paymentLogos}>
            <img src="https://i.postimg.cc/Njw3g5JW/visa-logo-png-seeklogo-149697.png" alt="Visa" style={payImg} />
            <img src="https://i.postimg.cc/sgRkVv64/1280px-Master-Card-Logo-svg.png" alt="Mastercard" style={payImg} />
            <img src="https://i.postimg.cc/wjdC67fn/VALU.jpg" alt="Valu" style={payImg} />
            <img src="https://i.postimg.cc/pLtw2pGk/FAWRY.jpg" alt="Fawry" style={payImg} />
          </div>
        </div>

      </div>

      {/* شريط حقوق النشر السفلي */}
      <div style={bottomBar}>
        <p>© {currentYear} زيت أند فلترز. جميع الحقوق محفوظة.</p>
        <p style={{ fontSize: '0.75rem', marginTop: '5px', color: '#999' }}>تم التطوير بكل ❤️ لخدمة سيارتك</p>
      </div>
    </footer>
  );
}

// --- التنسيقات (Light & Professional) ---
const footerContainer: any = { backgroundColor: '#fff', borderTop: '1px solid #eee', padding: '60px 20px 20px', direction: 'rtl' };
const footerContent: any = { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginBottom: '40px' };
const footerColumn: any = { display: 'flex', flexDirection: 'column', gap: '15px' };

const logoStyle: any = { fontSize: '1.8rem', fontWeight: '900', fontStyle: 'italic', color: '#1a1a1a', textDecoration: 'none', letterSpacing: '-1px' };
const brandDesc: any = { color: '#666', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 };
const socialLinks: any = { display: 'flex', gap: '15px', marginTop: '10px' };
const socialIcon: any = { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', transition: '0.3s' };

const columnTitle: any = { fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '10px', position: 'relative', paddingBottom: '10px' };
const linkList: any = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' };
const footerLink: any = { textDecoration: 'none', color: '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', transition: '0.3s' };

const contactItem: any = { display: 'flex', gap: '12px', alignItems: 'center' };
const contactLabel: any = { display: 'block', fontSize: '0.75rem', color: '#999' };
const contactValue: any = { fontSize: '0.9rem', fontWeight: 'bold', color: '#1a1a1a', textDecoration: 'none' };

const trustBadge: any = { display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', color: '#15803d', padding: '10px 15px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' };
const paymentText: any = { fontSize: '0.85rem', color: '#888', margin: '15px 0 10px' };
const paymentLogos: any = { display: 'flex', gap: '10px', flexWrap: 'wrap' };
const payImg: any = { height: '25px', width: 'auto', borderRadius: '4px', objectFit: 'contain' };

const bottomBar: any = { borderTop: '1px solid #f5f5f5', paddingTop: '20px', textAlign: 'center', color: '#666', fontSize: '0.85rem' };