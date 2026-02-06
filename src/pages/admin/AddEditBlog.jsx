import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query, ID } from 'appwrite';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Hash } from 'lucide-react';
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

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const BLOG_COLLECTION = import.meta.env.VITE_APPWRITE_BLOG_COLLECTION_ID || 'blog_posts';
    const CATEGORIES_COLLECTION = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories';
    const PRODUCTS_COLLECTION = import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';

    const fetchMetadata = async () => {
        if (!DATABASE_ID) return;
        try {
            const [catRes, prodRes] = await Promise.all([
                databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [Query.equal('isActive', true), Query.limit(100)])
            ]);
            setCategories(catRes.documents.map(d => ({ id: d.$id, ...d })));
            setAllProducts(prodRes.documents.map(d => ({ id: d.$id, ...d })));
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPost = async () => {
        try {
            const data = await databases.getDocument(DATABASE_ID, BLOG_COLLECTION, id);
            setFormData({
                title: data.title || '',
                titleEn: data.titleEn || '',
                content: data.content || '',
                contentEn: data.contentEn || '',
                excerpt: data.excerpt || '',
                excerptEn: data.excerptEn || '',
                image: data.image || '',
                category: data.category || 'Maintenance Tips',
                author: data.author || 'Zait & Filters Team',
                isActive: data.isActive !== false,
                status: data.status || 'published',
                slug: data.slug || '',
                tags: data.tags || [],
                suggestedCategoryId: data.suggestedCategoryId || '',
                manualProductIds: data.manualProductIds || []
            });
        } catch (error) {
            toast.error("Resource not found");
            navigate('/admin/blog');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetadata();
        if (isEdit) fetchPost();
    }, [id, DATABASE_ID]);

    const generateSlug = (text) => {
        return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if ((name === 'excerpt' || name === 'excerptEn') && val.length > 160) val = val.substring(0, 160);

        setFormData(prev => {
            const newData = { ...prev, [name]: val };
            if (name === 'isActive') newData.status = val ? 'published' : 'draft';
            if (name === 'titleEn' && (!isEdit || !prev.slug)) newData.slug = generateSlug(value);
            return newData;
        });
    };

    const handleTagKeyDown = (e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const tag = tagInput.trim().replace(/,/g, '');
            if (tag && !formData.tags.includes(tag)) setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
            setTagInput('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData, updatedAt: new Date().toISOString() };
            if (isEdit) {
                await databases.updateDocument(DATABASE_ID, BLOG_COLLECTION, id, payload);
                toast.success('Sync complete');
            } else {
                payload.createdAt = new Date().toISOString();
                await databases.createDocument(DATABASE_ID, BLOG_COLLECTION, ID.unique(), payload);
                toast.success('Resource published');
            }
            navigate('/admin/blog');
        } catch (error) {
            toast.error('Protocol failure');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center uppercase font-black text-[10px] text-gray-400"><Loader2 className="animate-spin mx-auto mb-4" /> Initializing Node...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title={isEdit ? "Edit Article" : "New Transmission"} />
            <main className="max-w-5xl mx-auto py-8 px-4">
                <button onClick={() => navigate('/admin/blog')} className="flex items-center text-gray-400 font-black uppercase text-[10px] mb-8 gap-2"><ArrowLeft size={14} /> Back to Center</button>
                <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-10 border shadow-sm space-y-8">
                    <div className="flex justify-between items-center p-6 bg-gray-50 border rounded-3xl">
                        <div><h3 className="font-black uppercase italic">Visibility</h3><p className="text-xs text-gray-400 font-bold">Public/Private toggle</p></div>
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-12 h-6 rounded-full cursor-pointer" />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div><label className="text-[10px] font-black uppercase text-gray-400">Title (AR)</label><input name="title" value={formData.title} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-right" required dir="rtl" /></div>
                        <div><label className="text-[10px] font-black uppercase text-gray-400">Title (EN)</label><input name="titleEn" value={formData.titleEn} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" required /></div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-gray-400">Content Matrix</label>
                        <textarea name="content" value={formData.content} onChange={handleChange} className="w-full p-6 bg-gray-50 border rounded-3xl font-bold text-right" rows={10} required dir="rtl" />
                        <textarea name="contentEn" value={formData.contentEn} onChange={handleChange} className="w-full p-6 bg-gray-50 border rounded-3xl font-bold" rows={10} required />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <ImageUpload currentImage={formData.image} onUploadComplete={url => setFormData({ ...formData, image: url })} folderPath="blog" />
                        <div className="space-y-4">
                            <select name="category" value={formData.category} onChange={handleChange} className="w-full p-4 bg-gray-100 border rounded-2xl font-black">
                                <option>Maintenance Tips</option><option>Car Care</option><option>News</option>
                            </select>
                            <input name="author" value={formData.author} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl font-black" placeholder="Author Signature" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-10 border-t">
                        <button type="submit" disabled={saving} className="bg-black text-white px-12 py-5 rounded-2xl font-black uppercase italic shadow-xl">{saving ? 'Syncing...' : 'Commit Article'}</button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddEditBlog;
