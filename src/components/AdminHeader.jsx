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

            toast.success('🚀 Sync Request Sent! Site will rebuild & update in 2-3 minutes.', { id: toastId, duration: 8000 });

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
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-full mx-auto py-3 px-4 md:px-8 flex flex-row justify-between items-center gap-4">
                <div className="flex flex-col">
                    <h1 className="text-sm md:text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest hidden md:block">System Node / {title}</p>
                </div>

                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`admin-btn-slim shadow-sm ${isSyncing
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10 hover:shadow-emerald-500/20'
                        }`}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden xs:inline">{isSyncing ? 'Syncing...' : 'Publish to Live'}</span>
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
