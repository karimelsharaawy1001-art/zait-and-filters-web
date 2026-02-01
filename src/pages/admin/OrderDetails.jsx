import React, { useState, useEffect } from 'react';
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    increment,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Package, User, MapPin, CreditCard, Clock, Edit2, CheckCircle, Trash2, Plus, Minus, PlusCircle, Search, Save, X } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const OrderDetails = () => {
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
        manualDiscount: 0
    });
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const docRef = doc(db, 'orders', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setOrder({ id: docSnap.id, ...data });

                    // Mark as opened if it hasn't been yet
                    if (data.isOpened === false) {
                        updateDoc(docRef, { isOpened: true }).catch(err => console.warn("Error marking as opened:", err));
                    }
                } else {
                    toast.error('Order not found');
                    navigate('/admin/orders');
                }
            } catch (error) {
                console.error("Error fetching order:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id, navigate]);

    // Fetch full product details when order is loaded
    useEffect(() => {
        const fetchProductDetails = async () => {
            if (!order?.items) return;

            try {
                const enriched = await Promise.all(order.items.map(async (item) => {
                    try {
                        if (!item.id) return item;
                        const productRef = doc(db, 'products', item.id);
                        const productSnap = await getDoc(productRef);

                        if (productSnap.exists()) {
                            const productData = productSnap.data();
                            return {
                                ...item,
                                partBrand: productData.partBrand || item.brand || 'N/A',
                                origin: productData.origin || productData.countryOfOrigin || 'N/A',
                                partNumber: productData.partNumber || productData.sku || 'N/A',
                                make: productData.make || item.make || 'Universal',
                                model: productData.model || item.model || 'Universal',
                                yearRange: (productData.yearStart && productData.yearEnd)
                                    ? `${productData.yearStart}-${productData.yearEnd}`
                                    : (item.yearStart ? `${item.yearStart}-${item.yearEnd}` : '')
                            };
                        }
                        return item;
                    } catch (err) {
                        console.error(`Error fetching product ${item.id}:`, err);
                        return item;
                    }
                }));
                setEnrichedItems(enriched);
            } catch (error) {
                console.error("Error enriching items:", error);
            }
        };

        if (order) {
            fetchProductDetails();
        }
    }, [order]);

    const handleStatusChange = async (newStatus) => {
        setUpdating(true);
        try {
            const orderRef = doc(db, 'orders', id);
            const statusUpdate = { status: newStatus };

            // Phase 3: Add deliveryDate if status is 'Delivered'
            if (newStatus === 'Delivered') {
                statusUpdate.deliveryDate = serverTimestamp();
            }

            // Update order status in Firestore
            await updateDoc(orderRef, statusUpdate);

            // Phase 3: Commission calculation & Voiding logic
            if (order.affiliateCode) {
                const batch = writeBatch(db);
                const affQuery = query(collection(db, 'affiliates'), where('referralCode', '==', order.affiliateCode));
                const affSnap = await getDocs(affQuery);

                if (!affSnap.empty) {
                    const affDoc = affSnap.docs[0];
                    const affData = affDoc.data();
                    const affId = affDoc.id;

                    // 1. Logic for STARTING commission cooling (Delivered)
                    if (newStatus === 'Delivered' && order.status !== 'Delivered') {
                        const newReferralCount = (affData.referralCount || 0) + 1;
                        let newTier = 1;
                        let newCommissionPerc = 5;

                        if (newReferralCount >= 30) {
                            newTier = 3;
                            newCommissionPerc = 10;
                        } else if (newReferralCount >= 10) {
                            newTier = 2;
                            newCommissionPerc = 7;
                        }

                        const newCommissionRate = newCommissionPerc / 100;
                        const baseAmount = order.subtotal || order.total;
                        const commissionAmount = Math.round(baseAmount * newCommissionRate);

                        batch.update(doc(db, 'affiliates', affId), {
                            referralCount: increment(1),
                            totalEarnings: increment(commissionAmount),
                            pendingBalance: increment(commissionAmount),
                            currentTier: newTier,
                            commissionPercentage: newCommissionPerc,
                            commissionRate: newCommissionRate
                        });

                        const txRef = doc(collection(db, `affiliates/${affId}/transactions`));
                        batch.set(txRef, {
                            orderId: id,
                            amount: baseAmount,
                            commission: commissionAmount,
                            commissionRate: newCommissionRate,
                            tier: newTier,
                            createdAt: serverTimestamp(),
                            status: 'confirmed'
                        });

                        await batch.commit();
                    }
                    // 2. Logic for VOIDING commission (Returned/Cancelled)
                    else if ((newStatus === 'Returned' || newStatus === 'Cancelled') && order.status === 'Delivered') {
                        // Find the transaction tied to this order
                        const txQuery = query(collection(db, `affiliates/${affId}/transactions`), where('orderId', '==', id));
                        const txSnap = await getDocs(txQuery);

                        if (!txSnap.empty) {
                            const txDoc = txSnap.docs[0];
                            const txData = txDoc.data();

                            if (txData.status !== 'void') {
                                batch.update(doc(db, 'affiliates', affId), {
                                    totalEarnings: increment(-txData.commission),
                                    pendingBalance: increment(-txData.commission),
                                    referralCount: increment(-1)
                                });

                                batch.update(doc(db, `affiliates/${affId}/transactions`, txDoc.id), {
                                    status: 'void',
                                    voidedAt: serverTimestamp()
                                });

                                await batch.commit();
                            }
                        }
                    }
                }
            }

            setOrder(prev => ({ ...prev, status: newStatus }));
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const handleEditOrder = () => {
        setEditForm({
            paymentStatus: order.paymentStatus || 'Pending',
            paymentMethod: order.paymentMethod || 'Cash on Delivery',
            status: order.status || 'Pending',
            items: [...(order.items || [])],
            extraFees: order.extraFees || 0,
            manualDiscount: order.manualDiscount || 0
        });
        setShowEditModal(true);
    };

    const handleProductSearch = async (q) => {
        setProductSearch(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const productsRef = collection(db, 'products');
            const qSnap = await getDocs(productsRef); // Note: For large datasets, use a more targeted query
            const all = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filtered = all.filter(p =>
                p.name?.toLowerCase().includes(q.toLowerCase()) ||
                p.sku?.toLowerCase().includes(q.toLowerCase()) ||
                p.partNumber?.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 5);
            setSearchResults(filtered);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const addProductToOrder = (product) => {
        const existing = editForm.items.find(item => item.id === product.id);
        if (existing) {
            setEditForm({
                ...editForm,
                items: editForm.items.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            });
        } else {
            setEditForm({
                ...editForm,
                items: [...editForm.items, {
                    id: product.id,
                    name: product.name,
                    nameEn: product.nameEn || product.name,
                    price: product.price,
                    image: product.image || product.images?.[0] || '/placeholder.png',
                    quantity: 1,
                    brand: product.partBrand || product.brand || 'N/A'
                }]
            });
        }
        setProductSearch('');
        setSearchResults([]);
    };

    const updateItemQuantity = (id, delta) => {
        setEditForm({
            ...editForm,
            items: editForm.items.map(item => {
                if (item.id === id) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            })
        });
    };

    const removeItem = (id) => {
        setEditForm({
            ...editForm,
            items: editForm.items.filter(item => item.id !== id)
        });
    };

    const calculateRecalculatedTotals = () => {
        const subtotal = editForm.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        const shipping = parseFloat(order.shipping_cost || 0);
        const promoDiscount = parseFloat(order.discount || 0);
        const total = subtotal + shipping + parseFloat(editForm.extraFees || 0) - promoDiscount - parseFloat(editForm.manualDiscount || 0);
        return { subtotal, total };
    };

    const handleSaveEdit = async () => {
        setUpdating(true);
        try {
            const { subtotal, total } = calculateRecalculatedTotals();
            const orderRef = doc(db, 'orders', id);
            const updateData = {
                paymentStatus: editForm.paymentStatus,
                paymentMethod: editForm.paymentMethod,
                status: editForm.status,
                items: editForm.items,
                subtotal: subtotal,
                total: total,
                extraFees: parseFloat(editForm.extraFees || 0),
                manualDiscount: parseFloat(editForm.manualDiscount || 0),
                updatedAt: serverTimestamp()
            };

            await updateDoc(orderRef, updateData);

            setOrder(prev => ({
                ...prev,
                ...updateData
            }));

            setShowEditModal(false);
            toast.success('Order updated successfully!');
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Failed to update order");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-admin-bg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-admin-accent" />
            </div>
        );
    }

    const { customer, items, total, status, createdAt, paymentMethod } = order;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <AdminHeader title={`Order Details #${order.orderNumber || id.slice(-6).toUpperCase()}`} />

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/admin/orders')}
                        className="flex items-center text-gray-400 hover:text-black font-bold transition-colors uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Orders
                    </button>
                    <button
                        onClick={handleEditOrder}
                        className="bg-[#28B463] hover:bg-[#219653] text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#28B463]/20 hover:scale-105 flex items-center gap-2"
                    >
                        <Edit2 className="h-4 w-4" />
                        Edit Order
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Items & Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Guard */}
                        <div className="bg-white shadow-sm rounded-3xl p-8 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                        <Clock className="h-6 w-6 text-[#28B463]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordered on</p>
                                        <p className="font-bold text-black poppins">
                                            {createdAt?.seconds ? new Date(createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Status</label>
                                    <select
                                        value={status}
                                        disabled={updating}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className={`block w-full rounded-xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-[#28B463] outline-none sm:text-sm p-3 font-black uppercase tracking-widest cursor-pointer transition-all
                                            ${status === 'Pending' ? 'text-orange-600 bg-orange-50' : ''}
                                            ${status === 'Processing' ? 'text-blue-600 bg-blue-50' : ''}
                                            ${status === 'Shipped' ? 'text-purple-600 bg-purple-50' : ''}
                                            ${status === 'Delivered' ? 'text-green-600 bg-green-50' : ''}
                                            ${status === 'Cancelled' ? 'text-[#28B463] bg-red-50' : ''}
                                            ${status === 'Awaiting Payment Verification' ? 'text-[#663299] bg-[#663299]/10' : ''}
                                        `}
                                    >
                                        <option value="Pending" className="bg-white">Pending</option>
                                        <option value="Processing" className="bg-white">Processing</option>
                                        <option value="Shipped" className="bg-white">Shipped</option>
                                        <option value="Delivered" className="bg-white">Delivered</option>
                                        <option value="Cancelled" className="bg-white">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="bg-white shadow-sm rounded-3xl overflow-hidden border border-gray-100">
                            <div className="px-8 py-5 border-b border-gray-50 flex items-center bg-gray-50">
                                <Package className="h-5 w-5 text-[#28B463] mr-3" />
                                <h3 className="font-black text-black uppercase tracking-widest text-sm poppins">Items Purchased</h3>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {(enrichedItems.length > 0 ? enrichedItems : items).map((item, idx) => (
                                    <div key={idx} className="p-8 flex items-start gap-6 hover:bg-gray-50 transition-colors">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-24 h-24 object-cover rounded-2xl border border-gray-200 shadow-sm"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/placeholder.png';
                                            }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-lg font-black text-black mb-1 poppins">{item.name}</h4>
                                                    <p className="text-xs font-bold text-gray-500 mb-4">{item.nameEn}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-[#28B463]">{item.price} EGP</p>
                                                    <p className="text-[10px] font-bold text-gray-400">Qty: {item.quantity}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Part Brand</p>
                                                    <p className="text-xs font-black text-gray-800">{item.partBrand || item.brand}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Origin</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-[#28B463]"></span>
                                                        <p className="text-xs font-black text-gray-800">{item.origin || item.countryOfOrigin || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Categorization</p>
                                                    <p className="text-xs font-black text-gray-800">
                                                        {item.category || 'N/A'} {item.subcategory || item.subCategory ? `• ${item.subcategory || item.subCategory}` : ''}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Compatibility</p>
                                                    <p className="text-xs font-black text-gray-800">
                                                        {item.make} {item.model}
                                                        {(item.yearRange || item.yearStart) && (
                                                            <span className="text-gray-400 ml-1">
                                                                ({item.yearRange || `${item.yearStart}${item.yearEnd ? ` - ${item.yearEnd}` : ''}`})
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">SKU / Part #</p>
                                                    <p className="text-xs font-mono font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200 inline-block">
                                                        {item.partNumber || item.sku || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 space-y-3">
                                <div className="flex justify-between items-center text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                    <span>Subtotal</span>
                                    <span className="text-gray-700">{order.subtotal || (total - (order.shipping_cost || 0))} EGP</span>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-green-600 font-black uppercase tracking-widest">
                                        <span>Discount ({order.promoCode || 'Applied'})</span>
                                        <span>-{order.discount} EGP</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-[10px] text-[#28B463] font-black uppercase tracking-widest">
                                    <span>Shipping Cost</span>
                                    <span>+{order.shipping_cost || 0} EGP</span>
                                </div>
                                {order.extraFees > 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-blue-600 font-black uppercase tracking-widest">
                                        <span>Extra Fees / Service</span>
                                        <span>+{order.extraFees} EGP</span>
                                    </div>
                                )}
                                {order.manualDiscount > 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-red-500 font-black uppercase tracking-widest">
                                        <span>Manual Adjustment</span>
                                        <span>-{order.manualDiscount} EGP</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                    <span className="text-sm font-black text-black uppercase tracking-widest poppins">Total Amount</span>
                                    <span className="text-2xl font-black text-[#1A1A1A] poppins">{total} <span className="text-[10px] font-normal text-gray-400">EGP</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Customer Info */}
                    <div className="space-y-6">
                        <div className="bg-white shadow-sm rounded-3xl p-8 border border-gray-100">
                            <div className="flex items-center mb-6 text-black font-black uppercase tracking-widest text-sm poppins border-b border-gray-50 pb-4">
                                <User className="h-5 w-5 text-[#28B463] mr-3" />
                                <h3>Customer Info</h3>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Name</p>
                                    <p className="font-bold text-black text-lg">{customer.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Phone</p>
                                    <p className="font-bold text-[#1A1A1A] text-lg">{customer.phone}</p>
                                </div>
                                {order.currentMileage && (
                                    <div className="pt-4 border-t border-gray-50">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Current Mileage</p>
                                        <p className="text-lg font-black text-orange-600">{order.currentMileage} <span className="text-[10px] font-normal text-gray-400">KM</span></p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white shadow-sm rounded-3xl p-8 border border-gray-100">
                            <div className="flex items-center mb-6 text-black font-black uppercase tracking-widest text-sm poppins border-b border-gray-50 pb-4">
                                <MapPin className="h-5 w-5 text-[#28B463] mr-3" />
                                <h3>Shipping Address</h3>
                            </div>
                            <div className="space-y-4">
                                {customer.governorate && (
                                    <p className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-100 inline-block uppercase tracking-widest">
                                        {customer.governorate} {customer.city ? `- ${customer.city}` : ''}
                                    </p>
                                )}
                                <p className="text-sm text-gray-600 leading-relaxed font-bold">
                                    {customer.address}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm rounded-3xl p-8 border border-gray-100">
                            <div className="flex items-center mb-6 text-black font-black uppercase tracking-widest text-sm poppins border-b border-gray-50 pb-4">
                                <CreditCard className="h-5 w-5 text-[#28B463] mr-3" />
                                <h3>Payment Info</h3>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-black uppercase tracking-widest">{paymentMethod}</span>
                                <span className="px-3 py-1 text-[10px] font-black bg-green-50 text-green-600 rounded-lg border border-green-100 uppercase tracking-widest">Confirmed</span>
                            </div>
                            {order.receiptUrl && (
                                <div className="mt-6 pt-6 border-t border-gray-50 animate-in fade-in slide-in-from-top-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Payment Receipt</p>
                                    <div className="relative group">
                                        <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={order.receiptUrl}
                                                alt="Payment Receipt"
                                                className="w-full h-auto rounded-2xl border border-gray-200 shadow-sm group-hover:shadow-md transition-all"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-2xl flex items-center justify-center">
                                                <p className="text-white font-black opacity-0 group-hover:opacity-100 uppercase tracking-widest text-xs bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm">View Full Size</p>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Order Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl relative w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 max-h-[90vh] flex flex-col">
                        <div className="bg-[#28B463] p-8 text-white shrink-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-widest poppins">Order Editor</h3>
                                    <p className="text-white/70 text-[10px] font-black mt-1 uppercase tracking-widest">Advanced Modifications • #{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto flex-1">
                            {/* Section: Status & Method */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Status</label>
                                    <select
                                        value={editForm.paymentStatus}
                                        onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all font-bold text-sm"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Failed">Failed</option>
                                        <option value="Refunded">Refunded</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all font-bold text-sm"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                        <option value="Returned">Returned</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section: Items Management */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Items</label>
                                    <div className="relative w-64">
                                        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5 focus-within:ring-2 ring-[#28B463]">
                                            <Search className="h-3.5 w-3.5 text-gray-400 mr-2" />
                                            <input
                                                type="text"
                                                placeholder="Add product..."
                                                value={productSearch}
                                                onChange={(e) => handleProductSearch(e.target.value)}
                                                className="bg-transparent border-none outline-none text-xs w-full font-bold"
                                            />
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 shadow-xl rounded-xl z-[60] overflow-hidden">
                                                {searchResults.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => addProductToOrder(p)}
                                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                                                    >
                                                        <div className="bg-gray-100 rounded h-8 w-8 shrink-0 overflow-hidden">
                                                            <img src={p.image || p.images?.[0]} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black truncate">{p.name}</p>
                                                            <p className="text-[10px] text-[#28B463] font-bold">{p.price} EGP</p>
                                                        </div>
                                                        <PlusCircle className="ml-auto h-4 w-4 text-[#28B463]" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-200">
                                    {editForm.items.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 italic text-sm font-bold">No items in order</div>
                                    ) : editForm.items.map((item, idx) => (
                                        <div key={idx} className="p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden shrink-0">
                                                <img src={item.image} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black truncate text-black uppercase tracking-tight">{item.name}</p>
                                                <p className="text-[10px] font-bold text-[#28B463]">{item.price} EGP</p>
                                            </div>
                                            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                <button onClick={() => updateItemQuantity(item.id, -1)} className="p-2 hover:bg-gray-50 text-gray-500 transition-colors">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="px-3 py-1 font-black text-xs min-w-[30px] text-center border-x border-gray-100">
                                                    {item.quantity}
                                                </span>
                                                <button onClick={() => updateItemQuantity(item.id, 1)} className="p-2 hover:bg-gray-50 text-gray-500 transition-colors">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Financial Adjustments */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Extra Fees / Service (EGP)</label>
                                    <input
                                        type="number"
                                        value={editForm.extraFees}
                                        onChange={(e) => setEditForm({ ...editForm, extraFees: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Manual Discount (EGP)</label>
                                    <input
                                        type="number"
                                        value={editForm.manualDiscount}
                                        onChange={(e) => setEditForm({ ...editForm, manualDiscount: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {/* Recap Section */}
                            <div className="bg-gray-900 rounded-2xl p-6 text-white space-y-2 shrink-0">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                                    <span>New Subtotal</span>
                                    <span>{calculateRecalculatedTotals().subtotal} EGP</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                                    <span>Shipping + Fees</span>
                                    <span>+{(parseFloat(order.shipping_cost || 0) + parseFloat(editForm.extraFees || 0))} EGP</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                    <span className="text-sm font-black uppercase tracking-widest poppins">Projected Total</span>
                                    <span className="text-2xl font-black text-[#28B463] poppins">{calculateRecalculatedTotals().total} <span className="text-[10px] font-normal text-white/50">EGP</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-100 shrink-0 bg-gray-50">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={updating}
                                    className="flex-[2] bg-[#28B463] hover:bg-[#219653] text-white font-black py-4 rounded-xl shadow-lg shadow-[#28B463]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                                >
                                    {updating ? "Processing..." : "Commit Changes"}
                                    {!updating && <Save className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderDetails;
