import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import {
    Search, UserPlus, Edit3, Trash2, ShieldAlert, ShieldCheck, X, Mail, Phone, User, Eye, Package, Clock, Loader2, MapPin, Database, Award, Activity, BarChart3, TrendingUp
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
    const [totalCount, setTotalCount] = useState(0);

    const [formData, setFormData] = useState({ fullName: '', email: '', phoneNumber: '', secondaryPhone: '', address: '', isAffiliate: false, isBlocked: false });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const USERS_COLLECTION = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID;
    const ORDERS_COLLECTION = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders';

    const fetchCustomers = async () => {
        if (!DATABASE_ID || !USERS_COLLECTION) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [Query.orderDesc('$createdAt'), Query.limit(100)]);
            setCustomers(response.documents.map(doc => ({ id: doc.$id, ...doc })));
            setTotalCount(response.total);
        } catch (error) { toast.error("Cloud registry failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCustomers(); }, [DATABASE_ID, USERS_COLLECTION]);

    const handleSearch = (e) => setSearchQuery(e.target.value.toLowerCase());

    const filteredCustomers = customers.filter(c =>
        (c.fullName && c.fullName.toLowerCase().includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery)) ||
        (c.phoneNumber && c.phoneNumber.includes(searchQuery))
    );

    const handleCommit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...formData, updatedAt: new Date().toISOString() };
            if (showAddModal) {
                await databases.createDocument(DATABASE_ID, USERS_COLLECTION, ID.unique(), { ...payload, isAdmin: false, createdAt: new Date().toISOString() });
                toast.success("Profile registered");
            } else {
                await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, selectedCustomer.id, payload);
                toast.success("Record synchronized");
            }
            setShowAddModal(false); setShowEditModal(false); fetchCustomers();
        } catch (error) { toast.error("Sync failure"); }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Purge profile "${name}"?`)) return;
        try {
            await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION, id);
            toast.success("Record deleted"); fetchCustomers();
        } catch (error) { toast.error("Operation failed"); }
    };

    const handleToggleBlock = async (id, status, name) => {
        try {
            await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, id, { isBlocked: !status });
            toast.success(`Access ${!status ? 'terminated' : 'restored'}`); fetchCustomers();
        } catch (error) { toast.error("Update failure"); }
    };

    const openViewModal = async (customer) => {
        setSelectedCustomer(customer); setSelectedCustomerOrders([]); setShowViewModal(true); setFetchingOrders(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.equal('userId', customer.id), Query.orderDesc('$createdAt')]);
            setSelectedCustomerOrders(response.documents.map(d => {
                let parsedCustomer = {};
                try { parsedCustomer = d.customerInfo ? (typeof d.customerInfo === 'string' ? JSON.parse(d.customerInfo) : d.customerInfo) : {}; } catch (e) { console.warn("Failed to parse customer info"); }
                return { id: d.$id, ...d, customer: parsedCustomer };
            }));
        } catch (e) { toast.error("History fetch failure"); }
        finally { setFetchingOrders(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Customer Intelligence" />
            <main className="max-w-7xl mx-auto py-6 px-4 md:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Identity Registry</h2>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Oversight: {totalCount} Neural Nodes</p>
                    </div>
                    <button onClick={() => { setFormData({ fullName: '', email: '', phoneNumber: '', secondaryPhone: '', address: '', isAffiliate: false, isBlocked: false }); setShowAddModal(true); }} className="admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10"><UserPlus size={14} /> Register Profile</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="admin-card-compact p-5 flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20} /></div>
                        <div><p className="admin-text-subtle">Active Nodes</p><p className="text-xl font-bold text-slate-900">{customers.filter(c => !c.isBlocked).length}</p></div>
                    </div>
                    <div className="admin-card-compact p-5 flex items-center gap-4">
                        <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><ShieldAlert size={20} /></div>
                        <div><p className="admin-text-subtle">Terminated</p><p className="text-xl font-bold text-slate-900">{customers.filter(c => c.isBlocked).length}</p></div>
                    </div>
                    <div className="admin-card-compact p-5 flex items-center gap-4">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><Award size={20} /></div>
                        <div><p className="admin-text-subtle">Affiliates</p><p className="text-xl font-bold text-slate-900">{customers.filter(c => c.isAffiliate).length}</p></div>
                    </div>
                    <div className="admin-card-compact p-5 flex items-center gap-4">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={20} /></div>
                        <div><p className="admin-text-subtle">Velocity</p><p className="text-xl font-bold text-slate-900">+12.5%</p></div>
                    </div>
                </div>

                <div className="admin-card-compact p-3 mb-6 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input value={searchQuery} onChange={handleSearch} placeholder="Search matrix by name, email, or digital signature..." className="w-full pl-12 pr-6 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                </div>

                <div className="admin-card-compact overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full admin-table-dense">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="text-left">Customer Profile</th>
                                    <th className="text-left">Registry Intel</th>
                                    <th className="text-center">Security State</th>
                                    <th className="text-left">Initialization</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? <tr><td colSpan="5" className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" size={32} /></td></tr> : filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="hover:bg-slate-50/50 group transition-all">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all text-xs">{customer.fullName?.[0]}</div>
                                                <div><h4 className="text-[13px] font-bold text-slate-900 leading-tight">{customer.fullName}</h4><p className="text-[10px] text-slate-400 font-medium">Node: {customer.id.slice(-6).toUpperCase()}</p></div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5"><Mail size={10} className="text-slate-400" />{customer.email}</span>
                                                <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5"><Phone size={10} className="text-slate-400" />{customer.phoneNumber || 'Silent'}</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <button onClick={() => handleToggleBlock(customer.id, customer.isBlocked, customer.fullName)} className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${customer.isBlocked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{customer.isBlocked ? 'Restricted' : 'Authenticated'}</button>
                                        </td>
                                        <td><span className="text-[11px] font-medium text-slate-400">{new Date(customer.$createdAt).toLocaleDateString()}</span></td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-all">
                                                <button onClick={() => openViewModal(customer)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="View Intelligence"><Eye size={14} /></button>
                                                <button onClick={() => { setSelectedCustomer(customer); setFormData({ ...customer }); setShowEditModal(true); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Modify Record"><Edit3 size={14} /></button>
                                                <button onClick={() => handleDelete(customer.id, customer.fullName)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Purge Record"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {(showAddModal || showEditModal) && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}></div>
                        <div className="bg-white rounded-[3rem] w-full max-w-lg relative overflow-hidden flex flex-col shadow-2xl border-4 border-black">
                            <div className="bg-black p-10 text-white flex justify-between items-center"><h3 className="text-xl font-black uppercase italic tracking-wider">{showAddModal ? 'Register Profile' : 'Modify Record'}</h3><button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X /></button></div>
                            <form onSubmit={handleCommit} className="p-10 space-y-6">
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Full Signature</label><input value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-black" required /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Digital Relay (Email)</label><input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" className="w-full p-4 bg-gray-50 border rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-black" required /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Voice Link (Phone)</label><input value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-black" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400">Physical Node (Address)</label><textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold min-h-[100px] outline-none focus:ring-2 focus:ring-black" /></div>
                                <div className="flex justify-end pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black uppercase italic shadow-2xl hover:scale-105 transition-all">{isSubmitting ? 'Syncing...' : 'Commit Protocol'}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {showViewModal && selectedCustomer && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowViewModal(false)}></div>
                        <div className="bg-white rounded-[40px] w-full max-w-5xl h-[90vh] relative overflow-hidden flex flex-col shadow-2xl border-4 border-black">
                            <div className="bg-black p-10 text-white flex justify-between items-center"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-2xl"><User size={32} /></div><div><h3 className="text-2xl font-black uppercase italic tracking-widest">{selectedCustomer.fullName}</h3><p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em] mt-1">Lifecycle Manifest</p></div></div><button onClick={() => setShowViewModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all"><X size={32} /></button></div>
                            <div className="p-10 overflow-y-auto space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-dashed"><p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Registry Intel</p><div className="space-y-3"><p className="font-black flex items-center gap-3 text-sm italic"><Mail size={16} className="text-red-600" /> {selectedCustomer.email}</p><p className="font-black flex items-center gap-3 text-sm italic"><Phone size={16} className="text-red-600" /> {selectedCustomer.phoneNumber || 'Node silent'}</p><p className="font-black flex items-center gap-3 text-[10px] text-gray-400 mt-4 uppercase"><MapPin size={14} /> {selectedCustomer.address || 'Location unknown'}</p></div></div>
                                    <div className="bg-black p-8 rounded-[2rem] text-white flex flex-col justify-between"><p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-6">Fulfillment Frequency</p><div className="flex items-end justify-between"><span className="text-6xl font-black italic">{selectedCustomerOrders.length}</span><div className="text-right p-3 bg-white/10 rounded-2xl"><p className="text-[8px] font-black uppercase opacity-50">Total Orders</p><p className="text-xs font-black">COMPLETIONS</p></div></div></div>
                                    <div className="bg-red-600 p-8 rounded-[2rem] text-white flex flex-col justify-between"><p className="text-[10px] font-black uppercase text-black/40 tracking-widest mb-6">Gross Transactional Value</p><div className="flex items-end justify-between"><span className="text-5xl font-black italic">{(selectedCustomerOrders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)).toLocaleString()}</span><span className="text-xs font-black italic opacity-60 mb-2">EGP</span></div></div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 border-b pb-4"><Package className="text-red-600" /><h4 className="font-black uppercase italic tracking-widest">Transit Logs</h4></div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {fetchingOrders ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div> : selectedCustomerOrders.map(order => (
                                            <div key={order.id} className="bg-white rounded-3xl p-8 border hover:border-black transition-all flex justify-between items-center group shadow-sm">
                                                <div className="flex items-center gap-6"><div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-xs">#{order.orderNumber}</div><div><p className="font-black italic uppercase text-sm">Deployment {new Date(order.$createdAt).toLocaleDateString()}</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Status Protocol: {order.status}</p></div></div>
                                                <div className="text-right"><p className="text-xl font-black italic">{order.total?.toLocaleString()} <span className="text-[10px] not-italic opacity-40">EGP</span></p><span className="text-[9px] font-black uppercase px-4 py-2 bg-black text-white rounded-full mt-2 inline-block shadow-xl group-hover:bg-red-600 transition-all cursor-pointer">View Details</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ManageCustomers;
