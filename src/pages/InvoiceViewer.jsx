import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../context/SettingsContext';
import { Loader2, Printer, Download } from 'lucide-react';

const InvoiceViewer = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { settings } = useSettings();

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const docRef = doc(db, 'orders', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setOrder({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error("No such order!");
                }
            } catch (error) {
                console.error("Error fetching order:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    useEffect(() => {
        if (!loading && order) {
            // Auto-print after a short delay to ensure assets load
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, order]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 font-bold text-gray-500">Generating Invoice...</span>
        </div>
    );

    if (!order) return (
        <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">
            Invoice Not Found
        </div>
    );

    const date = order.createdAt?.seconds
        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB');

    return (
        <div className="min-h-screen bg-gray-100 p-8 md:p-12 print:p-0 print:bg-white font-sans text-gray-900">
            {/* Toolbar - Hidden when printing */}
            <div className="max-w-[210mm] mx-auto mb-8 flex justify-end gap-4 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-full font-bold hover:bg-black transition-colors shadow-lg"
                >
                    <Printer className="h-4 w-4" />
                    Print / Save as PDF
                </button>
            </div>

            {/* A4 Paper Container */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none p-10 md:p-16 rounded-xl min-h-[297mm] flex flex-col relative overflow-hidden">

                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[#28B463] print:bg-[#28B463]"></div>

                {/* Header */}
                <div className="flex justify-between items-start mb-12 border-b border-gray-100 pb-8">
                    <div className="flex flex-col">
                        {settings.siteLogo ? (
                            <img src={settings.siteLogo} alt="Logo" className="h-20 object-contain object-left mb-6" />
                        ) : (
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4">
                                ZAIT <span className="text-[#28B463]">& FILTERS</span>
                            </h1>
                        )}
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Invoice To:</span>
                        <h2 className="text-xl font-black text-black mb-1">{order.customer?.name || 'Guest Customer'}</h2>
                        <p className="text-sm font-medium text-gray-500">{order.customer?.phone}</p>
                        <p className="text-sm font-medium text-gray-500 mt-1 max-w-[250px]">{order.address}, {order.city}, {order.governorate}</p>
                    </div>

                    <div className="text-right">
                        <h1 className="text-5xl font-black text-gray-900/10 uppercase tracking-wider mb-2">Invoice</h1>
                        <div className="flex flex-col items-end gap-1">
                            <span className="bg-gray-50 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-[#28B463] border border-[#28B463]/20">
                                {order.paymentStatus === 'Paid' ? 'PAID' : 'PAYMENT PENDING'}
                            </span>
                            <p className="text-lg font-black text-black mt-2">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                            <p className="text-sm font-bold text-gray-400">{date}</p>
                        </div>
                    </div>
                </div>

                {/* Payment Method Badge */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Payment Method</span>
                    <span className="text-sm font-bold text-black">{order.paymentMethod}</span>
                </div>

                {/* Items Table */}
                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="text-left py-4 font-black uppercase text-[10px] tracking-widest text-gray-900 w-1/2">Item Description</th>
                            <th className="text-center py-4 font-black uppercase text-[10px] tracking-widest text-gray-900">Qty</th>
                            <th className="text-right py-4 font-black uppercase text-[10px] tracking-widest text-gray-900">Unit Price</th>
                            <th className="text-right py-4 font-black uppercase text-[10px] tracking-widest text-gray-900">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {order.items?.map((item, i) => (
                            <tr key={i} className="group">
                                <td className="py-5 pr-4">
                                    <p className="font-bold text-sm text-black mb-1">{item.nameEn || item.name}</p>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wider">{item.brand || 'Original'}</span>
                                        {(item.sku || item.partNumber) && <span className="text-[10px] font-medium text-gray-400 font-mono self-center">SKU: {item.sku || item.partNumber}</span>}
                                    </div>
                                </td>
                                <td className="text-center py-5 text-sm font-bold text-gray-600">{item.quantity}</td>
                                <td className="text-right py-5 text-sm font-bold text-gray-600">{Number(item.salePrice || item.price).toLocaleString()}</td>
                                <td className="text-right py-5 text-sm font-black text-black">{(Number(item.salePrice || item.price) * item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="flex justify-end mb-auto">
                    <div className="w-full max-w-[300px] space-y-3">
                        <div className="flex justify-between text-sm text-gray-500 font-medium">
                            <span>Subtotal</span>
                            <span>{order.subtotal?.toLocaleString()} EGP</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 font-medium">
                            <span>Shipping</span>
                            <span>{order.shipping_cost || 0} EGP</span>
                        </div>
                        {(order.discount > 0 || order.manualDiscount > 0) && (
                            <div className="flex justify-between text-sm text-[#28B463] font-bold">
                                <span>Discount</span>
                                <span>-{(Number(order.discount || 0) + Number(order.manualDiscount || 0)).toLocaleString()} EGP</span>
                            </div>
                        )}
                        {order.extraFees > 0 && (
                            <div className="flex justify-between text-sm text-gray-500 font-medium">
                                <span>Fees / Adjustments</span>
                                <span>+{order.extraFees} EGP</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t-2 border-black pt-4 mt-2">
                            <span className="text-md font-black uppercase tracking-widest">Total Due</span>
                            <span className="text-2xl font-black text-[#e31e24]">{order.total?.toLocaleString()} <span className="text-xs text-black font-bold">EGP</span></span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-gray-100 text-center">
                    <p className="text-sm font-bold text-black mb-1">Thank you for your business!</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">For support: {settings.supportEmail || 'support@zaitfilters.com'} | +20 123 456 7890</p>
                </div>

            </div>
        </div>
    );
};

export default InvoiceViewer;
