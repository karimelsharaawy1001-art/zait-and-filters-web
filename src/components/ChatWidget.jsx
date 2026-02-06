import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

const ChatWidget = () => {
    const navigate = useNavigate();

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            <button
                onClick={() => navigate('/contact')}
                className="h-16 w-16 bg-[#28B463] text-white rounded-2xl flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(40,180,99,0.5)] hover:scale-110 active:scale-90 transition-all duration-300 group"
            >
                <MessageSquare className="h-7 w-7" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#1A1A1A] rounded-full border-2 border-white animate-bounce"></div>
            </button>
        </div>
    );
};

export default ChatWidget;
