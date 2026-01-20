import React, { useState } from 'react';
import axios from 'axios';
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_UPLOAD_URL } from '../../config/cloudinary';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

    // Sync preview if actualValue changes from outside
    React.useEffect(() => {
        setPreview(actualValue || '');
    }, [actualValue]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', folderPath);

        try {
            const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
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
            if (error.response) {
                console.error('Cloudinary Response Data:', error.response.data);
            }
            toast.error("Upload failed. Please check your Cloudinary configuration and console for details.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview('');
        if (actualOnChange) actualOnChange('');
    };

    return (
        <div className="w-full space-y-4">
            <div className="relative group border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center transition-all hover:border-orange-400 bg-gray-50/50">
                {preview ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-white shadow-inner">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                        {!uploading && (
                            <button
                                onClick={handleRemove}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <label className="w-full h-40 flex flex-col items-center justify-center cursor-pointer">
                        <Upload className={`h-10 w-10 mb-2 ${uploading ? 'text-gray-300' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium text-gray-500">
                            {uploading ? 'Uploading...' : 'Click to upload image'}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                )}

                {uploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10">
                        <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-3" />
                        <div className="w-48 bg-gray-200 rounded-full h-2 overflow-hidden shadow-sm">
                            <div
                                className="bg-orange-500 h-full transition-all duration-300 flex items-center justify-end pr-2"
                                style={{ width: `${progress}%` }}
                            >
                            </div>
                        </div>
                        <span className="mt-2 text-xs font-bold text-orange-600 uppercase tracking-tighter">{progress}%</span>
                    </div>
                )}
            </div>

            {!uploading && !preview && (
                <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">
                    Recommended: Square or 16:9 aspect ratio
                </p>
            )}
        </div>
    );
};

export default ImageUpload;
