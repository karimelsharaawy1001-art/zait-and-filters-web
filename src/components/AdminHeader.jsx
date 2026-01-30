import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminHeader = ({ title }) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        // Simulate a brief delay for user feedback
        setTimeout(() => {
            try {
                // Client-side "Workaround" Sync:
                // 1. Clear any local caches (localStorage, sessionStorage)
                localStorage.clear();
                sessionStorage.clear();

                // 2. Clear browser cache for current page (limited but helpful)
                // Note: Standard JS cannot clear full browser cache, but we can force reload

                toast.success('تم تحديث بيانات الموقع بنجاح');

                // 3. Hard reload the page to bypass cached data
                setTimeout(() => {
                    window.location.reload(true);
                }, 1000);
            } catch (error) {
                console.error('Sync error:', error);
                toast.error('حدث خطأ أثناء تحديث البيانات');
                setIsSyncing(false);
            }
        }, 1500);
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 md:top-0 lg:sticky lg:top-0 z-30">
            <div className="max-w-7xl mx-auto py-4 sm:py-5 px-4 sm:px-6 lg:px-8 flex flex-col xs:flex-row justify-between items-center gap-3">
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
