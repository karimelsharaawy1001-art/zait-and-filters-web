import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    where
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    Mail,
    Phone,
    Trash2,
    Clock,
    User,
    CheckCircle2,
    Loader2,
    MessageSquare,
    Eye,
    EyeOff,
    Filter,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [actionId, setActionId] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        let q = query(
            collection(db, 'contact_messages'),
            orderBy('createdAt', 'desc')
        );

        if (filterStatus !== 'All') {
            q = query(
                collection(db, 'contact_messages'),
                where('status', '==', filterStatus),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Real-time Notification for new messages
            if (!isInitialLoad && filterStatus === 'All') {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const newMsg = change.doc.data();
                        toast.success(`New Message: ${newMsg.name}`, {
                            icon: '📧',
                            duration: 5000,
                            style: {
                                borderRadius: '15px',
                                background: '#111827',
                                color: '#fff',
                            }
                        });
                    }
                });
            }

            setMessages(msgList);
            setLoading(false);
            setIsInitialLoad(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filterStatus, isInitialLoad]);

    const handleUpdateStatus = async (id, newStatus) => {
        setActionId(id);
        try {
            await updateDoc(doc(db, 'contact_messages', id), {
                status: newStatus
            });
            toast.success(`Message marked as ${newStatus}`);
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status.");
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        setActionId(id);
        try {
            await deleteDoc(doc(db, 'contact_messages', id));
            toast.success("Message deleted.");
        } catch (error) {
            console.error("Error deleting message:", error);
            toast.error("Failed to delete message.");
        } finally {
            setActionId(null);
        }
    };

    const handleWhatsAppReply = (msg) => {
        const phone = msg.phone.replace(/\D/g, '');
        const text = encodeURIComponent(`سلام عليكم يا ${msg.name}، بخصوص استفسارك في موقع زيت اند فلترز عن (${msg.subject || 'استفسار عام'})...`);
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        handleUpdateStatus(msg.id, 'Replied');
    };

    const handleEmailReply = (msg) => {
        const subject = encodeURIComponent(`Re: ${msg.subject || 'Inquiry from Zait & Filters'}`);
        window.location.href = `mailto:${msg.email}?subject=${subject}`;
        handleUpdateStatus(msg.id, 'Replied');
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing communication node...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tight uppercase poppins">Terminal Comms</h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Intercept and manage incoming customer transmissions</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    {['All', 'Unread', 'Read', 'Replied'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-[#e31e24] text-white shadow-lg shadow-[#e31e24]/40' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {messages.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 flex flex-col items-center shadow-sm">
                    <div className="bg-gray-50 p-10 rounded-full mb-8 border border-gray-100">
                        <Mail className="h-12 w-12 text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight poppins">Quiet Frequency</h2>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-4">All customer signals have been cleared</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            onClick={() => msg.status === 'Unread' && handleUpdateStatus(msg.id, 'Read')}
                            className={`bg-white rounded-[2.5rem] border transition-all duration-500 group relative overflow-hidden ${msg.status === 'Unread' ? 'border-[#e31e24]/30 shadow-2xl shadow-[#e31e24]/5' : 'border-gray-100 shadow-sm opacity-90'}`}
                        >
                            {msg.status === 'Unread' && (
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#e31e24]"></div>
                            )}
                            <div className="p-8 md:p-10">
                                <div className="flex flex-col xl:flex-row gap-10">
                                    {/* Left: Sender Info */}
                                    <div className="xl:w-80 flex-shrink-0 space-y-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${msg.status === 'Unread' ? 'bg-red-50 text-[#e31e24] ring-2 ring-red-50' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                <User className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-black leading-tight uppercase tracking-tight poppins">{msg.name}</h3>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mt-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {msg.createdAt?.toDate().toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-gray-600 break-all">
                                                <Mail className="w-4 h-4 text-[#e31e24]" />
                                                <span className="truncate">{msg.email}</span>
                                            </div>
                                            {msg.phone && (
                                                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-gray-600">
                                                    <Phone className="w-4 h-4 text-[#e31e24]" />
                                                    <span>{msg.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 flex flex-wrap gap-3">
                                            <span className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${msg.status === 'Unread' ? 'bg-red-50 text-[#e31e24] border-red-100' :
                                                msg.status === 'Read' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-green-50 text-green-600 border-green-100'
                                                }`}>
                                                {msg.status}
                                            </span>
                                            {msg.status === 'Unread' && (
                                                <span className="px-4 py-2 bg-[#e31e24] text-white rounded-xl text-[9px] font-black animate-pulse uppercase tracking-widest">Incoming Signal</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Center: Message Body */}
                                    <div className="flex-1">
                                        <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 h-full relative group-hover:bg-white group-hover:shadow-sm transition-all duration-500">
                                            <div className="absolute top-6 right-8">
                                                <MessageSquare className="w-12 h-12 text-black/5" />
                                            </div>
                                            <h4 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-[#e31e24] animate-ping"></div>
                                                {msg.subject || 'Standard Inquiry'}
                                            </h4>
                                            <p className="text-gray-600 text-sm font-bold leading-relaxed whitespace-pre-wrap">
                                                {msg.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="xl:w-64 flex-shrink-0 flex flex-col gap-4 justify-center">
                                        {msg.phone && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleWhatsAppReply(msg); }}
                                                className="w-full bg-[#128C7E]/10 hover:bg-[#128C7E] text-[#128C7E] hover:text-white border border-[#128C7E]/30 rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all duration-300"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Transmit WhatsApp
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEmailReply(msg); }}
                                            className="w-full bg-admin-accent/10 hover:bg-admin-accent text-admin-accent hover:text-white border border-admin-accent/30 rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all duration-300"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Dispatch Email
                                        </button>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {msg.status === 'Unread' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(msg.id, 'Read'); }}
                                                    className="bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black border border-gray-100 rounded-xl py-3 font-black text-[9px] uppercase tracking-widest transition-all"
                                                >
                                                    Acknowledge
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                                className="bg-red-50 hover:bg-[#e31e24] text-[#e31e24] hover:text-white border border-red-100 rounded-xl py-3 font-black text-[9px] uppercase tracking-widest transition-all"
                                            >
                                                Purge
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminMessages;
