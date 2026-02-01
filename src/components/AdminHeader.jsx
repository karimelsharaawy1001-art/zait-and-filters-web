import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminHeader = ({ title }) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        if (!window.confirm("Publish latest data to public site? This will trigger a site rebuild.")) return;

        setIsSyncing(true);
        const toastId = toast.loading('Initiating Build & Refresh...');

        try {
            const webhookUrl = import.meta.env.VITE_VERCEL_DEPLOY_HOOK;
            if (!webhookUrl) {
                toast.error("Deployment Hook not configured!", { id: toastId });
                setIsSyncing(false);
                return;
            }

            // 1. Trigger Vercel Build
            await fetch(webhookUrl, { method: 'POST' });

            // 2. Clear local caches
            localStorage.clear();
            sessionStorage.clear();

            toast.success('Build triggered! Site will update in ~2 mins.', { id: toastId });

            // 3. Hard reload the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('حدث خطأ أثناء تحديث البيانات: ' + error.message, { id: toastId });
            setIsSyncing(false);
        }
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 md:top-0 lg:sticky lg:top-0 z-30">
            <div className="max-w-full mx-auto py-4 sm:py-5 px-4 md:px-10 flex flex-col xs:flex-row justify-between items-center gap-3">
                <h1 className="text-lg sm:text-2xl font-black text-[#000000] tracking-tight font-Cairo italic uppercase text-center xs:text-left">{title}</h1>

                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`w-full xs:w-auto flex items-center justify-center gap-2 px-6 py-4 xs:py-3 rounded-2xl font-black text-[10px] xs:text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20 ${isSyncing
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }`}
                >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync to Live'}
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
