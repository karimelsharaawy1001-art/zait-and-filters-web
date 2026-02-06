import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 font-Cairo">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF0000]"></div>
                    <p className="text-gray-500 font-bold animate-pulse text-sm">Securing Session...</p>
                </div>
            </div>
        );
    }

    // Strict check: Must be an admin or super_admin
    const isAdmin = user && (role === 'admin' || role === 'super_admin');

    if (!isAdmin) {
        console.warn("Unauthorized access attempt to ProtectedRoute. Redirecting to login.");
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
