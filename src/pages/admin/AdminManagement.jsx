import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'react-hot-toast';
import { Users, UserPlus, Trash2, Shield, Mail, Loader2 } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

const AdminManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState(null);

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                // Fetch current user's role first
                if (auth.currentUser) {
                    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                    if (userDoc.exists()) {
                        setCurrentUserRole(userDoc.data().role);
                    }
                }

                // Fetch all admins
                const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'super_admin', 'editor']));
                const querySnapshot = await getDocs(q);
                const adminList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAdmins(adminList);
            } catch (error) {
                console.error("Error fetching admins:", error);
                toast.error("Failed to load admins");
            } finally {
                setLoading(false);
            }
        };

        fetchAdmins();
    }, []);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setInviting(true);
        try {
            // In a real flow, you might want to check if the user exists first
            // Or use a trigger/function to handle invitations.
            // For this implementation, we search for a user with this email.
            const q = query(collection(db, 'users'), where('email', '==', inviteEmail.trim().toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast.error("User not found as a customer. They must sign up first.");
            } else {
                const userDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, 'users', userDoc.id), {
                    role: 'admin',
                    updatedAt: new Date()
                });
                toast.success(`${inviteEmail} is now an Admin!`);
                setAdmins(prev => [...prev, { id: userDoc.id, ...userDoc.data(), role: 'admin' }]);
                setInviteEmail('');
            }
        } catch (error) {
            console.error("Error adding admin:", error);
            toast.error("Failed to add admin");
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveAdmin = async (adminId, adminEmail) => {
        if (currentUserRole !== 'super_admin') {
            toast.error("Only Super Admins can remove other admins");
            return;
        }

        if (!window.confirm(`Are you sure you want to revoke admin access for ${adminEmail}?`)) return;

        try {
            await updateDoc(doc(db, 'users', adminId), {
                role: null, // Reset to standard customer
                updatedAt: new Date()
            });
            setAdmins(prev => prev.filter(a => a.id !== adminId));
            toast.success("Access revoked successfully");
        } catch (error) {
            console.error("Error removing admin:", error);
            toast.error("Failed to revoke access");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#28B463]" />
            </div>
        );
    }

    return (
        <div className="admin-management-container bg-gray-50 min-h-full">
            <AdminHeader title="إدارة المشرفين" />

            <div className="max-w-6xl mx-auto p-6 space-y-8">
                {/* Invite Section */}
                {currentUserRole === 'super_admin' && (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-[#28B463]/10 rounded-2xl">
                                <UserPlus className="h-6 w-6 text-[#28B463]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-black">Invite New Admin</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Add collaborators by their email</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    placeholder="Enter email address..."
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-[#28B463] rounded-2xl outline-none font-bold text-sm transition-all shadow-inner"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={inviting}
                                className="bg-black text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-[#28B463] transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                Revoke or Add Admin
                            </button>
                        </form>
                    </div>
                )}

                {/* Admins List */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-2xl">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-black text-black">Current Administrators</h3>
                        </div>
                        <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                            {admins.length} Total
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrator</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {admins.map((admin) => (
                                    <tr key={admin.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-gray-100 to-gray-50 flex items-center justify-center text-gray-400 font-black text-xs border border-gray-100 group-hover:scale-110 transition-transform">
                                                    {admin.fullName ? admin.fullName.charAt(0).toUpperCase() : <Mail className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900">{admin.fullName || 'Unnamed Admin'}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{admin.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${admin.role === 'super_admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-green-100 text-[#28B463]'
                                                }`}>
                                                {admin.role?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-bold text-gray-500">
                                                {admin.createdAt?.seconds ? new Date(admin.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {admin.role !== 'super_admin' && currentUserRole === 'super_admin' && (
                                                <button
                                                    onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                                                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Revoke Access"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {admins.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center text-gray-400 font-bold">
                                            No administrators found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminManagement;
