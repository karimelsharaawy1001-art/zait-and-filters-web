import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { Users, UserPlus, Trash2, Shield, Mail, Loader2, ShieldCheck, Zap, Activity, ShieldAlert, Key, UserCheck } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const AdminManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState('admin');

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const USERS_COLLECTION = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || 'users';

    const fetchAdmins = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [Query.equal('role', ['admin', 'super_admin', 'editor']), Query.limit(100)]);
            setAdmins(response.documents.map(doc => ({ id: doc.$id, ...doc })));
        } catch (error) { toast.error("Security registry failure"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAdmins(); }, [DATABASE_ID]);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [Query.equal('email', inviteEmail.trim().toLowerCase())]);
            if (response.total === 0) { toast.error("Node identity not found in network"); }
            else {
                const userDoc = response.documents[0];
                await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, userDoc.$id, { role: 'admin' });
                toast.success("Security privilege escalated"); fetchAdmins(); setInviteEmail('');
            }
        } catch (error) { toast.error("Escalation failure"); }
        finally { setInviting(false); }
    };

    const handleRemoveAdmin = async (adminId, adminEmail) => {
        if (!window.confirm("Revoke administrative credentials?")) return;
        try {
            await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, adminId, { role: null });
            setAdmins(prev => prev.filter(a => a.id !== adminId));
            toast.success("Credentials revoked");
        } catch (error) { toast.error("Revocation failure"); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Security & Governance" />
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Admin Matrix</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {admins.length} Authorized Network Nodes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><ShieldCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Nodes</p><h3 className="text-2xl font-black italic">{admins.length}</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100"><UserCheck size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Active</p><h3 className="text-2xl font-black italic">100%</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><Key size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Auth Level</p><h3 className="text-2xl font-black italic">Secured</h3></div></div>
                    <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6"><div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Activity size={24} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Audit</p><h3 className="text-2xl font-black italic">Clean</h3></div></div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    <div className="xl:col-span-1 space-y-8">
                        <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
                            <div className="flex items-center gap-4"><div className="p-4 bg-black text-white rounded-2xl shadow-xl"><UserPlus size={24} /></div><div><h3 className="text-xl font-black uppercase italic">Escalate Node</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Authorize New Operator</p></div></div>
                            <form onSubmit={handleAddAdmin} className="space-y-6">
                                <div className="space-y-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Digital Relay (Email)</label><div className="relative"><Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} /><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full pl-14 pr-8 py-5 bg-gray-50 border-2 rounded-2xl font-black text-sm italic outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" placeholder="operator@zaitegypt.com" required /></div></div>
                                <button type="submit" disabled={inviting} className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase italic text-xs shadow-2xl hover:scale-[1.03] transition-all flex items-center justify-center gap-3">{inviting ? <Loader2 className="animate-spin" /> : <Shield size={18} />} Escalate Credentials</button>
                            </form>
                        </section>
                        <section className="bg-red-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group"><h4 className="text-sm font-black uppercase italic tracking-widest mb-4">Security Protocol</h4><p className="text-xs font-bold leading-relaxed opacity-80">Credentials should only be escalated for verified personnel. All administrative operations are logged in the primary security registry.</p><ShieldAlert className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-all" size={120} /></section>
                    </div>

                    <div className="xl:col-span-2 bg-white rounded-[3.5rem] border shadow-sm overflow-hidden flex flex-col">
                        <div className="p-10 border-b bg-gray-50/50 flex items-center justify-between"><div className="flex items-center gap-4"><Activity className="text-red-600" /><h3 className="text-xl font-black uppercase italic">Authorized Node Registry</h3></div><span className="text-[10px] font-black uppercase bg-black text-white px-5 py-2 rounded-full shadow-lg">{admins.length} Active Operators</span></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400"><tr><th className="px-10 py-6">Operator Identity</th><th className="px-10 py-6 text-center">Auth Tier</th><th className="px-10 py-6 text-right">Ops</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? <tr><td colSpan="3" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></td></tr> : admins.map(admin => (
                                        <tr key={admin.id} className="hover:bg-gray-50/50 transition-all group">
                                            <td className="px-10 py-8"><div className="flex items-center gap-6"><div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 group-hover:bg-black group-hover:text-white transition-all uppercase shadow-inner">{admin.fullName?.[0] || 'O'}</div><div><h4 className="font-black text-base uppercase italic leading-none">{admin.fullName || 'Unnamed Node'}</h4><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{admin.email}</p></div></div></td>
                                            <td className="px-10 py-8 text-center"><span className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm italic ${admin.role === 'super_admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{admin.role?.replace('_', ' ')}</span></td>
                                            <td className="px-10 py-8 text-right">{admin.role !== 'super_admin' && <button onClick={() => handleRemoveAdmin(admin.id, admin.email)} className="p-3 bg-white text-red-600 border rounded-xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminManagement;
