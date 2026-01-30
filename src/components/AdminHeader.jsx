import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminHeader = ({ title }) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/products?action=sync', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            toast.success('تم تحديث بيانات الموقع بنجاح');
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('حدث خطأ أثناء تحديث البيانات');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <h1 className="text-2xl font-black text-[#000000] tracking-tight font-Cairo italic uppercase">{title}</h1>

                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20 ${isSyncing
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
