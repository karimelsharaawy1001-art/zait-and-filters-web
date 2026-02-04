import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X, Send, Bot, User, Phone, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import axios from 'axios';

const ChatWidget = () => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const isRTL = i18n.language === 'ar';

    useEffect(() => {
        // Initial welcome message
        if (messages.length === 0) {
            setMessages([{
                role: 'bot',
                content: t('chatbot.welcome'),
                timestamp: new Date()
            }]);
        }
    }, [i18n.language]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (content = inputValue) => {
        if (!content.trim()) return;

        const userMessage = {
            role: 'user',
            content: content,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role,
                content: m.content
            }));
            history.push({ role: 'user', content: content });

            const response = await axios.post('/api/chat-agent', {
                messages: history,
                language: i18n.language
            });

            const botMessage = {
                role: 'bot',
                content: response.data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                role: 'bot',
                content: t('chatbot.error'),
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickActions = [
        { label: t('chatbot.askPart'), value: t('chatbot.askPart') },
        { label: t('chatbot.trackOrder'), value: t('chatbot.trackOrder') },
        { label: t('chatbot.talkExpert'), value: "WhatsApp Helper" }
    ];

    const formatMessage = (content) => {
        // Simple markdown links support
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const parts = content.split(linkRegex);
        const result = [];

        for (let i = 0; i < parts.length; i++) {
            if (i % 3 === 0) {
                result.push(parts[i]);
            } else if (i % 3 === 1) {
                const label = parts[i];
                const url = parts[i + 1];
                result.push(
                    <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#28B463] font-bold underline hover:text-[#219653] mx-1"
                    >
                        {label}
                    </a>
                );
                i++; // skip url part
            }
        }
        return result.length > 0 ? result : content;
    };

    return (
        <div className={`fixed bottom-6 z-[9999] flex flex-col items-end ${isRTL ? 'left-6' : 'right-6'}`} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            {/* Chat Window */}
            {isOpen && (
                <div className={`mb-4 w-[380px] sm:w-[420px] max-h-[600px] h-[70vh] bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500`}>

                    {/* Header */}
                    <div className="bg-[#1A1A1A] p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Bot className="w-24 h-24" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#28B463] flex items-center justify-center shadow-lg shadow-[#28B463]/30">
                                    <Sparkles className="h-6 w-6 text-white animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg uppercase tracking-widest font-Cairo">{t('chatbot.title')}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active & Ready</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                            >
                                <ChevronDown className="h-6 w-6 text-white/50 group-hover:text-white transition-transform group-hover:translate-y-1" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50/50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-[#1A1A1A]' : 'bg-[#28B463]'}`}>
                                        {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                                    </div>
                                    <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm font-bold leading-relaxed ${msg.role === 'user'
                                            ? 'bg-[#1A1A1A] text-white rounded-tr-none'
                                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                        }`}>
                                        {formatMessage(msg.content)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="h-8 w-8 rounded-xl bg-[#28B463] flex items-center justify-center">
                                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    </div>
                                    <div className="bg-white border border-gray-100 p-4 rounded-[1.5rem] rounded-tl-none shadow-sm">
                                        <div className="flex gap-1">
                                            <div className="h-2 w-2 rounded-full bg-gray-200 animate-bounce"></div>
                                            <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:-.3s]"></div>
                                            <div className="h-2 w-2 rounded-full bg-gray-200 animate-bounce [animation-delay:-.5s]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    {messages.length === 1 && !isLoading && !inputValue && (
                        <div className="px-6 pb-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500 delay-300">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(action.value)}
                                    className="px-4 py-3 text-start bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-600 hover:border-[#28B463] hover:text-[#28B463] transition-all flex items-center justify-between group"
                                >
                                    {action.label}
                                    <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-6 bg-white border-t border-gray-100">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="relative flex items-center gap-3"
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={t('chatbot.placeholder')}
                                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all placeholder-gray-300"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="h-[52px] w-[52px] bg-[#1A1A1A] text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group"
                            >
                                <Send className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''} group-hover:translate-x-1 transition-transform`} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-16 w-16 bg-[#28B463] text-white rounded-2xl flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(40,180,99,0.5)] hover:scale-110 active:scale-90 transition-all duration-300 group relative overflow-hidden`}
            >
                <div className="absolute inset-0 bg-white/20 translate-y-16 group-hover:translate-y-0 transition-transform duration-500"></div>
                {isOpen ? (
                    <X className="h-7 w-7 relative z-10" />
                ) : (
                    <MessageSquare className="h-7 w-7 relative z-10" />
                )}
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#1A1A1A] rounded-full border-2 border-white animate-bounce"></div>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
