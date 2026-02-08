import React, { useState, useEffect } from 'react';
import { Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ImageUpload = ({
    value,
    onChange,
    currentImage,
    onUploadComplete,
    folderPath = 'general'
}) => {
    const actualValue = value || currentImage;
    const actualOnChange = onChange || onUploadComplete;

    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(actualValue || '');
    const [urlInput, setUrlInput] = useState(actualValue && actualValue.startsWith('http') ? actualValue : '');

    const isValidImageUrl = (url) => {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) !== null || url.startsWith('http');
    };

    useEffect(() => {
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
        setUrlInput('');

        try {
            // Create a consistent path: images/folder/timestamp_filename
            const storagePath = `images/${folderPath}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = ref(storage, storagePath);

            // Upload
            await uploadBytes(storageRef, file);

            // Get URL
            const fileUrl = await getDownloadURL(storageRef);

            setPreview(fileUrl);
            if (actualOnChange) actualOnChange(fileUrl);
            toast.success("Image uploaded to Firebase Storage");
        } catch (error) {
            console.error('Firebase Upload Error:', error);
            toast.error(`Upload failed: ${error.message}`);
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
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Image URL (رابط الصورة)</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            value={urlInput}
                            onChange={handleUrlChange}
                            className="w-full bg-white border border-gray-200 rounded-xl p-4 text-black placeholder-gray-400 focus:ring-2 focus:ring-orange-600 outline-none transition-all font-bold text-sm shadow-sm"
                        />
                        {urlInput && isValidImageUrl(urlInput) && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Local Upload (رفع ملف)</label>
                    <div className="relative group border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center transition-all hover:border-orange-600 bg-gray-50">
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
                    </div>
                </div>
            </div>

            {preview && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live Asset Preview</label>
                        <button
                            onClick={handleRemove}
                            className="text-[9px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                            <X size={12} strokeWidth={3} />
                            Purge Asset
                        </button>
                    </div>
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-white border border-gray-200 group shadow-lg">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
