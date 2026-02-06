import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a professional PDF invoice for a given order.
 * @param {Object} order - The order object from Firestore.
 */
export const generateInvoice = (order) => {
    if (!order) return;

    const doc = new jsPDF();
    const currency = 'ج.م';

    // Helper for right alignment
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ZAIT & FILTERS', margin, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Automotive Spare Parts Specialist', margin, 38);
    doc.text('Cairo, Egypt', margin, 43);

    // Invoice Info - Change "INVOICE" to "ORDER"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ORDER (طلب)', pageWidth - 70, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order #: ${order.orderNumber || order.id?.slice(-6).toUpperCase()}`, pageWidth - 70, 38);
    const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-GB') : new Date(order.createdAt).toLocaleDateString('en-GB');
    doc.text(`Date: ${dateStr}`, pageWidth - 70, 43);
    if (order.currentMileage) {
        doc.text(`Mileage: ${order.currentMileage} KM`, pageWidth - 70, 48);
    }

    // Bill To
    doc.line(margin, 55, pageWidth - margin, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To (إلى):', margin, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customer?.name || 'Customer', margin, 70);
    doc.text(order.customer?.phone || '', margin, 75);
    doc.text(`${order.customer?.city || ''}, ${order.customer?.governorate || ''}`, margin, 80);

    // Table
    const tableData = order.items.map((item, index) => {
        const yearStr = (item.yearStart || item.yearEnd)
            ? `(${item.yearStart}${item.yearEnd ? ` - ${item.yearEnd}` : ''})`
            : (item.yearRange ? `(${item.yearRange})` : '');

        return [
            index + 1,
            `${item.name || item.nameEn || 'Product'}\n(${item.make} ${item.model}) ${yearStr}`,
            item.quantity,
            `${item.price} ${currency}`,
            `${item.price * item.quantity} ${currency}`
        ];
    });

    doc.autoTable({
        startY: 95,
        head: [['#', 'Description (الوصف)', 'Qty (الكمية)', 'Unit Price (السعر)', 'Total (الإجمالي)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillStyle: '#e31e24', textColor: 255 },
        styles: { font: 'helvetica', halign: 'center' },
        columnStyles: {
            1: { halign: 'left', cellWidth: 80 }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    const totalX = pageWidth - 70;
    doc.text('Subtotal (الإجمالي الفرعي):', totalX, finalY);
    doc.text(`${order.subtotal || 0} ${currency}`, pageWidth - margin, finalY, { align: 'right' });

    doc.text('Shipping (الشحن):', totalX, finalY + 7);
    doc.text(`${order.shipping_cost || 0} ${currency}`, pageWidth - margin, finalY + 7, { align: 'right' });

    if (order.discount > 0) {
        doc.text('Discount (الخصم):', totalX, finalY + 14);
        doc.text(`-${order.discount} ${currency}`, pageWidth - margin, finalY + 14, { align: 'right' });
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const totalRowY = finalY + (order.discount > 0 ? 22 : 15);
    doc.text('GRAND TOTAL (الإجمالي الكلي):', totalX, totalRowY);
    doc.text(`${order.total} ${currency}`, pageWidth - margin, totalRowY, { align: 'right' });

    // Footer - Remove phone as requested
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for shopping with Zait & Filters!', pageWidth / 2, pageWidth === 210 ? 280 : 260, { align: 'center' });

    // Save
    doc.save(`Order_${order.orderNumber || order.id?.slice(-6)}.pdf`);
};
