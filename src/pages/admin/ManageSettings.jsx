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
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Platform Intelligence" />
            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto py-8 px-4 space-y-10">
                <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-8">
                    <div className="flex items-center gap-4 border-b pb-6"><Globe className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Identity Protocol</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Brand Name</label><input value={formData.siteName} onChange={e => setFormData({ ...formData, siteName: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xl italic" required /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mission Statement</label><textarea value={formData.footerDescription} onChange={e => setFormData({ ...formData, footerDescription: e.target.value })} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold min-h-[140px]" /></div>
                        </div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1 text-right block">Brand Mark (Logo)</label><ImageUpload currentImage={formData.siteLogo} onUploadComplete={url => setFormData({ ...formData, siteLogo: url })} folderPath="settings" /></div>
                    </div>
                </section>

                <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-8">
                    <div className="flex items-center gap-4 border-b pb-6"><Shield className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Terminal Endpoints</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Digital Mail</label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="email" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl font-black" /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Voice Protocol</label><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl font-black" /></div></div>
                        <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Physical Node (Address)</label><div className="relative"><MapPin className="absolute left-4 top-5 text-gray-400" size={16} /><textarea value={formData.contactAddress} onChange={e => setFormData({ ...formData, contactAddress: e.target.value })} className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl font-bold" /></div></div>
                    </div>
                </section>

                <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm space-y-8">
                    <div className="flex items-center gap-4 border-b pb-6"><MessageCircle className="text-red-600" /><h2 className="text-xl font-black uppercase italic">Social Matrix</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Meta Entity</label><div className="relative"><Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={formData.facebookUrl} onChange={e => setFormData({ ...formData, facebookUrl: e.target.value })} className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl font-bold text-xs" /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Visual Stream</label><div className="relative"><Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={formData.instagramUrl} onChange={e => setFormData({ ...formData, instagramUrl: e.target.value })} className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl font-bold text-xs" /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Instant Relay</label><div className="relative"><MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={formData.whatsappNumber} onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })} className="w-full pl-12 p-4 bg-gray-50 border rounded-2xl font-black" /></div></div>
                    </div>
                </section>

                <div className="flex justify-end pt-10"><button type="submit" disabled={saving} className="bg-red-600 text-white px-16 py-6 rounded-3xl font-black uppercase italic shadow-2xl hover:scale-105 transition-all">{saving ? 'Syncing...' : 'Sync Configuration'}</button></div>
            </form>
        </div>
    );
};

export default ManageSettings;
