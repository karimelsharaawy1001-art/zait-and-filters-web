import React from 'react';

const AdminHeader = ({ title }) => {
    return (
        <header className="bg-matte-black/60 backdrop-blur-xl border-b border-border-dark sticky top-0 z-30">
            <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-black text-snow-white tracking-tight poppins">{title}</h1>
            </div>
        </header>
    );
};

export default AdminHeader;
