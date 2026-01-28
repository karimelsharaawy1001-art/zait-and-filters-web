import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import AdminHeader from '../../components/AdminHeader';
import { Edit3, Trash2, Plus, Search, Loader2, Eye, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageBlog = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const postsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(postsList);
        } catch (error) {
            console.error("Error fetching posts:", error);
            toast.error("Error loading blog posts");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (postId, currentStatus) => {
        try {
            await updateDoc(doc(db, 'blog_posts', postId), {
                isActive: !currentStatus,
                updatedAt: new Date()
            });
            setPosts(posts.map(p =>
                p.id === postId ? { ...p, isActive: !currentStatus } : p
            ));
            toast.success('Status updated');
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (postId, title) => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            try {
                await deleteDoc(doc(db, 'blog_posts', postId));
                setPosts(posts.filter(p => p.id !== postId));
                toast.success('Post deleted successfully!');
            } catch (error) {
                console.error("Error deleting post:", error);
                toast.error('Error deleting post');
            }
        }
    };

    const filteredPosts = posts.filter(post =>
        (post.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.titleEn || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AdminHeader title="Blog Management" />
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <AdminHeader title="Blog Management" />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-black uppercase tracking-tight italic font-Cairo">Articles & CMS</h2>
                        <p className="text-sm text-gray-500 mt-1 font-bold">Manage maintenance tips and organic content</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/blog/new')}
                        className="admin-primary-btn !w-fit !px-8"
                    >
                        <Plus className="h-5 w-5" />
                        Create New Article
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Image</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Post Information</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredPosts.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-6 whitespace-nowrap">
                                        <div className="h-16 w-24 rounded-xl overflow-hidden bg-gray-100 relative">
                                            <img
                                                src={post.image || '/placeholder-blog.png'}
                                                alt={post.title}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-gray-900 line-clamp-1 font-Cairo">{post.title}</span>
                                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wide">{post.titleEn}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <Calendar className="h-3 w-3" />
                                                {post.createdAt?.toDate().toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <User className="h-3 w-3" />
                                                {post.author || 'Admin'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => handleToggleStatus(post.id, post.isActive)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${post.isActive ? 'bg-orange-600' : 'bg-gray-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${post.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => navigate(`/blog/${post.id}`)}
                                                className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                                                title="View Post"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Edit Post"
                                            >
                                                <Edit3 className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id, post.title)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete Post"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredPosts.length === 0 && (
                        <div className="py-20 text-center">
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No articles found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageBlog;
