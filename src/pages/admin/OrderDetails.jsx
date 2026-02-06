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
import AdminHeader from '../../components/AdminHeader';
import { useStaticData } from '../../context/StaticDataContext';
import { normalizeArabic } from '../../utils/productUtils';

const OrderDetails = () => {
    const {
        staticProducts,
        categories: staticCategories,
        cars: staticCars,
        isStaticLoaded
    } = useStaticData();

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
        notes: ''
    });
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Advanced Filtering States
    const [categories, setCategories] = useState([]);
    const [carOptions, setCarOptions] = useState([]);
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMake, setFilterMake] = useState('');
    const [filterModel, setFilterModel] = useState('');
    const [filterYear, setFilterYear] = useState('');

    // Initialize Metadata from static context
    useEffect(() => {
        if (isStaticLoaded) {
            setCategories(staticCategories);
            setCarOptions(staticCars);
            const uniqueMakes = [...new Set(staticCars.map(c => c.make))].sort();
            setMakes(uniqueMakes);
        }
    }, [isStaticLoaded, staticCategories, staticCars]);

    // Dependent Dropdown: Update models when make changes
    useEffect(() => {
        if (filterMake) {
            const makeModels = carOptions
                .filter(c => c.make === filterMake)
                .map(c => c.model);
            setModels([...new Set(makeModels)].sort());
            setFilterModel(''); // Reset model
        } else {
            setModels([]);
            setFilterModel('');
        }
    }, [filterMake, carOptions]);

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
                                category: productData.category || item.category || 'N/A',
                                subcategory: productData.subcategory || item.subcategory || item.subCategory || 'N/A',
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
            manualDiscount: order.manualDiscount || 0,
            notes: order.notes || ''
        });
        setShowEditModal(true);
    };

    const handleProductSearch = async (q) => {
        setProductSearch(q);

        // Trigger search if there's a query OR if filters are active
        if (!q && !filterCategory && !filterMake && !filterYear) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        // Quota Shield: Filter LOCAL staticProducts
        const searchLower = normalizeArabic(q.toLowerCase());

        const filtered = staticProducts.filter(p => {
            const matchesQuery = !q ||
                normalizeArabic(p.name?.toLowerCase() || '').includes(searchLower) ||
                normalizeArabic(p.nameEn?.toLowerCase() || '').includes(searchLower) ||
                p.sku?.toLowerCase().includes(searchLower) ||
                p.partNumber?.toLowerCase().includes(searchLower);

            const matchesCategory = !filterCategory || p.category === filterCategory;
            const matchesMake = !filterMake || p.make === filterMake;
            const matchesModel = !filterModel || p.model === filterModel;

            const matchesYear = !filterYear || (
                (!p.yearStart || Number(filterYear) >= Number(p.yearStart)) &&
                (!p.yearEnd || Number(filterYear) <= Number(p.yearEnd))
            );

            return matchesQuery && matchesCategory && matchesMake && matchesModel && matchesYear;
        }).slice(0, 30);

        setSearchResults(filtered);
        setIsSearching(false);
    };

    // Re-trigger search when filters change
    useEffect(() => {
        handleProductSearch(productSearch);
    }, [filterCategory, filterMake, filterModel, filterYear]);

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
                    brand: product.partBrand || product.brand || 'N/A',
                    category: product.category || 'N/A',
                    subcategory: product.subcategory || 'N/A',
                    origin: product.origin || product.countryOfOrigin || 'N/A',
                    make: product.make || 'Universal',
                    model: product.model || 'Universal',
                    yearStart: product.yearStart || '',
                    yearEnd: product.yearEnd || '',
                    partNumber: product.partNumber || product.sku || 'N/A'
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
                notes: editForm.notes || '',
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

                        {/* Order Notes Section */}
                        <div className="bg-white shadow-sm rounded-3xl p-8 border border-gray-100">
                            <div className="flex items-center mb-6 text-black font-black uppercase tracking-widest text-sm poppins border-b border-gray-50 pb-4">
                                <AlertCircle className="h-5 w-5 text-[#28B463] mr-3" />
                                <h3>Order Notes</h3>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <p className="text-sm text-gray-600 leading-relaxed font-bold whitespace-pre-wrap">
                                    {order.notes || "No special instructions or notes for this order."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Order Modal */}
            {
                showEditModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowEditModal(false)}></div>
                        <div className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-100 flex flex-col max-h-[95vh]">
                            {/* Header: Premium Dark Style */}
                            <div className="bg-[#1A1A1A] p-8 text-white relative overflow-hidden shrink-0">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-2 w-2 rounded-full bg-[#E31E24] animate-pulse"></div>
                                            <h3 className="text-xl font-black uppercase tracking-widest poppins italic">Pro-Grade Order Editor</h3>
                                        </div>
                                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Precision Modification • #{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X className="h-6 w-6 text-white/50 hover:text-white" />
                                    </button>
                                </div>
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Package className="w-48 h-48" />
                                </div>
                            </div>

                            <div className="p-8 space-y-8 overflow-y-auto flex-1">
                                {/* Core Parameters Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <CreditCard className="w-3 h-3" />
                                            Payment Flow
                                        </label>
                                        <div className="space-y-3">
                                            <select
                                                value={editForm.paymentMethod}
                                                onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all font-bold text-xs"
                                            >
                                                <option value="Cash on Delivery">Cash on Delivery</option>
                                                <option value="Credit Card (EasyKash)">Credit Card (EasyKash)</option>
                                                <option value="Instapay">Instapay</option>
                                                <option value="Wallet">Wallet</option>
                                            </select>
                                            <select
                                                value={editForm.paymentStatus}
                                                onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                                className={`w-full px-5 py-3.5 border rounded-2xl outline-none transition-all font-bold text-xs ${editForm.paymentStatus === 'Paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-black border-gray-100'}`}
                                            >
                                                <option value="Pending">Pending Verification</option>
                                                <option value="Paid">Verified: Paid</option>
                                                <option value="Failed">Operation: Failed</option>
                                                <option value="Refunded">Action: Refunded</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            Operational Status
                                        </label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all font-bold text-xs mb-3"
                                        >
                                            <option value="Pending">Inbound / Pending</option>
                                            <option value="Processing">Workflow: Processing</option>
                                            <option value="Shipped">Transit: Shipped</option>
                                            <option value="Delivered">Terminal: Delivered</option>
                                            <option value="Cancelled">Void: Cancelled</option>
                                            <option value="Returned">Reversal: Returned</option>
                                        </select>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                                            <div className="h-10 w-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div className="min-w-0 text-[10px] font-black uppercase tracking-widest">
                                                <p className="text-gray-400">Consignee</p>
                                                <p className="text-black truncate text-xs">{customer.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section: Robust Management */}
                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Inventory Filter Matrix</label>
                                            {(filterCategory || filterMake || filterYear || productSearch) && (
                                                <button
                                                    onClick={() => {
                                                        setFilterCategory('');
                                                        setFilterMake('');
                                                        setFilterModel('');
                                                        setFilterYear('');
                                                        setProductSearch('');
                                                        setSearchResults([]);
                                                    }}
                                                    className="text-[9px] font-black text-[#E31E24] uppercase tracking-widest hover:underline"
                                                >
                                                    Clear All Filters
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none"
                                            >
                                                <option value="">All Categories</option>
                                                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                            </select>
                                            <select
                                                value={filterMake}
                                                onChange={(e) => setFilterMake(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none"
                                            >
                                                <option value="">All Makes</option>
                                                {makes.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <select
                                                value={filterModel}
                                                onChange={(e) => setFilterModel(e.target.value)}
                                                disabled={!filterMake}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none disabled:opacity-50"
                                            >
                                                <option value="">All Models</option>
                                                {models.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Year"
                                                value={filterYear}
                                                onChange={(e) => setFilterYear(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none"
                                            />
                                        </div>

                                        <div className="relative">
                                            <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 focus-within:ring-2 ring-[#1A1A1A]">
                                                <Search className="h-4 w-4 text-gray-400 mr-3" />
                                                <input
                                                    type="text"
                                                    placeholder="Add product by name, SKU or Part#..."
                                                    value={productSearch}
                                                    onChange={(e) => handleProductSearch(e.target.value)}
                                                    className="bg-transparent border-none outline-none text-xs w-full font-bold text-black"
                                                />
                                            </div>
                                            {isSearching && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <div className="animate-spin h-3 w-3 border-b-2 border-[#1A1A1A] rounded-full"></div>
                                                </div>
                                            )}
                                            {searchResults.length > 0 && (
                                                <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 shadow-2xl rounded-2xl z-[110] overflow-hidden max-h-64 overflow-y-auto">
                                                    {searchResults.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => addProductToOrder(p)}
                                                            className="w-full px-5 py-4 text-left hover:bg-gray-50 flex items-center gap-4 border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="bg-gray-100 rounded-lg h-10 w-10 shrink-0 overflow-hidden border border-gray-200">
                                                                <img src={p.image || p.images?.[0]} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-black truncate">{p.name}</p>
                                                                <div className="flex gap-2 mt-0.5">
                                                                    <p className="text-[10px] text-[#E31E24] font-black uppercase tracking-widest">{p.price} EGP</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">| {p.partBrand || p.brand}</p>
                                                                </div>
                                                            </div>
                                                            <PlusCircle className="h-5 w-5 text-[#E31E24] opacity-50 hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-[28px] border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                                        {editForm.items.length === 0 ? (
                                            <div className="p-12 text-center text-gray-300 italic text-xs font-bold uppercase tracking-widest">No Active Payloads</div>
                                        ) : editForm.items.map((item, idx) => (
                                            <div key={idx} className="p-5 flex items-center gap-5 bg-white last:border-0">
                                                <div className="w-14 h-14 rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden shrink-0 shadow-sm">
                                                    <img src={item.image} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black truncate text-black uppercase tracking-tight poppins">{item.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] font-black text-[#E31E24] tracking-widest">{item.price} EGP</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">| {item.brand || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shadow-inner">
                                                    <button onClick={() => updateItemQuantity(item.id, -1)} className="p-2.5 hover:bg-gray-200 text-gray-500 transition-all active:scale-90">
                                                        <Minus className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span className="px-4 py-1 font-black text-xs min-w-[36px] text-center text-black">
                                                        {item.quantity}
                                                    </span>
                                                    <button onClick={() => updateItemQuantity(item.id, 1)} className="p-2.5 hover:bg-gray-200 text-gray-500 transition-all active:scale-90">
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="p-2.5 text-gray-300 hover:text-[#E31E24] hover:bg-red-50 rounded-xl transition-all active:scale-90">
                                                    <Trash2 className="h-4.5 w-4.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section: Financial Overrides */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Service Surcharge (EGP)</label>
                                        <input
                                            type="number"
                                            value={editForm.extraFees}
                                            onChange={(e) => setEditForm({ ...editForm, extraFees: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all font-black text-xs"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Manual Adjustment (EGP)</label>
                                        <input
                                            type="number"
                                            value={editForm.manualDiscount}
                                            onChange={(e) => setEditForm({ ...editForm, manualDiscount: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#E31E24] outline-none transition-all font-black text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Order Notes Section */}
                                <div className="pt-4 border-t border-gray-50">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3" />
                                        Internal & Customer Notes
                                    </label>
                                    <textarea
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all font-bold text-xs"
                                        placeholder="Special instructions, delivery notes, or internal tracking details..."
                                        rows={3}
                                    />
                                </div>

                                {/* Recap Section */}
                                <div className="bg-[#1A1A1A] rounded-[28px] p-8 text-white space-y-3 shrink-0 shadow-2xl relative overflow-hidden">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                                        <span>Subtotal Matrix</span>
                                        <span>{calculateRecalculatedTotals().subtotal} EGP</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                                        <span>Logistics + Surcharge</span>
                                        <span>+{(parseFloat(order.shipping_cost || 0) + parseFloat(editForm.extraFees || 0))} EGP</span>
                                    </div>
                                    {order.discount > 0 && (
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#E31E24]">
                                            <span>Promo Injection</span>
                                            <span>-{order.discount} EGP</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-5 mt-2 border-t border-white/10 relative z-10">
                                        <span className="text-sm font-black uppercase tracking-[0.2em] poppins italic opacity-60">Terminal Total</span>
                                        <span className="text-3xl font-black text-white poppins tabular-nums transition-all">
                                            {calculateRecalculatedTotals().total} <span className="text-[12px] font-bold text-white/30 tracking-widest uppercase">EGP</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-50 shrink-0 bg-white">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-6 py-4 rounded-2xl font-black text-gray-400 hover:text-black hover:bg-gray-50 transition-all uppercase tracking-[0.2em] text-[10px]"
                                    >
                                        Abort Changes
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={updating}
                                        className="flex-[2] bg-[#1A1A1A] hover:bg-black text-white font-black py-4 rounded-[20px] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-[11px]"
                                    >
                                        {updating ? "Processing..." : "Commit Protocol"}
                                        {!updating && <Save className="h-5 w-5 text-[#E31E24]" />}
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
