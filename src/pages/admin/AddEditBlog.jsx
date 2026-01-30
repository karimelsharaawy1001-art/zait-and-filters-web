import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Hash, Type } from 'lucide-react';
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
        status: 'published',
        slug: '',
        tags: [],
        suggestedCategoryId: '',
        manualProductIds: []
    });

    const [tagInput, setTagInput] = useState('');
    const [categories, setCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');

    useEffect(() => {
        if (isEdit) {
            fetchPost();
        }
        fetchMetadata();
    }, [id]);

    const fetchMetadata = async () => {
        try {
            // Fetch Categories
            const catSnap = await getDocs(collection(db, 'categories'));
            setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch Products (limited to active ones for selection)
            const prodSnap = await getDocs(query(collection(db, 'products'), where('isActive', '==', true)));
            setAllProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    };

    const fetchPost = async () => {
        try {
            const docRef = doc(db, 'blog_posts', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({
                    ...data,
                    tags: data.tags || []
                });
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

    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;

        // SEO Constraint: Excerpt lengths
        if (name === 'excerpt' || name === 'excerptEn') {
            if (val.length > 160) {
                val = val.substring(0, 160);
            }
        }

        setFormData(prev => {
            const newData = { ...prev, [name]: val };

            // Sync status with isActive
            if (name === 'isActive') {
                newData.status = val ? 'published' : 'draft';
            }

            // AUTO-SLUG LOGIC: Only auto-generate if we are not editing an existing post or if slug is empty
            if (name === 'titleEn' && (!isEdit || !prev.slug)) {
                newData.slug = generateSlug(value);
            }

            return newData;
        });
    };

    const handleTagKeyDown = (e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const tag = tagInput.trim().replace(/,/g, '');
            if (tag && !formData.tags.includes(tag)) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...prev.tags, tag]
                }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tagToRemove)
        }));
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
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                    Article Title (English)
                                    <span className="text-orange-500 lowercase font-medium tracking-normal">(Auto-generates Slug)</span>
                                </label>
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
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                                    className="flex-1 bg-transparent border-none p-0 text-sm font-black text-orange-600 focus:ring-0 outline-none"
                                />
                            </div>
                        </div>

                        {/* Excerpts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Short Excerpt (Arabic) - Meta Description</label>
                                    <span className={`text-[10px] font-bold ${formData.excerpt.length >= 150 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {formData.excerpt.length}/160
                                    </span>
                                </div>
                                <textarea
                                    name="excerpt"
                                    rows={3}
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    placeholder="خلاصة المقال لمحركات البحث..."
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-sm font-Cairo text-right"
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Short Excerpt (English) - Meta Description</label>
                                    <span className={`text-[10px] font-bold ${formData.excerptEn.length >= 150 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {formData.excerptEn.length}/160
                                    </span>
                                </div>
                                <textarea
                                    name="excerptEn"
                                    rows={3}
                                    value={formData.excerptEn}
                                    onChange={handleChange}
                                    placeholder="Brief summary for SEO..."
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        {/* Tags Input */}
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Article Tags (SEO Keywords)</label>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border border-transparent rounded-2xl group focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                                    <Hash className="w-5 h-5 text-gray-300 group-focus-within:text-orange-500" />
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder="Type a tag and press Comma or Enter..."
                                        className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none"
                                    />
                                </div>

                                {formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {formData.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-orange-100 animate-in zoom-in-95 duration-200"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Main Content (Arabic)</label>
                                <textarea
                                    name="content"
                                    required
                                    rows={12}
                                    value={formData.content}
                                    onChange={handleChange}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[2rem] text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-base font-Cairo text-right leading-relaxed"
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Main Content (English)</label>
                                <textarea
                                    name="contentEn"
                                    required
                                    rows={12}
                                    value={formData.contentEn}
                                    onChange={handleChange}
                                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[2rem] text-gray-900 placeholder-gray-300 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-base leading-relaxed"
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

                                {/* Dynamic Product Suggestions */}
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 text-orange-600" />
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Linked Products (المنتجات المقترحة)
                                        </label>
                                    </div>

                                    {/* Category-based Suggestions */}
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-medium text-gray-400">Option 1: Suggest products from Category</label>
                                        <select
                                            name="suggestedCategoryId"
                                            value={formData.suggestedCategoryId}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="">-- No Category Selection --</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.nameEn || cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Manual Product Selection */}
                                    <div className="space-y-3 pt-4">
                                        <label className="block text-[10px] font-medium text-gray-400">Option 2: Manually pick products (Max 4)</label>

                                        {/* Search Input */}
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="Search products to add..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            />
                                            {productSearch && (
                                                <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-64 overflow-y-auto">
                                                    {allProducts
                                                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                                            (p.nameEn && p.nameEn.toLowerCase().includes(productSearch.toLowerCase())))
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!formData.manualProductIds.includes(p.id)) {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            manualProductIds: [...prev.manualProductIds, p.id].slice(-4)
                                                                        }));
                                                                    }
                                                                    setProductSearch('');
                                                                }}
                                                                className="w-full px-6 py-4 text-left hover:bg-orange-50 flex items-center justify-between group transition-colors"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-black text-gray-900">{p.nameEn || p.name}</p>
                                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{p.category}</p>
                                                                </div>
                                                                <span className="text-orange-500 opacity-0 group-hover:opacity-100 text-xs font-black">+ ADD</span>
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected Products List */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {formData.manualProductIds.map(pid => {
                                                const product = allProducts.find(p => p.id === pid);
                                                return (
                                                    <div key={pid} className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg">
                                                        {product ? (product.nameEn || product.name) : pid}
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({
                                                                ...prev,
                                                                manualProductIds: prev.manualProductIds.filter(id => id !== pid)
                                                            }))}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
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
                                className="admin-primary-btn !w-fit !px-16 !rounded-2xl shadow-xl shadow-orange-600/20 active:scale-95 transition-transform flex items-center gap-3"
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
