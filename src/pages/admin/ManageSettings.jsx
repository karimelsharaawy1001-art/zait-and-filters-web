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
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-admin-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Synchronizing node configuration...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20 p-4 md:p-8 text-black">
            <AdminHeader title="Global Settings" />

            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto mt-10 space-y-10">
                {/* Site Identity */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Globe className="h-32 w-32 text-black" />
                    </div>

                    <div className="flex items-center gap-4 mb-10 relative">
                        <div className="p-3 bg-red-50 text-[#e31e24] rounded-2xl">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black uppercase tracking-widest poppins">Site Identity</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Configure brand assets and core metadata</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Brand Name</label>
                            <input
                                type="text"
                                name="siteName"
                                value={formData.siteName}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black placeholder-gray-300"
                                placeholder="e.g. ZAIT & FILTERS"
                                required
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Brand Logo</label>
                                <span className="text-[9px] text-[#e31e24] font-black uppercase tracking-widest opacity-60">High-Res PNG Preferred</span>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-[2rem] p-4">
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, siteLogo: url }))}
                                    currentImage={formData.siteLogo}
                                    folderPath="settings"
                                />
                            </div>
                            <input type="hidden" name="siteLogo" value={formData.siteLogo} />
                        </div>
                    </div>
                </div>

                {/* Footer & Contact */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MapPin className="h-32 w-32 text-black" />
                    </div>

                    <div className="flex items-center gap-4 mb-10 relative">
                        <div className="p-3 bg-red-50 text-[#e31e24] rounded-2xl">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black uppercase tracking-widest poppins">Terminal Comms</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Manage public contact endpoints and footer content</p>
                        </div>
                    </div>

                    <div className="space-y-10 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Brand Manifesto (Footer About)</label>
                            <textarea
                                name="footerDescription"
                                value={formData.footerDescription}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black placeholder-gray-300 min-h-[120px]"
                                placeholder="A concise mission statement for the footer..."
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Voice Protocol (Phone)</label>
                                <div className="relative">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                    <input
                                        type="text"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleChange}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-14 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black placeholder-gray-300"
                                        placeholder="+20 123 456 7890"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Digital Relay (Email)</label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                    <input
                                        type="email"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-14 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black placeholder-gray-300"
                                        placeholder="ops@zaitandfilters.com"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Geographic Coordinates (Address)</label>
                                <div className="relative">
                                    <MapPin className="absolute left-5 top-5 h-4 w-4 text-gray-300" />
                                    <textarea
                                        name="contactAddress"
                                        value={formData.contactAddress}
                                        onChange={handleChange}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5 pl-14 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black min-h-[80px] placeholder-gray-300"
                                        placeholder="HQ Location, District, Cairo, Egypt"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Facebook className="h-32 w-32 text-black" />
                    </div>

                    <div className="flex items-center gap-4 mb-10 relative">
                        <div className="p-3 bg-red-50 text-[#e31e24] rounded-2xl">
                            <Facebook className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black uppercase tracking-widest poppins">Social Matrix</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Configure external social network linkages</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Meta Entity (Facebook URL)</label>
                            <div className="relative">
                                <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                <input
                                    type="text"
                                    name="facebookUrl"
                                    value={formData.facebookUrl}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-14 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black placeholder-gray-300"
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Visual Stream (Instagram URL)</label>
                            <div className="relative">
                                <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                <input
                                    type="text"
                                    name="instagramUrl"
                                    value={formData.instagramUrl}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-14 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black placeholder-gray-300"
                                    placeholder="https://instagram.com/..."
                                />
                            </div>
                        </div>

                        <div className="relative space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Instant Relay (WhatsApp)</label>
                            <div className="relative">
                                <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                <input
                                    type="text"
                                    name="whatsappNumber"
                                    value={formData.whatsappNumber}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-14 focus:ring-2 focus:ring-[#e31e24] outline-none transition-all font-bold text-black placeholder-gray-300"
                                    placeholder="e.g. 201234567890"
                                />
                            </div>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest px-1 italic">Protocol: Country Code + Digit String (No symbols)</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-10">
                    <button
                        type="submit"
                        disabled={saving}
                        className="admin-primary-btn !w-fit !px-12 !py-5"
                    >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Synchronize Node Settings
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManageSettings;
