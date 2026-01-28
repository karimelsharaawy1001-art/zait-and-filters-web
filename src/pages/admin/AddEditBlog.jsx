import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';
import ImageUpload from '../../components/admin/ImageUpload';

const AddEditBlog = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        titleEn: '',
        content: '',
        contentEn: '',
        excerpt: '',
        excerptEn: '',
        image: '',
        category: 'Maintenance Tips',
        author: 'Zait & Filters Team',
        isActive: true,
        slug: ''
    });

    useEffect(() => {
        if (isEdit) {
            fetchPost();
        }
    }, [id]);

    const fetchPost = async () => {
        try {
            const docRef = doc(db, 'blog_posts', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setFormData({ ...docSnap.data() });
            } else {
                toast.error("Post not found");
                navigate('/admin/blog');
            }
        } catch (error) {
            console.error("Error fetching post:", error);
            toast.error("Error loading post");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const newData = { ...prev, [name]: val };

            // Auto-generate slug from English title if not manually edited
            if (name === 'titleEn' && !isEdit) {
                newData.slug = value
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
            }

            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (isEdit) {
                await updateDoc(doc(db, 'blog_posts', id), dataToSave);
                toast.success('Post updated successfully!');
            } else {
                dataToSave.createdAt = serverTimestamp();
                await addDoc(collection(db, 'blog_posts'), dataToSave);
                toast.success('Post created successfully!');
            }
            navigate('/admin/blog');
        } catch (error) {
            console.error('Error saving post:', error);
            toast.error('Error saving post');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <AdminHeader title={isEdit ? "Edit Article" : "Create New Article"} />

            <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate('/admin/blog')}
                    className="flex items-center text-gray-500 hover:text-black font-bold transition-colors uppercase tracking-widest text-[10px] mb-8"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Blog Management
                </button>

                <div className="bg-white shadow-sm rounded-[2.5rem] p-10 border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-10">

                        {/* Status Toggle */}
                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Visibility Status</h3>
                                <p className="text-xs text-gray-500 font-bold mt-1">Control if this article is public or draft</p>
                            </div>
                            <label className="inline-flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="relative w-14 h-7 bg-gray-200 rounded-full peer transition-all duration-300 peer-checked:bg-orange-600 peer-focus:ring-4 peer-focus:ring-orange-500/20 shadow-sm">
                                    <div className="absolute top-0.5 start-0.5 bg-white rounded-full h-6 w-6 transition-all duration-300 peer-checked:translate-x-7"></div>
                                </div>
                                <span className={`ms-4 text-xs font-black uppercase tracking-widest ${formData.isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                                    {formData.isActive ? 'PUBLISHED' : 'DRAFT'}
                                </span>
                            </label>
                        </div>

                        {/* Title Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Article Title (Arabic)</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="مثال: نصائح للحفاظ على زيت المحرك"
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-lg font-Cairo text-right"
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Article Title (English)</label>
                                <input
                                    type="text"
                                    name="titleEn"
                                    required
                                    value={formData.titleEn}
                                    onChange={handleChange}
                                    placeholder="e.g. Tips to Maintain Engine Oil"
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-lg"
                                />
                            </div>
                        </div>

                        {/* SEO Slug */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">URL Slug (SEO Friendly)</label>
                            <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border border-transparent rounded-2xl">
                                <span className="text-gray-400 font-bold text-sm select-none">/blog/</span>
                                <input
                                    type="text"
                                    name="slug"
                                    required
                                    value={formData.slug}
                                    onChange={handleChange}
                                    className="flex-1 bg-transparent border-none p-0 text-sm font-black text-orange-600 focus:ring-0 outline-none"
                                />
                            </div>
                        </div>

                        {/* Excerpts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Short Excerpt (Arabic)</label>
                                <textarea
                                    name="excerpt"
                                    rows={3}
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-sm font-Cairo text-right"
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Short Excerpt (English)</label>
                                <textarea
                                    name="excerptEn"
                                    rows={3}
                                    value={formData.excerptEn}
                                    onChange={handleChange}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Content (Arabic)</label>
                                <textarea
                                    name="content"
                                    required
                                    rows={12}
                                    value={formData.content}
                                    onChange={handleChange}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-base font-Cairo text-right leading-relaxed"
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Content (English)</label>
                                <textarea
                                    name="contentEn"
                                    required
                                    rows={12}
                                    value={formData.contentEn}
                                    onChange={handleChange}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-base leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Image & Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Featured Image</label>
                                <ImageUpload
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, image: url }))}
                                    currentImage={formData.image}
                                    folderPath="blog"
                                />
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="Maintenance Tips">Maintenance Tips</option>
                                        <option value="Car Care">Car Care</option>
                                        <option value="Product Reviews">Product Reviews</option>
                                        <option value="Company News">Company News</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Author Name</label>
                                    <input
                                        type="text"
                                        name="author"
                                        value={formData.author}
                                        onChange={handleChange}
                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-5 pt-10 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/blog')}
                                className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="admin-primary-btn !w-fit !px-16 !rounded-2xl shadow-xl shadow-orange-600/20 active:scale-95 transition-transform"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        SAVING ARTICLE...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5" />
                                        {isEdit ? 'UPDATE ARTICLE' : 'PUBLISH ARTICLE'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AddEditBlog;
