import React from 'react';

const AdminHeader = ({ title }) => {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
        </header>
    );
};

export default AdminHeader;
