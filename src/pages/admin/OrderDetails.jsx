import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Loader2, ArrowLeft, Edit2, Clock, Package, User, MapPin, CreditCard, AlertCircle, X, Search, PlusCircle, Minus, Plus, Trash2, Save, ShoppingBag, Truck, Gift, CheckCircle2, DollarSign, FileImage, Phone, Calendar
} from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import { useStaticData } from '../../context/StaticDataContext';
import { normalizeArabic } from '../../utils/productUtils';

const OrderDetails = () => {
    const { staticProducts, isStaticLoaded } = useStaticData();
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [enrichedItems, setEnrichedItems] = useState([]);
    const [updating, setUpdating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ paymentStatus: '', paymentMethod: '', status: '', items: [], extraFees: 0, manualDiscount: 0, notes: '' });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID;

    const fetchOrder = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const data = await databases.getDocument(DATABASE_ID, ORDERS_COLLECTION, id);

            let parsedItems = [];
            try {
                parsedItems = data.items ? (typeof data.items === 'string' ? JSON.parse(data.items) : data.items) : [];
            } catch (e) {
                console.warn("Failed to parse items", e);
            }

            let parsedCustomer = {};
            try {
                parsedCustomer = data.customerInfo ? (typeof data.customerInfo === 'string' ? JSON.parse(data.customerInfo) : data.customerInfo) : {};
            } catch (e) {
                console.warn("Failed to parse customer info", e);
            }

            let parsedAddress = {};
            try {
                parsedAddress = data.shippingAddress ? (typeof data.shippingAddress === 'string' ? JSON.parse(data.shippingAddress) : data.shippingAddress) : {};
            } catch (e) {
                console.warn("Failed to parse shipping address", e);
            }

            setOrder({
                id: data.$id,
                ...data,
                items: parsedItems,
                customer: parsedCustomer,
                shippingAddress: parsedAddress
            });

            if (data.isOpened === false) await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, { isOpened: true });
        } catch (error) {
            console.error(error);
            toast.error('Order not found');
            navigate('/admin/orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [id, DATABASE_ID]);

    useEffect(() => {
        const fetchProductDetails = async () => {
            if (!order?.items || !PRODUCTS_COLLECTION) return;
            try {
                const enriched = await Promise.all(order.items.map(async (item) => {
                    try {
                        const productData = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.id);
                        return { ...item, brand: productData.brand || item.brand, category: productData.category || item.category, sku: productData.sku || item.sku };
                    } catch { return item; }
                }));
                setEnrichedItems(enriched);
            } catch (err) { console.error(err); }
        };
        if (order) fetchProductDetails();
    }, [order, DATABASE_ID]);

    const handleStatusUpdate = async (newStatus) => {
        setUpdating(true);
        try {
            const payload = { status: newStatus };
            if (newStatus === 'Delivered') payload.deliveryDate = new Date().toISOString();
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, payload);
            setOrder(prev => ({ ...prev, status: newStatus }));
            toast.success(`Status updated to: ${newStatus}`);
        } catch (err) { toast.error("Update failed"); }
        finally { setUpdating(false); }
    };

    const handlePaymentStatusUpdate = async (newStatus) => {
        setUpdating(true);
        try {
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, {
                paymentStatus: newStatus,
                updatedAt: new Date().toISOString()
            });
            setOrder(prev => ({ ...prev, paymentStatus: newStatus }));
            toast.success(`Payment status updated to: ${newStatus}`);
        } catch (err) { toast.error("Payment update failed"); }
        finally { setUpdating(false); }
    };

    const handleSaveEdit = async () => {
        setUpdating(true);
        try {
            // Recalculate totals
            const subtotal = editForm.items.reduce((acc, i) => acc + (parseFloat(i.price) * i.quantity), 0);
            // Use shippingCost (camelCase) consistent with DB
            const shipping = parseFloat(order.shippingCost || 0);
            const total = subtotal + shipping + parseFloat(editForm.extraFees || 0) - parseFloat(order.discount || 0) - parseFloat(editForm.manualDiscount || 0);

            const payload = { ...editForm, subtotal, total, updatedAt: new Date().toISOString() };
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, payload);
            setOrder(prev => ({ ...prev, ...payload }));
            setShowEditModal(false);
            toast.success("Order updated successfully");
        } catch (err) { toast.error("Update failed"); }
        finally { setUpdating(false); }
    };

    if (loading) return <div className="p-20 text-center text-gray-400 font-medium flex flex-col items-center"><Loader2 className="animate-spin mb-4" /> Loading Order Details...</div>;

    const currentItems = enrichedItems.length > 0 ? enrichedItems : order.items;

    // Helper for status badge colors
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Processing': return 'bg-blue-100 text-blue-800';
            case 'Shipped': return 'bg-purple-100 text-purple-800';
            case 'Delivered': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 text-gray-900">
            <AdminHeader title={`Order #${order.orderNumber || order.id.substring(0, 8)}`} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium"
                    >
                        <ArrowLeft size={18} />
                        Back to Orders
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setEditForm({ ...order }); setShowEditModal(true); }}
                            className="bg-white border text-gray-700 px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all"
                        >
                            <Edit2 size={16} />
                            Edit Order
                        </button>
                        <button
                            onClick={() => toast.success("Invoice download feature coming soon!")}
                            className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:bg-black flex items-center gap-2 transition-all"
                        >
                            <ShoppingBag size={16} />
                            Invoice
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN - Order Items & Totals */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Order Items */}
                        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Package size={18} className="text-gray-500" />
                                    Order Items <span className="text-gray-400 font-medium text-sm">({currentItems.length})</span>
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Product</th>
                                            <th className="px-6 py-3 font-semibold text-center">SKU</th>
                                            <th className="px-6 py-3 font-semibold text-right">Price</th>
                                            <th className="px-6 py-3 font-semibold text-center">Qty</th>
                                            <th className="px-6 py-3 font-semibold text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {currentItems.map((item, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">{item.name}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {item.brand} • {item.carMake} {item.carModel}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono text-xs text-gray-500">
                                                    {item.sku || item.id.substring(0, 8)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium">
                                                    {item.price.toLocaleString()} EGP
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                    {(item.price * item.quantity).toLocaleString()} EGP
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Order Summary / Totals */}
                        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Order Summary</h3>
                            <div className="w-full flex justify-end">
                                <div className="w-full sm:w-1/2 space-y-3">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span className="font-semibold">{order.subtotal?.toLocaleString()} EGP</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Shipping Fee</span>
                                        {/* FIXED: correctly referencing shippingCost or shipping_cost */}
                                        <span className="font-semibold">{(order.shippingCost || order.shipping_cost || 0).toLocaleString()} EGP</span>
                                    </div>
                                    {order.extraFees > 0 && (
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Extra Fees</span>
                                            <span className="font-semibold">+{order.extraFees.toLocaleString()} EGP</span>
                                        </div>
                                    )}
                                    {order.discount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-medium">
                                            <span>Discount</span>
                                            <span>-{order.discount.toLocaleString()} EGP</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black text-gray-900 pt-3 border-t border-gray-100 mt-2">
                                        <span>Total</span>
                                        <span>{order.total?.toLocaleString()} EGP</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN - Sidebar Info */}
                    <div className="space-y-6">

                        {/* Status Card */}
                        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Order Status</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Fulfillment Status</label>
                                        <select
                                            value={order.status}
                                            onChange={e => handleStatusUpdate(e.target.value)}
                                            disabled={updating}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm font-bold outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all ${getStatusColor(order.status)}`}
                                        >
                                            {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Status</label>
                                        <div className="flex gap-2 items-center">
                                            <select
                                                value={order.paymentStatus}
                                                onChange={e => handlePaymentStatusUpdate(e.target.value)}
                                                disabled={updating}
                                                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-bold outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all ${order.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Failed">Failed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-2 text-xs text-gray-400 flex items-center gap-1">
                                        <Clock size={12} />
                                        Created: {new Date(order.$createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Customer Card */}
                        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Customer Details</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><User size={16} /></div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{order.customer?.name || "Guest Check-in"}</p>
                                        <p className="text-xs text-gray-500">{order.customer?.email || "No email provided"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><Phone size={16} /></div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{order.customer?.phone || "No phone"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><MapPin size={16} /></div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{order.customer?.city || "Unknown City"}, {order.customer?.governorate || "Unknown Gov"}</p>
                                        <p className="text-xs text-gray-500 leading-relaxed mt-1">{order.customer?.address}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Payment Proof Card */}
                        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Payment Info</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Method</span>
                                    <span className="font-bold bg-gray-100 px-2 py-1 rounded text-xs uppercase">{order.paymentMethod}</span>
                                </div>
                                {(() => {
                                    const receiptMatch = order.notes?.match(/\[Receipt URL\]:\s*(.+)/);
                                    const receiptUrl = receiptMatch ? receiptMatch[1].trim() : null;
                                    return receiptUrl ? (
                                        <div className="mt-4">
                                            <p className="text-xs font-bold text-gray-500 mb-2">Payment Receipt</p>
                                            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-gray-200">
                                                <img src={receiptUrl} alt="Payment Receipt" className="w-full h-auto" />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs pointer-events-none">
                                                    View Full Size
                                                </div>
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-center text-gray-400 italic border border-dashed border-gray-200">
                                            No payment receipt uploaded
                                        </div>
                                    );
                                })()}
                            </div>
                        </section>

                        {/* Notes Card */}
                        {order.notes && !order.notes.startsWith('[Receipt') && (
                            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Notes</h3>
                                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 leading-relaxed">
                                    {order.notes.replace(/\[Receipt URL\]:\s*.+/, '')}
                                </p>
                            </section>
                        )}

                    </div>
                </div>

                {/* Edit Modal (Simply styled) */}
                {showEditModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                        <div className="bg-white rounded-2xl w-full max-w-2xl relative overflow-hidden flex flex-col max-h-[90vh] shadow-xl">
                            <div className="bg-gray-900 px-6 py-4 text-white flex justify-between items-center">
                                <h3 className="text-lg font-bold">Edit Order Details</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Status</label>
                                        <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-gray-50">
                                            {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Payment</label>
                                        <select value={editForm.paymentStatus} onChange={e => setEditForm({ ...editForm, paymentStatus: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-gray-50">
                                            {['Pending', 'Paid', 'Failed'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-sm text-gray-900 border-b pb-2">Items</h4>
                                    {editForm.items.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <img src={item.image} className="w-12 h-12 rounded bg-white object-cover border" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.price} EGP</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => { const u = [...editForm.items]; u[i].quantity = Math.max(1, u[i].quantity - 1); setEditForm({ ...editForm, items: u }); }} className="p-1 hover:bg-gray-200 rounded"><Minus size={14} /></button>
                                                <span className="font-mono font-bold text-sm w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => { const u = [...editForm.items]; u[i].quantity += 1; setEditForm({ ...editForm, items: u }); }} className="p-1 hover:bg-gray-200 rounded"><Plus size={14} /></button>
                                            </div>
                                            <button onClick={() => setEditForm({ ...editForm, items: editForm.items.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Extra Fees</label>
                                        <input type="number" value={editForm.extraFees} onChange={e => setEditForm({ ...editForm, extraFees: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Manual Discount</label>
                                        <input type="number" value={editForm.manualDiscount} onChange={e => setEditForm({ ...editForm, manualDiscount: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-gray-50" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                                    <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full p-3 border rounded-lg text-sm bg-gray-50" />
                                </div>
                            </div>

                            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
                                <button onClick={handleSaveEdit} className="px-6 py-2 text-sm font-bold bg-gray-900 text-white rounded-lg hover:bg-black shadow-lg">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrderDetails;
