import React, { useState } from 'react';
import axios from 'axios';
import { Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const ImageUpload = ({
    value,
    onChange,
    currentImage,
    onUploadComplete,
    folderPath = 'general'
}) => {
    // Standardize props
    const actualValue = value || currentImage;
    const actualOnChange = onChange || onUploadComplete;

    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(actualValue || '');
    const [urlInput, setUrlInput] = useState(actualValue && actualValue.startsWith('http') ? actualValue : '');

    const isValidImageUrl = (url) => {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) !== null || url.startsWith('https://images.unsplash.com') || url.includes('cloudinary.com');
    };

    // Sync preview if actualValue changes from outside
    React.useEffect(() => {
        setPreview(actualValue || '');
        if (actualValue && actualValue.startsWith('http')) {
            setUrlInput(actualValue);
        } else if (!actualValue) {
            setUrlInput('');
        }
    }, [actualValue]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setUrlInput(''); // Clear URL input when a file is chosen

        try {
            // Fetch Cloudinary credentials from Firestore
            const docRef = doc(db, 'settings', 'integrations');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists() || !docSnap.data().cloudinary) {
                throw new Error("Cloudinary is not configured. Please go to Admin > Integrations > Cloudinary to set it up.");
            }

            const { cloudName, uploadPreset } = docSnap.data().cloudinary;

            if (!cloudName || !uploadPreset) {
                throw new Error("Missing Cloudinary Cloud Name or Upload Preset. Please check your settings.");
            }

            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', folderPath);

            const response = await axios.post(uploadUrl, formData, {
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percentCompleted);
                    }
                },
            });

            const secureUrl = response.data.secure_url;
            setPreview(secureUrl);
            if (actualOnChange) actualOnChange(secureUrl);
        } catch (error) {
            console.error('Cloudinary Upload Error:', error);
            const errorMsg = error.message || "Upload failed. Please check your Cloudinary configuration.";
            toast.error(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleUrlChange = (e) => {
        const url = e.target.value;
        setUrlInput(url);

        if (!url) {
            setPreview('');
            if (actualOnChange) actualOnChange('');
            return;
        }

        if (isValidImageUrl(url)) {
            setPreview(url);
            if (actualOnChange) actualOnChange(url);
        }
    };

    const handleRemove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPreview('');
        setUrlInput('');
        if (actualOnChange) actualOnChange('');
    };

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* URL Input Area */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Image URL (رابط الصورة)</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            value={urlInput}
                            onChange={handleUrlChange}
                            className="w-full bg-white border border-gray-200 rounded-xl p-4 text-black placeholder-gray-400 focus:ring-2 focus:ring-admin-accent outline-none transition-all font-bold text-sm shadow-sm"
                        />
                        {urlInput && isValidImageUrl(urlInput) && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-5 w-5 text-admin-green" />
                            </div>
                        )}
                    </div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest px-1">Or paste a valid direct image link</p>
                </div>

                {/* Upload Area */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Local Upload (رفع ملف)</label>
                    <div className="relative group border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center transition-all hover:border-admin-accent bg-gray-50">
                        <label className="w-full h-full min-h-[50px] flex flex-col items-center justify-center cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Upload className={`h-5 w-5 ${uploading ? 'text-gray-400 animate-bounce' : 'text-gray-400'}`} />
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    {uploading ? 'Uploading...' : 'Choose File'}
                                </span>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>

                        {uploading && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10 p-4">
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden shadow-inner mb-2">
                                    <div
                                        className="bg-admin-accent h-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-black text-admin-accent uppercase tracking-widest">{progress}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Preview Box */}
            {preview && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live Asset Preview</label>
                        <button
                            onClick={handleRemove}
                            className="text-[9px] font-black text-admin-red hover:text-admin-red-dark uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                            <X size={12} strokeWidth={3} />
                            Purge Asset
                        </button>
                    </div>
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-white border border-gray-200 group shadow-lg">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">Active Selection</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
