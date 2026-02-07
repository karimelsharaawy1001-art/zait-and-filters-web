import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Save, Loader2, Globe, Phone, Mail, MapPin, Facebook, Instagram, MessageCircle, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const ManageSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        siteName: '', siteLogo: '', footerDescription: '',
        contactPhone: '', contactEmail: '', contactAddress: '',
        facebookUrl: '', instagramUrl: '', whatsappNumber: ''
    });

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const SETTINGS_COLLECTION = import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';
    const SETTINGS_DOC_ID = 'general';

    const fetchSettings = async () => {
        if (!DATABASE_ID) return;
        setLoading(true);
        try {
            const docSnap = await databases.getDocument(DATABASE_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
            setFormData(docSnap);
        } catch (error) {
            console.error("Settings node initialized if missing");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [DATABASE_ID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData };
            delete payload.$id; delete payload.$collectionId; delete payload.$databaseId; delete payload.$createdAt; delete payload.$updatedAt; delete payload.$permissions;

            try {
                await databases.updateDocument(DATABASE_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID, payload);
            } catch (err) {
                // If update fails, document might not exist, try create (init)
                await databases.createDocument(DATABASE_ID, SETTINGS_COLLECTION, SETTINGS_DOC_ID, payload);
            }
            toast.success("Node configuration synced");
        } catch (error) {
            toast.error("Sync failure");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center uppercase font-black text-[10px] text-gray-400 font-Cairo"><Loader2 className="animate-spin mx-auto mb-4" /> Routing Node Configuration...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-admin text-slate-900">
            <AdminHeader title="Platform Intelligence" />
            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto py-6 px-4 md:px-8 space-y-6">
                <section className="admin-card-compact p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <Globe className="text-slate-400" size={18} />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Identity Protocol</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="admin-text-subtle ml-1">Brand Name</label>
                                <input value={formData.siteName} onChange={e => setFormData({ ...formData, siteName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold italic outline-none focus:ring-1 focus:ring-slate-900 transition-all" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="admin-text-subtle ml-1">Mission Statement</label>
                                <textarea value={formData.footerDescription} onChange={e => setFormData({ ...formData, footerDescription: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium min-h-[120px] outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="admin-text-subtle ml-1 md:text-right block">Brand Mark (Logo)</label>
                            <ImageUpload currentImage={formData.siteLogo} onUploadComplete={url => setFormData({ ...formData, siteLogo: url })} folderPath="settings" />
                        </div>
                    </div>
                </section>

                <section className="admin-card-compact p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <Shield className="text-slate-400" size={18} />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Terminal Endpoints</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="admin-text-subtle ml-1">Digital Mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input type="email" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="admin-text-subtle ml-1">Voice Protocol</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="admin-text-subtle ml-1">Physical Node (Address)</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                                <textarea value={formData.contactAddress} onChange={e => setFormData({ ...formData, contactAddress: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="admin-card-compact p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <MessageCircle className="text-slate-400" size={18} />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Social Matrix</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="admin-text-subtle ml-1">Meta Entity</label>
                            <div className="relative">
                                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input value={formData.facebookUrl} onChange={e => setFormData({ ...formData, facebookUrl: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="admin-text-subtle ml-1">Visual Stream</label>
                            <div className="relative">
                                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input value={formData.instagramUrl} onChange={e => setFormData({ ...formData, instagramUrl: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="admin-text-subtle ml-1">Instant Relay</label>
                            <div className="relative">
                                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input value={formData.whatsappNumber} onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-slate-900 transition-all" />
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={saving} className="admin-btn-slim bg-slate-900 text-white hover:bg-slate-800 px-10 py-3 shadow-lg shadow-slate-900/10">
                        {saving ? 'Syncing...' : 'Sync Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManageSettings;
