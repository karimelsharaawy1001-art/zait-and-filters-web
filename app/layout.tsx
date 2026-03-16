// app/order-success/page.tsx
import { Suspense } from 'react';
import OrderSuccessClient from './OrderSuccessClient';
import { Loader2 } from 'lucide-react';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '80vh', gap: '12px', color: '#15803d',
        fontWeight: 'bold', fontSize: '1.1rem', direction: 'rtl',
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
        جاري التحقق من الدفع...
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      </div>
    }>
      <OrderSuccessClient />
    </Suspense>
  );
}