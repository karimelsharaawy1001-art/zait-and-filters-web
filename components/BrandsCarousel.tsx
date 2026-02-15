'use client';
import React from 'react';

const BRANDS = [
  { name: 'Shell', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Shell_logo.svg/1200px-Shell_logo.svg.png' },
  { name: 'Mobil', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Mobil_logo.svg/2560px-Mobil_logo.svg.png' },
  { name: 'Castrol', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Castrol_logo.svg/2560px-Castrol_logo.svg.png' },
  { name: 'Bosch', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/2560px-Bosch-logo.svg.png' },
  { name: 'Mann Filter', logo: 'https://www.mann-hummel.com/etc.clientlibs/mannhummel/clientlibs/clientlib-site/resources/images/mann-filter-logo.png' },
  { name: 'Motul', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Motul_Logo.svg/2560px-Motul_Logo.svg.png' },
];

export default function BrandsCarousel() {
  const doubleBrands = [...BRANDS, ...BRANDS];

  return (
    <div style={carouselWrapper}>
      <h2 style={sectionTitle}>العلامات التجارية المتوفرة</h2>
      <div style={sliderContainer}>
        <div className="slide-track" style={slideTrack}>
          {doubleBrands.map((brand, index) => (
            <div key={index} style={slideItem}>
              <img 
                src={brand.logo} 
                alt={brand.name} 
                style={brandLogo} 
                className="brand-img"
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-150px * ${BRANDS.length})); }
        }
        .slide-track {
          animation: scroll 20s linear infinite;
        }
        .brand-img {
          filter: grayscale(100%);
          opacity: 0.6;
          transition: 0.3s;
          max-width: 100px;
          max-height: 50px;
        }
        .brand-img:hover {
          filter: grayscale(0%);
          opacity: 1;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}

const carouselWrapper: any = { padding: '60px 0', background: '#fff', textAlign: 'center', overflow: 'hidden' };
const sectionTitle: any = { fontSize: '1.5rem', fontWeight: '900', marginBottom: '30px', color: '#1a1a1a' };
const sliderContainer: any = { width: '100%', overflow: 'hidden', background: '#fcfcfc', borderTop: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5' };
const slideTrack: any = { display: 'flex', width: `calc(150px * ${BRANDS.length * 2})` };
const slideItem: any = { width: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' };
const brandLogo: any = { cursor: 'pointer' };