import React from 'react';

const AdminHeader = ({ title }) => {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-black text-[#000000] tracking-tight font-Cairo italic uppercase">{title}</h1>
            </div>
        </header>
    );
};

export default AdminHeader;
