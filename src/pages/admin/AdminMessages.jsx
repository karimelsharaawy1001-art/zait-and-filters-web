import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import {
    Mail, Phone, Trash2, Clock, User, CheckCircle2, Loader2, MessageSquare, Eye, EyeOff, Filter, X, Zap, Send, ShieldCheck, Activity, Target
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';

const AdminMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [actionId, setActionId] = useState(null);

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CONTACT_COLLECTION = import.meta.env.VITE_APPWRITE_CONTACT_COLLECTION_ID || 'contact_messages';

    const fetchMessages = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const queries = [Query.orderDesc('$createdAt'), Query.limit(100)];
            if (filterStatus !== 'All') queries.push(Query.equal('status', filterStatus));
            const response = await databases.listDocuments(DATABASE_ID, CONTACT_COLLECTION, queries);
            setMessages(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) { toast.error("Communication logs unreachable"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMessages(); }, [DATABASE_ID, filterStatus]);

    const handleUpdateStatus = async (id, newStatus) => {
        setActionId(id);
        try {
            await databases.updateDocument(DATABASE_ID, CONTACT_COLLECTION, id, { status: newStatus });
            setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
            toast.success(`Signal acknowledged: ${newStatus}`);
        } catch (error) { toast.error("Sync failure"); }
        finally { setActionId(null); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge this communication record?")) return;
        setActionId(id);
        try {
            await databases.deleteDocument(DATABASE_ID, CONTACT_COLLECTION, id);
            setMessages(prev => prev.filter(m => m.id !== id));
            toast.success("Record purged");
        } catch (error) { toast.error("Purge failure"); }
        finally { setActionId(null); }
    };

    const handleReply = (msg, mode) => {
        const text = encodeURIComponent(`أهلاً ${msg.name}، بخصوص استفسارك في Zait & Filters...`);
        if (mode === 'whatsapp') {
            window.open(`https://wa.me/${msg.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
        } else {
            window.location.href = `mailto:${msg.email}?subject=Re: ${msg.subject || 'Inquiry'}&body=${text}`;
        }
        handleUpdateStatus(msg.id, 'Replied');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Engagement Intelligence" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Terminal Comms</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Intercepting {messages.length} Field Transmissions</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border shadow-sm">
                        {['All', 'Unread', 'Read', 'Replied'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-black text-white shadow-xl translate-y-[-2px]' : 'text-gray-400 hover:bg-gray-50'}`}>{s}</button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Mail size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Incoming</p><h3 className="text-2xl font-black italic">{messages.filter(m => m.status === 'Unread').length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Resolved</p><h3 className="text-2xl font-black italic">{messages.filter(m => m.status === 'Replied').length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Response Time</p><h3 className="text-2xl font-black italic">45 <span className="text-[10px] opacity-40 italic">Min</span></h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Target size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Precision</p><h3 className="text-2xl font-black italic">98.2%</h3></div></div>
                </div>

                {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div> : messages.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed flex flex-col items-center">
                        <div className="bg-gray-50 p-10 rounded-full mb-8"><Zap className="h-12 w-12 text-gray-300" /></div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Quiet Frequency</h2>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-4">All customer signals have been acknowledged</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {messages.map(msg => (
                            <div key={msg.id} onClick={() => msg.status === 'Unread' && handleUpdateStatus(msg.id, 'Read')} className={`bg-white rounded-[3rem] border transition-all duration-500 overflow-hidden group cursor-pointer ${msg.status === 'Unread' ? 'border-red-600/30 shadow-2xl scale-[1.01]' : 'border-gray-100 shadow-sm opacity-90 hover:border-black'}`}>
                                <div className="p-10 flex flex-col xl:flex-row gap-12">
                                    <div className="xl:w-80 flex-shrink-0 space-y-8">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500 ${msg.status === 'Unread' ? 'bg-red-600 text-white shadow-xl rotate-12' : 'bg-gray-100 text-gray-400'}`}><User size={28} /></div>
                                            <div><h3 className="text-xl font-black uppercase italic leading-none">{msg.name}</h3><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2"><Clock size={12} /> {new Date(msg.$createdAt).toLocaleString()}</p></div>
                                        </div>
                                        <div className="p-5 bg-gray-50 rounded-2xl border border-dashed space-y-3">
                                            <p className="text-[10px] font-black text-gray-600 uppercase flex items-center gap-3 truncate"><Mail size={14} className="text-red-600" /> {msg.email}</p>
                                            {msg.phone && <p className="text-[10px] font-black text-gray-600 uppercase flex items-center gap-3"><Phone size={14} className="text-red-600" /> {msg.phone}</p>}
                                        </div>
                                        <div className="flex gap-3">
                                            <span className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase border shadow-sm ${msg.status === 'Unread' ? 'bg-red-50 text-red-600 border-red-100' : msg.status === 'Read' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{msg.status}</span>
                                            {msg.status === 'Unread' && <span className="px-5 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase animate-pulse shadow-lg">Signal Active</span>}
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-gray-50/50 p-10 rounded-[2.5rem] border border-gray-100 relative group-hover:bg-white transition-all duration-500">
                                        <div className="absolute top-8 right-10 opacity-5 group-hover:opacity-10 transition-all"><MessageSquare size={80} /></div>
                                        <h4 className="text-sm font-black uppercase italic tracking-widest mb-6 flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${msg.status === 'Unread' ? 'bg-red-600 animate-ping' : 'bg-gray-300'}`}></div> {msg.subject || 'Operational Inquiry'}</h4>
                                        <p className="text-gray-600 text-sm font-bold leading-relaxed italic">"{msg.message}"</p>
                                    </div>
                                    <div className="xl:w-64 flex-shrink-0 flex flex-col gap-4 justify-center">
                                        <button onClick={(e) => { e.stopPropagation(); handleReply(msg, 'whatsapp'); }} className="w-full bg-[#128C7E]/10 text-[#128C7E] hover:bg-[#128C7E] hover:text-white border border-[#128C7E]/20 rounded-2xl py-5 font-black text-[10px] uppercase italic transition-all flex items-center justify-center gap-3"><MessageSquare size={16} /> WhatsApp Relay</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleReply(msg, 'email'); }} className="w-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white border border-red-600/20 rounded-2xl py-5 font-black text-[10px] uppercase italic transition-all flex items-center justify-center gap-3"><Send size={16} /> Secure Email</button>
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(msg.id, 'Read'); }} className="bg-white p-3 border rounded-xl hover:bg-black hover:text-white transition-all"><Eye size={18} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }} className="bg-white text-red-600 border rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminMessages;
