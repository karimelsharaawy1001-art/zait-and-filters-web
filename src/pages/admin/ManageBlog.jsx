import React, { useState, useEffect } from 'react';
import { databases } from '../../appwrite';
import { Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Edit3, Trash2, Plus, Search, Loader2, Eye, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageBlog = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const BLOG_COLLECTION = import.meta.env.VITE_APPWRITE_BLOG_COLLECTION_ID || 'blog_posts';

    const fetchPosts = async () => {
        if (!DATABASE_ID || !BLOG_COLLECTION) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, BLOG_COLLECTION, [
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            setPosts(response.documents.map(d => ({ id: d.$id, ...d })));
        } catch (error) {
            console.error(error);
            toast.error("Failed to load blog matrix");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [DATABASE_ID, BLOG_COLLECTION]);

    const handleToggleStatus = async (postId, currentStatus) => {
        try {
            await databases.updateDocument(DATABASE_ID, BLOG_COLLECTION, postId, {
                isActive: !currentStatus,
                status: !currentStatus ? 'published' : 'draft',
                updatedAt: new Date().toISOString()
            });
            setPosts(posts.map(p => p.id === postId ? { ...p, isActive: !currentStatus } : p));
            toast.success('Sync complete');
        } catch (error) {
            toast.error("Protocol failure");
        }
    };

    const handleDelete = async (postId, title) => {
        if (window.confirm(`Purge "${title}"?`)) {
            try {
                await databases.deleteDocument(DATABASE_ID, BLOG_COLLECTION, postId);
                setPosts(posts.filter(p => p.id !== postId));
                toast.success('Resource deleted');
            } catch (error) {
                toast.error('Deletion failed');
            }
        }
    };

    const filteredPosts = posts.filter(post =>
        (post.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.titleEn || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-Cairo text-gray-900">
            <AdminHeader title="Editorial Center" />
            <div className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Articles & CMS</h2>
                        <p className="text-sm text-gray-500 font-bold">Content distribution management</p>
                    </div>
                    <button onClick={() => navigate('/admin/blog/new')} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg">
                        <Plus size={18} /> New Article
                    </button>
                </div>

                <div className="bg-white rounded-3xl p-6 border mb-8 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search content matrix..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-black" />
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={40} /></div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left">
                                <tr>
                                    <th className="px-6 py-5">Visual</th>
                                    <th className="px-6 py-5">Metadata</th>
                                    <th className="px-6 py-5">Timeline</th>
                                    <th className="px-6 py-5 text-center">Status</th>
                                    <th className="px-6 py-5 text-right">Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredPosts.map(post => (
                                    <tr key={post.id} className="hover:bg-gray-50 transition-all group">
                                        <td className="px-6 py-6"><img src={post.image || '/placeholder-blog.png'} className="h-16 w-24 rounded-xl object-cover border" /></td>
                                        <td className="px-6 py-6"><p className="font-black text-lg italic">{post.title}</p><p className="text-[10px] font-bold text-gray-400 uppercase">{post.titleEn}</p></td>
                                        <td className="px-6 py-6"><p className="text-xs font-bold flex items-center gap-2 text-gray-500"><Calendar size={12} /> {new Date(post.$createdAt).toLocaleDateString()}</p><p className="text-[9px] font-black flex items-center gap-2 text-gray-400 uppercase mt-1"><User size={12} /> {post.author || 'ADMIN'}</p></td>
                                        <td className="px-6 py-6 text-center">
                                            <button onClick={() => handleToggleStatus(post.id, post.isActive)} className={`w-12 h-6 rounded-full relative transition-all ${post.isActive ? 'bg-green-600' : 'bg-gray-200'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${post.isActive ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-6 text-right flex justify-end gap-3 pt-10">
                                            <button onClick={() => navigate(`/blog/${post.id}`)} className="p-2 text-gray-400 hover:text-black"><Eye size={18} /></button>
                                            <button onClick={() => navigate(`/admin/blog/edit/${post.id}`)} className="p-2 text-gray-400 hover:text-blue-600"><Edit3 size={18} /></button>
                                            <button onClick={() => handleDelete(post.id, post.title)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageBlog;
