import React, { forwardRef } from 'react';
import { User, Mail, Phone, Truck, Globe } from 'lucide-react';

const MaintenanceReportTemplate = forwardRef(({ user, orders, siteName, logoUrl }, ref) => {
    // 1. Robust Name Resolution
    const customerName = user?.fullName ||
        user?.displayName ||
        user?.name ||
        (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null) ||
        orders[0]?.customer?.name ||
        orders[0]?.customerName ||
        'عميل زيت اند فلترز';

    // 2. Phone Number Formatting
    const rawPhone = user?.phoneNumber || user?.phone || orders[0]?.customer?.phone || '';
    let formattedPhone = rawPhone.replace(/\D/g, '');
    if (formattedPhone.length > 0) {
        if (formattedPhone.startsWith('20')) {
            formattedPhone = `+${formattedPhone}`;
        } else if (formattedPhone.startsWith('0')) {
            formattedPhone = `+20${formattedPhone.substring(1)}`;
        } else {
            formattedPhone = `+20${formattedPhone}`;
        }
    } else {
        formattedPhone = 'غير متوفر';
    }

    return (
        <div
            ref={ref}
            className="report-page-container"
            style={{
                backgroundColor: '#f9fafb',
                padding: '40px 20px',
                minHeight: '100%',
                fontFamily: "'Cairo', 'Tajawal', Arial, sans-serif",
                direction: 'rtl',
            }}
        >
            {/* Advanced Styling Block */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700;900&display=swap');
                
                .report-paper {
                    background: white !important;
                    width: 210mm; /* A4 Width */
                    min-height: 297mm; /* A4 Height */
                    margin: 0 auto;
                    padding: 50px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                }

                @media print {
                    body {
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .report-page-container {
                        background-color: white !important;
                        padding: 0 !important;
                    }
                    .report-paper {
                        box-shadow: none !important;
                        margin: 0 !important;
                        width: 100% !important;
                        padding: 15mm !important;
                        min-height: auto !important;
                    }
                    @page {
                        margin: 0;
                        size: A4;
                    }
                    .no-print { display: none !important; }
                }

                .brand-line {
                    height: 4px;
                    background: linear-gradient(to left, #dc2626, #991b1b);
                    width: 100%;
                    border-radius: 2px;
                    margin: 20px 0 30px 0;
                }

                .info-card {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1px;
                    background-color: #e5e7eb;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                    margin-bottom: 35px;
                }

                .info-item {
                    background-color: white;
                    padding: 15px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .info-label {
                    color: #9ca3af;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .info-value {
                    color: #111827;
                    font-size: 14px;
                    font-weight: 700;
                }

                .modern-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }

                .modern-table thead th {
                    background-color: #1a1a1a;
                    color: white;
                    padding: 16px 12px;
                    font-size: 13px;
                    font-weight: 700;
                    text-align: center;
                }

                .modern-table thead th:first-child { border-top-right-radius: 12px; }
                .modern-table thead th:last-child { border-top-left-radius: 12px; }

                .modern-table tbody td {
                    padding: 16px 12px;
                    font-size: 13px;
                    color: #374151;
                    border-bottom: 1px solid #f3f4f6;
                    text-align: center;
                    vertical-align: middle;
                }

                .modern-table tbody tr:nth-child(even) {
                    background-color: #f9fafb;
                }

                .warranty-badge {
                    background-color: #ecfdf5;
                    color: #059669;
                    padding: 4px 12px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 800;
                    display: inline-block;
                }

                .mileage-text {
                    font-weight: 800;
                    color: #111827;
                }

                .footer-text {
                    font-size: 14px;
                    font-weight: 700;
                    color: #374151;
                    margin-bottom: 8px;
                    display: block;
                }

                .footer-subtext {
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 500;
                }
            `}</style>

            <div className="report-paper">
                {/* 1. Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Logo (Left side) */}
                    <div style={{ flex: 1, textAlign: 'right' }}>
                        {logoUrl && (
                            <img src={logoUrl} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                        )}
                    </div>

                    {/* Title (Right side) */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                        <h1 style={{
                            fontSize: '24px',
                            color: '#dc2626',
                            fontWeight: '900',
                            margin: 0,
                            fontFamily: "'Tajawal', sans-serif"
                        }}>
                            سجل صيانة السيارة المعتمد
                        </h1>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>
                            Report ID: {new Date().getTime().toString().slice(-8)}
                        </p>
                    </div>
                </div>

                <div className="brand-line"></div>

                {/* 2. Customer Info Grid */}
                <div className="info-card">
                    <div className="info-item">
                        <span className="info-label">
                            <User size={14} color="#9ca3af" /> اسم العميل
                        </span>
                        <span className="info-value">{customerName}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">
                            <Mail size={14} color="#9ca3af" /> البريد الإلكتروني
                        </span>
                        <span className="info-value">{user?.email || 'غير محدد'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">
                            <Phone size={14} color="#9ca3af" /> رقم الهاتف
                        </span>
                        <span className="info-value" style={{ direction: 'ltr' }}>{formattedPhone}</span>
                    </div>
                </div>

                {/* 3. The Table */}
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ width: '15%' }}>التاريخ</th>
                            <th style={{ width: '25%', textAlign: 'right' }}>تفاصيل السيارة</th>
                            <th style={{ width: '15%' }}>العداد</th>
                            <th style={{ width: '25%', textAlign: 'right' }}>القطع المركبة</th>
                            <th style={{ width: '20%' }}>الضمان</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, orderIdx) => {
                            const date = order.createdAt?.seconds
                                ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
                                : 'غير محدد';
                            const mileage = order.currentMileage ? `${order.currentMileage} كم` : '-';
                            const carDetails = order.selectedCar
                                ? `${order.selectedCar.make} ${order.selectedCar.model}`
                                : (order.carBrand && order.carModel ? `${order.carBrand} ${order.carModel}` : 'غير محدد');

                            if (!order.items || order.items.length === 0) {
                                return (
                                    <tr key={orderIdx}>
                                        <td>{date}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{carDetails}</td>
                                        <td className="mileage-text">{mileage}</td>
                                        <td style={{ textAlign: 'right' }}>صيانة دورية</td>
                                        <td><span className="warranty-badge">خدمة معتمدة</span></td>
                                    </tr>
                                );
                            }

                            return order.items.map((item, itemIdx) => (
                                <tr key={`${orderIdx}-${itemIdx}`}>
                                    <td>{itemIdx === 0 ? date : ''}</td>
                                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{itemIdx === 0 ? carDetails : ''}</td>
                                    <td className="mileage-text">{itemIdx === 0 ? mileage : ''}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '600' }}>{item?.nameEn || item?.name || 'قطعة غيار'}</div>
                                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>{item?.brandEn || item?.partBrand || item?.brand || ''}</div>
                                    </td>
                                    <td><span className="warranty-badge">أصلي وبالضمان</span></td>
                                </tr>
                            ));
                        })}
                    </tbody>
                </table>

                {/* 4. Professional Footer */}
                <div style={{ marginTop: 'auto', paddingTop: '60px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ background: '#fef2f2', p: '8px', borderRadius: '50%' }}>
                                <Truck size={20} color="#dc2626" />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1f2937' }}>أسرع توصيل في مصر</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Globe size={18} color="#dc2626" />
                            <span style={{ fontSize: '12px', fontWeight: '900', color: '#dc2626' }}>ZAITANDFILTERS.COM</span>
                        </div>
                    </div>

                    <p className="footer-text">هذا التقرير موثق من فريق زيت اند فلترز - جميع قطع الغيار أصلية وبالضمان</p>
                    <p className="footer-subtext">نشكركم على ثقتكم في زيت اند فلترز - نتمنى لكم رحلة آمنة دائماً</p>
                </div>

                {/* Watermark Logo (Subtle) */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-30deg)',
                    opacity: 0.03,
                    pointerEvents: 'none',
                    width: '60%',
                    zIndex: 0
                }}>
                    {logoUrl && <img src={logoUrl} alt="" style={{ width: '100%' }} />}
                </div>
            </div>
        </div>
    );
});

MaintenanceReportTemplate.displayName = 'MaintenanceReportTemplate';

export default MaintenanceReportTemplate;
