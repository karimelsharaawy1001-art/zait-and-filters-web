import React, { useState } from 'react';
import {
    Mail,
    MapPin,
    Send,
    Loader2,
    MessageCircle,
    Clock,
    User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { useSettings } from '../context/SettingsContext';

const ContactUs = () => {
    const { t, i18n } = useTranslation();
    const { settings } = useSettings();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.name || !formData.email || !formData.message) {
            toast.error(i18n.language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Save to Firestore
            await addDoc(collection(db, 'contact_messages'), {
                ...formData,
                status: 'Unread',
                createdAt: serverTimestamp()
            });

            // 2. Send via EmailJS
            // Replace with your actual service details
            const serviceID = 'default_service';
            const templateID = 'template_contact_form';
            const publicKey = 'YOUR_EMAILJS_PUBLIC_KEY'; // User should update this

            const templateParams = {
                from_name: formData.name,
                from_email: formData.email,
                subject: formData.subject,
                message: formData.message,
                to_email: 'info@zaitandfilters.com'
            };

            // Note: If you haven't set up EmailJS, this might fail unless publicKey is real.
            // I'll wrap it in a secondary try/catch so Firestore storage still succeeds.
            try {
                if (publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
                    await emailjs.send(serviceID, templateID, templateParams, publicKey);
                } else {
                    console.log("EmailJS keys not configured. skipping email send logic but saving to database.");
                }
            } catch (emailError) {
                console.error("EmailJS Error:", emailError);
                // We still proceed since it's saved in the database
            }

            toast.success(
                i18n.language === 'ar'
                    ? "وصلت رسالتك! هنرد عليك في أقرب وقت."
                    : "Message received! We'll get back to you as soon as possible."
            );

            // Reset Form
            setFormData({
                name: '',
                email: '',
                subject: '',
                message: ''
            });

        } catch (error) {
            console.error("Contact Form Error:", error);
            toast.error(i18n.language === 'ar' ? "حدث خطأ ما. يرجى المحاولة مرة أخرى." : "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        {i18n.language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                    </h1>
                    <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
                        {i18n.language === 'ar'
                            ? 'هل لديك سؤال حول منتج أو تحتاج إلى مساعدة في طلبك؟ نحن هنا للمساعدة.'
                            : 'Have a question about a product or need help with your order? We are here to help.'
                        }
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Contact Info Sidebar */}
                    <div className="lg:col-span-1 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 h-full">
                            <h2 className="text-2xl font-black text-gray-900 mb-8">
                                {i18n.language === 'ar' ? 'معلومات الاتصال' : 'Get in Touch'}
                            </h2>

                            <div className="space-y-8">
                                <div className="flex items-start gap-5 group">
                                    <div className="p-4 bg-orange-50 rounded-2xl text-orange-600 transition-transform group-hover:scale-110 shadow-sm shadow-orange-100">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Support</p>
                                        <p className="text-gray-900 font-black break-all">{settings.contactEmail || 'info@zaitandfilters.com'}</p>
                                    </div>
                                </div>


                                <div className="flex items-start gap-5 group">
                                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 transition-transform group-hover:scale-110 shadow-sm shadow-blue-100">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Our Location</p>
                                        <p className="text-gray-900 font-black italic">{settings.contactAddress || 'Cairo, Egypt'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-5 group">
                                    <div className="p-4 bg-green-50 rounded-2xl text-green-600 transition-transform group-hover:scale-110 shadow-sm shadow-green-100">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Business Hours</p>
                                        <p className="text-gray-900 font-black">Sat - Thu: 9 AM - 6 PM</p>
                                    </div>
                                </div>
                            </div>

                            {/* Social Links placeholder or additional text */}
                            <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <p className="text-sm font-bold text-gray-600 leading-relaxed text-center italic">
                                    {i18n.language === 'ar'
                                        ? '"رضاكم هو أولويتنا القصوى."'
                                        : '"Your satisfaction is our top priority."'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                placeholder={i18n.language === 'ar' ? 'ادخل اسمك' : 'Enter your name'}
                                            />
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                placeholder="email@example.com"
                                            />
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'الموضوع' : 'Subject'}</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            placeholder={i18n.language === 'ar' ? 'بخصوص ماذا؟' : 'What is this about?'}
                                        />
                                        <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{i18n.language === 'ar' ? 'رسالتك' : 'Message'}</label>
                                    <textarea
                                        name="message"
                                        required
                                        rows={6}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] p-6 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                                        placeholder={i18n.language === 'ar' ? 'اكتب رسالتك هنا بالتفصيل...' : 'Type your message here in detail...'}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="h-6 w-6" />
                                            <span>
                                                {i18n.language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
