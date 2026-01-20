import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Loader2, Globe, Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const ManageSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        siteName: '',
        siteLogo: '',
        footerDescription: '',
        contactPhone: '',
        contactEmail: '',
        contactAddress: '',
        facebookUrl: '',
        instagramUrl: '',
        whatsappNumber: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'settings', 'general');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setFormData(docSnap.data());
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'general'), formData);
            toast.success("Settings updated successfully!");
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Error updating settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <AdminHeader title="General Settings" />

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Site Identity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6 text-orange-600">
                        <Globe className="h-5 w-5" />
                        <h2 className="text-lg font-bold text-gray-900">Site Identity</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                            <input
                                type="text"
                                name="siteName"
                                value={formData.siteName}
                                onChange={handleChange}
                                className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="e.g. ZAIT & FILTERS"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-sm font-medium text-gray-700">Logo Image</label>
                                <span className="text-[10px] text-orange-600 font-semibold italic">Recommended Height: 40-50px (PNG)</span>
                            </div>
                            <ImageUpload
                                onUploadComplete={(url) => setFormData(prev => ({ ...prev, siteLogo: url }))}
                                currentImage={formData.siteLogo}
                                folderPath="settings"
                            />
                            <input type="hidden" name="siteLogo" value={formData.siteLogo} />
                        </div>
                    </div>
                </div>

                {/* Footer & Contact */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6 text-orange-600">
                        <MapPin className="h-5 w-5" />
                        <h2 className="text-lg font-bold text-gray-900">Footer & Contact Information</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Description (About Us)</label>
                            <textarea
                                name="footerDescription"
                                value={formData.footerDescription}
                                onChange={handleChange}
                                className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                rows="3"
                                placeholder="A short description for the footer..."
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleChange}
                                        className="w-full border rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        placeholder="+20 123 456 7890"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="email"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        className="w-full border rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        placeholder="info@zaitandfilters.com"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <textarea
                                        name="contactAddress"
                                        value={formData.contactAddress}
                                        onChange={handleChange}
                                        className="w-full border rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        rows="2"
                                        placeholder="123 Street Name, City, Egypt"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6 text-orange-600">
                        <Facebook className="h-5 w-5" />
                        <h2 className="text-lg font-bold text-gray-900">Social Media</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                            <div className="relative">
                                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="facebookUrl"
                                    value={formData.facebookUrl}
                                    onChange={handleChange}
                                    className="w-full border rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                            <div className="relative">
                                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="instagramUrl"
                                    value={formData.instagramUrl}
                                    onChange={handleChange}
                                    className="w-full border rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="https://instagram.com/..."
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                            <div className="relative">
                                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="whatsappNumber"
                                    value={formData.whatsappNumber}
                                    onChange={handleChange}
                                    className="w-full border rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="e.g. 201234567890"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Format: Country code + number (no + or spaces). e.g. 201234567890</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:bg-orange-300"
                    >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Save All Settings
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManageSettings;
