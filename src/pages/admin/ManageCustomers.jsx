import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    where,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import {
    Search,
    UserPlus,
    Edit3,
    Trash2,
    ShieldAlert,
    ShieldCheck,
    MoreVertical,
    X,
    Filter,
    Mail,
    Phone,
    User,
    Lock,
    Eye,
    Package,
    Clock,
    Loader2,
    CreditCard,
    MapPin
} from 'lucide-react';

const ManageCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);
    const [fetchingOrders, setFetchingOrders] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        isAffiliate: false,
        isBlocked: false
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCustomers(list);
        } catch (error) {
            console.error("Error fetching customers:", error);
            toast.error("Failed to load customers");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredCustomers = customers.filter(c =>
        (c.fullName && c.fullName.toLowerCase().includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery)) ||
        (c.phoneNumber && c.phoneNumber.includes(searchQuery))
    );

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Note: Creating a user in Firebase Auth from Admin panel usually requires Firebase Admin SDK
            // or a custom backend function. For now, we only create the Firestore document.
            // If the user wants actual Auth creation, he might need a Cloud Function.
            // But I'll implement the document creation as requested.

            const newCustomer = {
                ...formData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Remove password before saving to Firestore (Security)
            const { password, ...firestoreData } = newCustomer;

            const docRef = await addDoc(collection(db, 'users'), firestoreData);

            toast.success("Customer added successfully (Firestore only)");
            setShowAddModal(false);
            setFormData({ fullName: '', email: '', phoneNumber: '', password: '', isAffiliate: false, isBlocked: false });
            fetchCustomers();
        } catch (error) {
            console.error("Error adding customer:", error);
            toast.error("Failed to add customer");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCustomer = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const docRef = doc(db, 'users', selectedCustomer.id);
            await updateDoc(docRef, {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                updatedAt: serverTimestamp()
            });

            toast.success("Customer updated successfully");
            setShowEditModal(false);
            fetchCustomers();
        } catch (error) {
            console.error("Error updating customer:", error);
            toast.error("Failed to update customer");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCustomer = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            try {
                await deleteDoc(doc(db, 'users', id));
                toast.success("Customer deleted");
                fetchCustomers();
            } catch (error) {
                console.error("Error deleting customer:", error);
                toast.error("Failed to delete customer");
            }
        }
    };

    const handleToggleBlock = async (id, currentStatus, name) => {
        const action = currentStatus ? 'unblock' : 'block';
        if (window.confirm(`Are you sure you want to ${action} "${name}"?`)) {
            try {
                await updateDoc(doc(db, 'users', id), {
                    isBlocked: !currentStatus
                });
                toast.success(`Customer ${currentStatus ? 'unblocked' : 'blocked'}`);
                fetchCustomers();
            } catch (error) {
                console.error("Error toggling block status:", error);
                toast.error("Failed to update status");
            }
        }
    };

    const openEditModal = (customer) => {
        setSelectedCustomer(customer);
        setFormData({
            fullName: customer.fullName || '',
            email: customer.email || '',
            phoneNumber: customer.phoneNumber || '',
            isAffiliate: customer.isAffiliate || false,
            isBlocked: customer.isBlocked || false
        });
        setShowEditModal(true);
    };

    const fetchOrderHistory = async (userId) => {
        setFetchingOrders(true);
        try {
            const q = query(
                collection(db, 'orders'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const qSnap = await getDocs(q);
            const list = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSelectedCustomerOrders(list);
        } catch (error) {
            console.error("Error fetching order history:", error);
            // Fallback for missing index or other errors
            try {
                const q = query(
                    collection(db, 'orders'),
                    where('userId', '==', userId)
                );
                const qSnap = await getDocs(q);
                const list = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setSelectedCustomerOrders(list);
            } catch (err2) {
                console.error("Fallback fetch fail:", err2);
                toast.error("Failed to load order history");
            }
        } finally {
            setFetchingOrders(false);
        }
    };

    const openViewModal = (customer) => {
        setSelectedCustomer(customer);
        setSelectedCustomerOrders([]);
        setShowViewModal(true);
        fetchOrderHistory(customer.id);
    };

    const getUniqueAddresses = (orders) => {
        const addresses = orders.map(o => o.customer?.address).filter(Boolean);
        return [...new Set(addresses)];
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
            <AdminHeader title="Customer Management" />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-black uppercase tracking-tight italic font-Cairo">Registered Customers</h2>
                        <p className="text-sm text-gray-500 mt-1 font-bold">
                            Total registered: {customers.length} users
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setFormData({ fullName: '', email: '', phoneNumber: '', password: '', isAffiliate: false, isBlocked: false });
                            setShowAddModal(true);
                        }}
                        className="admin-primary-btn !w-fit !px-8 flex items-center gap-2"
                    >
                        <UserPlus className="h-5 w-5" />
                        Register New Customer
                    </button>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#28B463] outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Customers Table */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Registered</th>
                                    <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#28B463] mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-gray-500 font-bold">
                                            No customers found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#28B463] font-black group-hover:bg-[#28B463] group-hover:text-white transition-colors">
                                                        {(customer.fullName || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-black">{customer.fullName || 'Unnamed User'}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wide">ID: {customer.id.substring(0, 8)}...</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                        {customer.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                        {customer.phoneNumber || 'N/A'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {customer.isBlocked ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-600 uppercase tracking-wider">
                                                        <ShieldAlert className="h-3 w-3" />
                                                        Blocked
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-600 uppercase tracking-wider">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Active
                                                    </span>
                                                )}
                                                {customer.isAffiliate && (
                                                    <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-600 uppercase tracking-wider">
                                                        Affiliate
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-500 font-bold">
                                                {customer.createdAt?.toDate ? customer.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 pr-2">
                                                    <button
                                                        onClick={() => openViewModal(customer)}
                                                        className="p-2 text-gray-400 hover:text-[#28B463] hover:bg-green-50 rounded-xl transition-all"
                                                        title="View History"
                                                    >
                                                        <Eye className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(customer)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleBlock(customer.id, customer.isBlocked, customer.fullName)}
                                                        className={`p-2 rounded-xl transition-all ${customer.isBlocked ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
                                                        title={customer.isBlocked ? "Unblock" : "Block"}
                                                    >
                                                        {customer.isBlocked ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCustomer(customer.id, customer.fullName)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals Section */}
            {(showAddModal || showEditModal) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-[#1A1A1A] p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#28B463] rounded-xl flex items-center justify-center">
                                    {showAddModal ? <UserPlus className="h-5 w-5 text-white" /> : <Edit3 className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-widest">{showAddModal ? 'Register Customer' : 'Edit Customer'}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{showAddModal ? 'Create new user profile' : 'Update existing customer data'}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={showAddModal ? handleAddCustomer : handleEditCustomer} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#28B463] outline-none transition-all"
                                            placeholder="Ahmed Ali"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#28B463] outline-none transition-all"
                                            placeholder="ahmed@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#28B463] outline-none transition-all"
                                            placeholder="010XXXXXXXX"
                                        />
                                    </div>
                                </div>

                                {showAddModal && (
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Temporary Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="password"
                                                required={showAddModal}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#28B463] outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold mt-2 italic">* Password is only used if creating via Firebase Admin API (currently Firestore only).</p>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#1A1A1A] text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 uppercase tracking-widest text-xs"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </span>
                                ) : (
                                    showAddModal ? 'Initialize Account' : 'Save Changes'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View History Modal */}
            {showViewModal && selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-gray-100">
                        {/* Modal Header */}
                        <div className="bg-[#1A1A1A] p-8 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-[#28B463] rounded-2xl flex items-center justify-center shadow-lg shadow-[#28B463]/20">
                                    <User className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-widest poppins italic">{selectedCustomer.fullName}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-1">Customer Dashboard • Comprehensive Record</p>
                                </div>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                                <X className="h-8 w-8" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                            {/* Profile Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Mail className="w-3 h-3 text-[#28B463]" /> Contact Matrix
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold mb-0.5">Primary Email</p>
                                            <p className="font-black text-black break-all">{selectedCustomer.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold mb-0.5">Phone Line</p>
                                            <p className="font-black text-black">{selectedCustomer.phoneNumber || 'Not Linked'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-[#28B463]" /> Captured Addresses
                                    </p>
                                    <div className="space-y-3">
                                        {fetchingOrders ? (
                                            <div className="animate-pulse flex space-y-2 flex-col">
                                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            </div>
                                        ) : getUniqueAddresses(selectedCustomerOrders).length === 0 ? (
                                            <p className="text-sm text-gray-400 font-bold italic">No addresses captured from history.</p>
                                        ) : (
                                            getUniqueAddresses(selectedCustomerOrders).map((addr, idx) => (
                                                <div key={idx} className="flex gap-2 text-sm text-gray-700 font-bold">
                                                    <span className="text-[#28B463] mt-1 shrink-0">•</span>
                                                    <span>{addr}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-[#28B463]" /> Account Ledger
                                    </p>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-gray-500 font-bold">Total Purchases</p>
                                            <p className="font-black text-[#28B463] text-lg">{selectedCustomerOrders.length}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-gray-500 font-bold">Total Spent</p>
                                            <p className="font-black text-black text-lg">
                                                {selectedCustomerOrders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)} EGP
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order History */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <p className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-4 h-4 text-[#28B463]" /> Complete Lifecycle History
                                    </p>
                                    {fetchingOrders && <Loader2 className="w-4 h-4 animate-spin text-[#28B463]" />}
                                </div>

                                {fetchingOrders ? (
                                    <div className="py-20 text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#28B463] mx-auto"></div>
                                        <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">Retrieving Order Manifest...</p>
                                    </div>
                                ) : selectedCustomerOrders.length === 0 ? (
                                    <div className="py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                        <h4 className="text-lg font-black text-black uppercase">No Order History</h4>
                                        <p className="text-gray-400 font-bold text-sm">This customer hasn't established a purchase record yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {selectedCustomerOrders.map((order) => (
                                            <div key={order.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-xl hover:border-green-100 transition-all group/order">
                                                <div className="bg-gray-50 px-8 py-4 flex flex-wrap justify-between items-center gap-4 group-hover/order:bg-green-50 transition-colors">
                                                    <div className="flex gap-8">
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Order Index</p>
                                                            <p className="text-sm font-black text-black poppins">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Timeline</p>
                                                            <p className="text-sm font-bold text-gray-700 poppins">
                                                                {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Settlement</p>
                                                            <div className="flex items-center gap-2">
                                                                <CreditCard className="w-3 h-3 text-gray-400" />
                                                                <p className="text-[10px] font-black uppercase text-black">{order.paymentMethod || 'Manual'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest border
                                                            ${order.status === 'Delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                order.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                    'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                                            {order.status}
                                                        </span>
                                                        <p className="text-xl font-black text-black poppins">{order.total} <span className="text-[10px] text-gray-400">EGP</span></p>
                                                    </div>
                                                </div>
                                                <div className="p-8">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {order.items?.map((item, idx) => (
                                                            <div key={idx} className="flex gap-4 items-center p-3 rounded-2xl bg-gray-50/50 border border-gray-50">
                                                                <img
                                                                    src={item.image || '/placeholder.png'}
                                                                    alt={item.name}
                                                                    className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-black text-black truncate">{item.name}</p>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                        {item.partBrand || item.brand} • Qty: {item.quantity}
                                                                    </p>
                                                                </div>
                                                                <p className="ml-auto text-xs font-black text-[#28B463]">{item.price} EGP</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-8 py-3 bg-[#1A1A1A] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
                            >
                                Dismiss Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageCustomers;
