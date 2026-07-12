export interface Product {
  id: string;
  name: string;
  brand: string;
  car_make: string;
  car_model: string;
  car_model_year: string;
  regular_price: number;
  sale_price: number;
  slug: string;
}

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  const hasDiscount = product.sale_price > 0;
  const price = hasDiscount ? product.sale_price : product.regular_price;
  const link = `https://zaitandfilters.com/products/${product.slug}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: '#1c1c1c',
        border: '1.5px solid #2a2a2a',
        borderRadius: '14px',
        padding: '14px 16px',
        marginBottom: '10px',
        transition: 'all 0.2s',
        cursor: 'pointer',
        direction: 'rtl',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = '1.5px solid #b91c1c';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(21,128,61,0.12)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = '1.5px solid #2a2a2a';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        {/* Index badge + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '8px',
            background: '#1a0d0d', color: '#b91c1c',
            fontSize: '0.75rem', fontWeight: '900',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <span style={{
            fontSize: '0.95rem', fontWeight: '800', color: '#f5f5f5',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {product.name}
          </span>
        </div>

        {/* Price */}
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#b91c1c' }}>
            {price.toLocaleString()} ج.م
          </div>
          {hasDiscount && (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textDecoration: 'line-through' }}>
              {product.regular_price.toLocaleString()} ج.م
            </div>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
        {product.brand && (
          <span style={{
            padding: '2px 9px', borderRadius: '6px',
            background: '#161616', color: '#60a5fa',
            fontSize: '0.78rem', fontWeight: '700',
          }}>
            {product.brand}
          </span>
        )}
        {product.car_make && (
          <span style={{
            padding: '2px 9px', borderRadius: '6px',
            background: '#1a0d0d', color: '#b91c1c',
            fontSize: '0.78rem', fontWeight: '700',
          }}>
            {product.car_make}
          </span>
        )}
        {product.car_model && (
          <span style={{
            padding: '2px 9px', borderRadius: '6px',
            background: '#faf5ff', color: '#a78bfa',
            fontSize: '0.78rem', fontWeight: '700',
          }}>
            {product.car_model}
          </span>
        )}
        {product.car_model_year && (
          <span style={{
            padding: '2px 9px', borderRadius: '6px',
            background: '#1c1c1c', color: '#fb923c',
            fontSize: '0.78rem', fontWeight: '700',
          }}>
            {product.car_model_year}
          </span>
        )}
        {hasDiscount && (
          <span style={{
            padding: '2px 9px', borderRadius: '6px',
            background: '#2a0f10', color: '#dc2626',
            fontSize: '0.78rem', fontWeight: '800',
          }}>
            خصم {Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)}%
          </span>
        )}
      </div>

      {/* Link row */}
      <div style={{
        marginTop: '10px', paddingTop: '10px',
        borderTop: '1px solid #242424',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: '700' }}>
          اضغط لعرض المنتج 🛒
        </span>
        <span style={{
          fontSize: '0.75rem', color: '#94a3b8',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '180px', direction: 'ltr',
        }}>
          {link.replace('https://', '')}
        </span>
      </div>
    </a>
  );
}