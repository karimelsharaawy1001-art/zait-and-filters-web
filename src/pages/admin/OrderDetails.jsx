import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Loader2, ArrowLeft, Edit2, Clock, Package, User, MapPin, CreditCard, AlertCircle, X, Search, PlusCircle, Minus, Plus, Trash2, Save, ShoppingBag, Truck, Gift, CheckCircle2, DollarSign, FileImage, Phone, Calendar, ChevronDown
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
    const [editForm, setEditForm] = useState({
        paymentStatus: '',
        paymentMethod: '',
        status: '',
        items: [],
        extraFees: 0,
        manualDiscount: 0,
        notes: '',
        shippingCost: 0,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerCity: '',
        customerGovernorate: '',
        customerAddress: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchFilters, setSearchFilters] = useState({
        make: '',
        model: '',
        year: '',
        category: '',
        subcategory: ''
    });

    // Extract unique filter values
    const filterOptions = React.useMemo(() => {
        if (!staticProducts) return { makes: [], models: [], years: [], categories: [], subcategories: [] };

        const makes = [...new Set(staticProducts.map(p => p.make || p.carMake).filter(Boolean))].sort();
        const models = [...new Set(staticProducts.map(p => p.model || p.carModel).filter(Boolean))].sort();
        const years = [...new Set(staticProducts.flatMap(p => {
            if (p.yearRange) return p.yearRange.split('-').map(y => y.trim());
            if (p.year) return p.year.toString().split(',').map(y => y.trim());
            return [];
        }).filter(Boolean))].sort((a, b) => b - a);
        const categories = [...new Set(staticProducts.map(p => p.category).filter(Boolean))].sort();
        const subcategories = [...new Set(staticProducts.map(p => p.subcategory).filter(Boolean))].sort();

        return { makes, models, years, categories, subcategories };
    }, [staticProducts]);

    // Search for products when term or filters change
    useEffect(() => {
        if (!staticProducts) return;

        const results = staticProducts.filter(p => {
            const matchesSearch = !searchTerm || (
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            const matchesMake = !searchFilters.make || (p.make === searchFilters.make || p.carMake === searchFilters.make);
            const matchesModel = !searchFilters.model || (p.model === searchFilters.model || p.carModel === searchFilters.model);
            const matchesYear = !searchFilters.year || (
                (p.yearRange && p.yearRange.includes(searchFilters.year)) ||
                (p.year && p.year.toString().includes(searchFilters.year))
            );
            const matchesCategory = !searchFilters.category || p.category === searchFilters.category;
            const matchesSubcategory = !searchFilters.subcategory || p.subcategory === searchFilters.subcategory;

            return matchesSearch && matchesMake && matchesModel && matchesYear && matchesCategory && matchesSubcategory;
        }).slice(0, 10);

        setSearchResults(results);
    }, [searchTerm, searchFilters, staticProducts]);

    const handleAddItem = (product) => {
        setEditForm(prev => {
            const exists = prev.items.find(i => i.id === product.id);
            if (exists) {
                return {
                    ...prev,
                    items: prev.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
                };
            }
            return {
                ...prev,
                items: [...prev.items, {
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price) || 0,
                    quantity: 1,
                    image: product.images ? product.images[0] : (product.image || ''),
                    sku: product.sku || '',
                    brand: product.brand || 'Generic',
                    carMake: product.make || product.carMake || '',
                    carModel: product.model || product.carModel || '',
                    carMake: product.make || product.carMake || '',
                    carModel: product.model || product.carModel || '',
                    year: product.year || '',
                    discount: 0
                }]
            };
        });
        setSearchTerm('');
        setSearchResults([]);
        toast.success("Item added");
    };

    const handleUpdateItem = (index, field, value) => {
        setEditForm(prev => {
            const newItems = [...prev.items];
            newItems[index] = { ...newItems[index], [field]: parseFloat(value) || 0 };
            return { ...prev, items: newItems };
        });
    };

    const handleRemoveItem = (index) => {
        setEditForm(prev => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);
            return { ...prev, items: newItems };
        });
    };

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
                        return {
                            ...item,
                            brand: productData.brand || item.brand,
                            category: productData.category || item.category,
                            sku: productData.sku || item.sku,
                            // Enrich vehicle data
                            carMake: productData.make || productData.carMake || item.make || item.carMake,
                            carModel: productData.model || productData.carModel || item.model || item.carModel,
                            yearRange: productData.yearRange || (productData.yearStart && productData.yearEnd ? `${productData.yearStart}-${productData.yearEnd}` : null) || item.yearRange || item.year
                        };
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
            const itemSubtotal = editForm.items.reduce((acc, i) => acc + (parseFloat(i.price) * i.quantity), 0);
            const itemDiscount = editForm.items.reduce((acc, i) => acc + (parseFloat(i.discount || 0)), 0);
            const subtotal = itemSubtotal - itemDiscount;
            const shipping = parseFloat(editForm.shippingCost || 0);
            const total = subtotal + shipping + parseFloat(editForm.extraFees || 0) - parseFloat(editForm.manualDiscount || 0);

            const payload = {
                items: JSON.stringify(editForm.items.map(i => ({
                    ...i,
                    discount: parseFloat(i.discount || 0)
                }))),
                subtotal,
                total,
                shippingCost: shipping,
                extraFees: parseFloat(editForm.extraFees || 0),
                manualDiscount: parseFloat(editForm.manualDiscount || 0),
                notes: editForm.notes,
                status: editForm.status,
                paymentStatus: editForm.paymentStatus,
                customerInfo: JSON.stringify({
                    name: editForm.customerName,
                    email: editForm.customerEmail,
                    phone: editForm.customerPhone,
                    city: editForm.customerCity,
                    governorate: editForm.customerGovernorate,
                    address: editForm.customerAddress
                }),
                updatedAt: new Date().toISOString()
            };

            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION, id, payload);

            // Refetch or update local state
            setOrder(prev => ({
                ...prev,
                ...payload,
                items: editForm.items, // Keep as array in active state
                customer: {
                    name: editForm.customerName,
                    email: editForm.customerEmail,
                    phone: editForm.customerPhone,
                    city: editForm.customerCity,
                    governorate: editForm.customerGovernorate,
                    address: editForm.customerAddress
                }
            }));

            setShowEditModal(false);
            toast.success("Order updated successfully");
        } catch (err) {
            console.error(err);
            toast.error("Update failed");
        }
        finally { setUpdating(false); }
    };

    const handleDeleteOrder = async () => {
        if (!window.confirm(`Are you sure you want to permanently delete order #${order.orderNumber || order.id}? This action cannot be undone.`)) return;

        setUpdating(true);
        try {
            toast.loading("Purging protocol...");
            await databases.deleteDocument(DATABASE_ID, ORDERS_COLLECTION, id);
            toast.dismiss();
            toast.success("Order deleted successfully");
            navigate('/admin/orders');
        } catch (error) {
            toast.dismiss();
            console.error("Purge failure:", error);
            toast.error("Failed to delete order");
        } finally {
            setUpdating(false);
        }
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
                            onClick={() => {
                                setEditForm({
                                    ...order,
                                    shippingCost: order.shippingCost || order.shipping_cost || 0,
                                    customerName: order.customer?.name || '',
                                    customerEmail: order.customer?.email || '',
                                    customerPhone: order.customer?.phone || '',
                                    customerCity: order.customer?.city || '',
                                    customerGovernorate: order.customer?.governorate || '',
                                    customerAddress: order.customer?.address || '',
                                    // Ensure items is an array
                                    items: Array.isArray(order.items) ? order.items : []
                                });
                                setShowEditModal(true);
                            }}
                            className="bg-white border text-gray-700 px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all"
                        >
                            <Edit2 size={16} />
                            Edit Order
                        </button>
                        <button
                            onClick={() => toast.success("Invoice download feature coming soon!")}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-gray-200 flex items-center gap-2 transition-all"
                        >
                            <ShoppingBag size={16} />
                            Invoice
                        </button>
                        <button
                            onClick={handleDeleteOrder}
                            disabled={updating}
                            className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-red-600 hover:text-white flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            Delete
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
                                                            <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                                                <span className="text-gray-700">{item.brand}</span>
                                                            </p>
                                                            <div className="text-xs text-blue-600 mt-1 flex flex-wrap gap-1 font-semibold bg-blue-50 px-2 py-0.5 rounded w-fit">
                                                                {item.carMake || item.make || 'Universal'} {item.carModel || item.model}
                                                                {(item.yearRange || item.year) && <span className="text-blue-400">|</span>} {item.yearRange || item.year}
                                                            </div>
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

                {/* Edit Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">Edit Order Details</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">

                                {/* Section 1: Core Status */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Order Status</label>
                                        <div className="relative">
                                            <select
                                                value={editForm.status}
                                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-semibold appearance-none shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <ChevronDown size={14} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Payment Status</label>
                                        <div className="relative">
                                            <select
                                                value={editForm.paymentStatus}
                                                onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-semibold appearance-none shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Failed">Failed</option>
                                                <option value="Refunded">Refunded</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <ChevronDown size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Items Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <Package size={14} className="text-blue-500" /> Order Items ({editForm.items.length})
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <div className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                                                    <Search size={14} className="text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Add product..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full bg-transparent border-none outline-none text-xs placeholder-gray-400 text-gray-800"
                                                    />
                                                </div>
                                            </div>

                                            {/* Advanced Filters */}
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                <select
                                                    value={searchFilters.make}
                                                    onChange={(e) => setSearchFilters(prev => ({ ...prev, make: e.target.value }))}
                                                    className="bg-gray-50 border border-gray-100 text-[10px] p-1.5 rounded-lg font-medium outline-none focus:ring-1 focus:ring-blue-100"
                                                >
                                                    <option value="">Make</option>
                                                    {filterOptions.makes.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <select
                                                    value={searchFilters.model}
                                                    onChange={(e) => setSearchFilters(prev => ({ ...prev, model: e.target.value }))}
                                                    className="bg-gray-50 border border-gray-100 text-[10px] p-1.5 rounded-lg font-medium outline-none focus:ring-1 focus:ring-blue-100"
                                                >
                                                    <option value="">Model</option>
                                                    {filterOptions.models.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <select
                                                    value={searchFilters.year}
                                                    onChange={(e) => setSearchFilters(prev => ({ ...prev, year: e.target.value }))}
                                                    className="bg-gray-50 border border-gray-100 text-[10px] p-1.5 rounded-lg font-medium outline-none focus:ring-1 focus:ring-blue-100"
                                                >
                                                    <option value="">Year</option>
                                                    {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                                <select
                                                    value={searchFilters.category}
                                                    onChange={(e) => setSearchFilters(prev => ({ ...prev, category: e.target.value }))}
                                                    className="bg-gray-50 border border-gray-100 text-[10px] p-1.5 rounded-lg font-medium outline-none focus:ring-1 focus:ring-blue-100"
                                                >
                                                    <option value="">Cat</option>
                                                    {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <select
                                                    value={searchFilters.subcategory}
                                                    onChange={(e) => setSearchFilters(prev => ({ ...prev, subcategory: e.target.value }))}
                                                    className="bg-gray-50 border border-gray-100 text-[10px] p-1.5 rounded-lg font-medium outline-none focus:ring-1 focus:ring-blue-100"
                                                >
                                                    <option value="">Sub</option>
                                                    {filterOptions.subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>

                                            {searchResults.length > 0 && (searchTerm || Object.values(searchFilters).some(v => v)) && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto">
                                                    {searchResults.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                handleAddItem(p);
                                                                setSearchFilters({ make: '', model: '', year: '', category: '', subcategory: '' });
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between group border-b border-gray-50 last:border-0"
                                                        >
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-[13px]">{p.name}</p>
                                                                <p className="text-[11px] text-gray-500">{p.brand} • {p.price} EGP</p>
                                                            </div>
                                                            <PlusCircle size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {editForm.items.map((item, index) => (
                                            <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-gray-200 transition-colors">
                                                <div className="h-10 w-10 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 text-[13px] truncate">{item.name}</p>
                                                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                                        {item.sku} {item.brand && `• ${item.brand}`}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Price</span>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                                                            className="w-20 bg-gray-50 border-none px-2 py-1 rounded text-xs font-bold text-gray-700 focus:ring-1 focus:ring-blue-100"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase px-1 text-center">Qty</span>
                                                        <div className="flex items-center bg-gray-100 rounded-lg px-1 py-0.5">
                                                            <button onClick={() => handleUpdateItem(index, 'quantity', Math.max(1, item.quantity - 1))} className="p-1 hover:text-blue-600"><Minus size={10} /></button>
                                                            <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                                            <button onClick={() => handleUpdateItem(index, 'quantity', item.quantity + 1)} className="p-1 hover:text-blue-600"><Plus size={10} /></button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-green-500 uppercase px-1">Discount</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={item.discount || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...editForm.items];
                                                                newItems[index] = { ...newItems[index], discount: parseFloat(e.target.value) || 0 };
                                                                setEditForm({ ...editForm, items: newItems });
                                                            }}
                                                            className="w-16 bg-green-50 border-none px-2 py-1 rounded text-xs font-bold text-green-700 placeholder-green-300 focus:ring-1 focus:ring-green-100"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Total</span>
                                                        <span className="text-[13px] font-black text-gray-900 px-1">
                                                            {((item.price * item.quantity) - (item.discount || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => handleRemoveItem(index)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 3: Customer & Shipping */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <User size={14} className="text-blue-500" /> Customer Information
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={editForm.customerName}
                                                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Phone</label>
                                                <input
                                                    type="text"
                                                    value={editForm.customerPhone}
                                                    onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email</label>
                                                <input
                                                    type="email"
                                                    value={editForm.customerEmail}
                                                    onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <MapPin size={14} className="text-blue-500" /> Shipping Address
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Governorate</label>
                                                <input
                                                    type="text"
                                                    value={editForm.customerGovernorate}
                                                    onChange={(e) => setEditForm({ ...editForm, customerGovernorate: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">City</label>
                                                <input
                                                    type="text"
                                                    value={editForm.customerCity}
                                                    onChange={(e) => setEditForm({ ...editForm, customerCity: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Street / Details</label>
                                                <textarea
                                                    value={editForm.customerAddress}
                                                    onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs font-medium h-16 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Notes & Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <FileImage size={14} className="text-blue-500" /> Internal Notes
                                        </h4>
                                        <textarea
                                            value={editForm.notes}
                                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs font-medium h-32 resize-none focus:ring-2 focus:ring-blue-100 outline-none"
                                            placeholder="Write admin-only notes here..."
                                        />
                                    </div>

                                    <div className="bg-gray-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">Financial Summary</h4>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs opacity-70">
                                                <span>Items Subtotal</span>
                                                <span className="font-bold">
                                                    {(editForm.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0).toLocaleString()} EGP
                                                </span>
                                            </div>
                                            {editForm.items?.some(i => i.discount > 0) && (
                                                <div className="flex justify-between items-center text-xs text-green-400">
                                                    <span>Item Discounts</span>
                                                    <span className="font-bold">
                                                        -{(editForm.items?.reduce((acc, item) => acc + (parseFloat(item.discount || 0)), 0) || 0).toLocaleString()} EGP
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="opacity-70">Shipping Cost</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500">Edit:</span>
                                                    <input
                                                        type="number"
                                                        value={editForm.shippingCost}
                                                        onChange={(e) => setEditForm({ ...editForm, shippingCost: e.target.value })}
                                                        className="w-20 bg-gray-800 border-none px-2 py-1 rounded text-right text-xs font-bold focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="opacity-70">Extra Fees</span>
                                                <input
                                                    type="number"
                                                    value={editForm.extraFees}
                                                    onChange={(e) => setEditForm({ ...editForm, extraFees: e.target.value })}
                                                    className="w-20 bg-gray-800 border-none px-2 py-1 rounded text-right text-xs font-bold focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-green-400">
                                                <span>Coupon/Total Discount</span>
                                                <input
                                                    type="number"
                                                    value={editForm.manualDiscount}
                                                    onChange={(e) => setEditForm({ ...editForm, manualDiscount: e.target.value })}
                                                    className="w-20 bg-green-900 border-none px-2 py-1 rounded text-right text-xs font-bold text-green-300 focus:ring-1 focus:ring-green-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-800 pt-4 flex justify-between items-end">
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase block">Grand Total</span>
                                                <span className="text-2xl font-black text-white leading-none">
                                                    {((editForm.items?.reduce((acc, item) => acc + (item.price * item.quantity) - (item.discount || 0), 0) || 0) +
                                                        parseFloat(editForm.shippingCost || 0) +
                                                        parseFloat(editForm.extraFees || 0) -
                                                        parseFloat(editForm.manualDiscount || 0)).toLocaleString()} <span className="text-xs font-normal opacity-50">EGP</span>
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 italic">
                                                Final amount to collect
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
                                <p className="text-[10px] text-gray-400 italic px-2">Changes are live upon saving.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-colors text-sm"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={updating}
                                        className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrderDetails;
