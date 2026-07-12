// ============================================================
// FILE: /components/OrderConfirmationInvoiceButton.tsx
//
// Add this button anywhere after an order is placed.
// Example usage in your order confirmation page:
//   <OrderConfirmationInvoiceButton orderId={order.id} />
// ============================================================

'use client';

import Link from 'next/link';
import { FileText, ExternalLink } from 'lucide-react';

interface Props {
  orderId: string;
}

export default function OrderConfirmationInvoiceButton({ orderId }: Props) {
  return (
    <Link
      href={`/orders/${orderId}/invoice`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#fff',
        borderRadius: '14px',
        textDecoration: 'none',
        fontWeight: '800',
        fontSize: '0.95rem',
        boxShadow: '0 8px 20px rgba(15,23,42,0.25)',
        transition: 'all 0.2s',
      }}
    >
      <FileText size={18} color="#e50914" />
      عرض وتحميل ORDER
      <ExternalLink size={14} style={{ opacity: 0.6 }} />
    </Link>
  );
}


// ============================================================
// SETUP INSTRUCTIONS
// ============================================================
//
// 1. INSTALL REQUIRED PACKAGE:
//    npm install jspdf html2canvas
//
// 2. COPY FILES:
//    - OrderInvoice.tsx        → /components/OrderInvoice.tsx
//    - invoice_page.tsx        → /app/orders/[id]/invoice/page.tsx
//    - This file               → /components/OrderConfirmationInvoiceButton.tsx
//
// 3. YOUR ORDER DATA SHAPE (adjust OrderInvoice.tsx if your fields differ):
//    {
//      id: string,
//      created_at: string,
//      customer_name: string,
//      customer_phone: string,
//      customer_address: string,
//      customer_email?: string,
//      items: [{ id, name, quantity, price, brand?, image_url? }],
//      subtotal: number,
//      shipping_cost?: number,
//      discount?: number,
//      total: number,
//      payment_method?: string,
//      status?: string,
//      notes?: string,
//    }
//
// 4. ADD BUTTON TO ORDER CONFIRMATION:
//    After the order is placed, render:
//    <OrderConfirmationInvoiceButton orderId={newOrder.id} />
//
// 5. ADMIN ACCESS:
//    Go to: /orders/[any-order-id]/invoice
//    Set NEXT_PUBLIC_ADMIN_EMAIL in your .env to bypass ownership check.
//
// 6. CUSTOMER ACCESS:
//    - After checkout, show the button linking to /orders/[id]/invoice
//    - Or email them the link: https://zaitandfilters.com/orders/[id]/invoice
//
// ============================================================