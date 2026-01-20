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
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Contact Messages</h1>
                    <p className="text-gray-500 font-medium">Manage and respond to customer inquiries.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    {['All', 'Unread', 'Read', 'Replied'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterStatus === status ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {messages.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 flex flex-col items-center">
                    <div className="bg-gray-50 p-6 rounded-full mb-6">
                        <Mail className="h-10 w-10 text-gray-300" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 font-sans">No messages found</h2>
                    <p className="text-gray-500 mt-2">When customers contact you, their messages will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            onClick={() => msg.status === 'Unread' && handleUpdateStatus(msg.id, 'Read')}
                            className={`bg-white rounded-[2rem] border cursor-pointer transition-all duration-300 ${msg.status === 'Unread' ? 'border-orange-500 shadow-xl shadow-orange-50/50' : 'border-gray-50 shadow-sm opacity-90'}`}
                        >
                            <div className="p-8">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Left: Sender Info */}
                                    <div className="lg:w-72 flex-shrink-0 space-y-4 pt-1">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${msg.status === 'Unread' ? 'bg-orange-50 text-orange-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900 leading-tight">{msg.name}</h3>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {msg.createdAt?.toDate().toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                <Mail className="w-4 h-4 text-orange-400" />
                                                <span className="truncate">{msg.email}</span>
                                            </div>
                                            {msg.phone && (
                                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                    <Phone className="w-4 h-4 text-orange-400" />
                                                    <span>{msg.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 flex flex-wrap gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${msg.status === 'Unread' ? 'bg-orange-600 text-white' :
                                                    msg.status === 'Read' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-green-100 text-green-600'
                                                }`}>
                                                {msg.status}
                                            </span>
                                            {msg.status === 'Unread' && (
                                                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[8px] font-black animate-bounce">NEW</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Center: Message Body */}
                                    <div className="flex-1 space-y-4">
                                        <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                                            <h4 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                {msg.subject || 'Inquiry Message'}
                                            </h4>
                                            <p className="text-gray-700 font-medium leading-relaxed italic whitespace-pre-wrap">
                                                "{msg.message}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="lg:w-56 flex-shrink-0 flex flex-col gap-3 justify-center">
                                        {msg.phone && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleWhatsAppReply(msg); }}
                                                className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs shadow-lg shadow-green-100"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Reply WhatsApp
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEmailReply(msg); }}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs shadow-lg shadow-blue-100"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Reply via Email
                                        </button>
                                        <div className="flex gap-2">
                                            {msg.status === 'Unread' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(msg.id, 'Read'); }}
                                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-all text-[10px]"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-all text-[10px]"
                                            >
                                                Delete
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
