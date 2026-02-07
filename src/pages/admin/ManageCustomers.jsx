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
            const response = await databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.equal('$id', customer.id), Query.orderDesc('$createdAt')]);
            setSelectedCustomerOrders(response.documents.map(d => ({ id: d.$id, ...d })));
        } catch (e) { toast.error("History fetch failure"); }
        finally { setFetchingOrders(false); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Customer Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Identity Registry</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {totalCount} Neural Nodes</p>
                    </div>
                    <button onClick={() => { setFormData({ fullName: '', email: '', phoneNumber: '', secondaryPhone: '', address: '', isAffiliate: false, isBlocked: false }); setShowAddModal(true); }} className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase italic text-xs shadow-2xl hover:scale-105 transition-all flex items-center gap-2"><UserPlus size={18} /> Register Profile</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Active Nodes</p><p className="text-2xl font-black italic">{customers.filter(c => !c.isBlocked).length}</p></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl"><ShieldAlert size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Terminated</p><p className="text-2xl font-black italic">{customers.filter(c => c.isBlocked).length}</p></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl"><Award size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Affiliates</p><p className="text-2xl font-black italic">{customers.filter(c => c.isAffiliate).length}</p></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><TrendingUp size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">New Protocols</p><p className="text-2xl font-black italic">+12%</p></div></div>
                </div>

                <div className="bg-white p-4 rounded-3xl border shadow-sm mb-10 relative"><Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300" /><input value={searchQuery} onChange={handleSearch} placeholder="Search matrix by name, email, or digital signature..." className="w-full pl-16 pr-6 py-5 bg-gray-50/50 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-black transition-all" /></div>

                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-8 py-6">Customer Profile</th>
                                    <th className="px-8 py-6">Registry Intel</th>
                                    <th className="px-8 py-6 text-center">Security State</th>
                                    <th className="px-8 py-6">Initialization</th>
                                    <th className="px-8 py-6 text-right">Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr> : filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="hover:bg-gray-50/50 group transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 group-hover:bg-black group-hover:text-white transition-all uppercase">{customer.fullName?.[0]}</div>
                                                <div><h4 className="font-black text-sm uppercase italic">{customer.fullName}</h4><p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">ID: {customer.id}</p></div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 flex flex-col gap-2">
                                            <span className="text-[11px] font-black uppercase text-gray-500 flex items-center gap-2"><Mail size={12} />{customer.email}</span>
                                            <span className="text-[11px] font-black uppercase text-gray-500 flex items-center gap-2"><Phone size={12} />{customer.phoneNumber || 'Node silent'}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button onClick={() => handleToggleBlock(customer.id, customer.isBlocked, customer.fullName)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${customer.isBlocked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{customer.isBlocked ? 'Restricted' : 'Authenticated'}</button>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-bold text-gray-400 font-mono">{new Date(customer.$createdAt).toLocaleDateString()}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                                <button onClick={() => openViewModal(customer)} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Eye size={18} /></button>
                                                <button onClick={() => { setSelectedCustomer(customer); setFormData({ ...customer }); setShowEditModal(true); }} className="p-3 bg-white text-black border rounded-xl shadow-xl hover:bg-black hover:text-white transition-all"><Edit3 size={18} /></button>
                                                <button onClick={() => handleDelete(customer.id, customer.fullName)} className="p-3 bg-white text-red-600 border rounded-xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
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
