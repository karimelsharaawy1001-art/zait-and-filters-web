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
    const [chatState, setChatState] = useState('idle');
    const [intent, setIntent] = useState(null);
    const [collectedData, setCollectedData] = useState({});

    const messagesEndRef = useRef(null);
    const isRTL = i18n.language === 'ar';

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'bot',
                content: t('chatbot.welcome'),
                timestamp: new Date(),
                options: [
                    { label: t('chatbot.askPart'), intent: 'find_part' },
                    { label: t('chatbot.trackOrder'), intent: 'track_order' },
                    { label: t('chatbot.talkExpert'), intent: 'talk_to_expert' }
                ]
            }]);
        }
    }, [isOpen, i18n.language]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (content = inputValue, customIntent = null) => {
        const text = content.trim();
        if (!text && !customIntent) return;

        const userMsg = {
            role: 'user',
            content: text || (customIntent ? t(`chatbot.${customIntent}`) : ''),
            timestamp: new Date()
        };

        if (userMsg.content) setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // Update intent if provided from button
        const activeIntent = customIntent || intent;
        if (customIntent) setIntent(customIntent);

        try {
            const response = await axios.post('/api/chat-agent', {
                messages: [...messages, userMsg],
                language: i18n.language,
                currentState: chatState,
                intent: activeIntent,
                collectedData
            });

            const { response: botText, state: nextState, options, newData } = response.data;

            if (nextState) {
                setChatState(nextState);
                if (nextState === 'idle') setIntent(null);
                if (nextState === 'ask_make') setCollectedData({});
            }
            if (newData) setCollectedData(prev => ({ ...prev, ...newData }));

            setMessages(prev => [...prev, {
                role: 'bot',
                content: botText,
                timestamp: new Date(),
                options: options || []
            }]);

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

    const formatMessage = (content) => {
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const parts = content.split(linkRegex);
        const result = [];
        for (let i = 0; i < parts.length; i++) {
            if (i % 3 === 0) result.push(parts[i]);
            else if (i % 3 === 1) {
                result.push(<a key={i} href={parts[i + 1]} target="_blank" rel="noopener noreferrer" className="text-[#28B463] font-bold underline mx-1">{parts[i]}</a>);
                i++;
            }
        }
        return result.length > 0 ? result : content;
    };

    return (
        <div className={`fixed bottom-6 z-[9999] flex flex-col items-end ${isRTL ? 'left-6' : 'right-6'}`} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            {isOpen && (
                <div className={`mb-4 w-[380px] sm:w-[420px] max-h-[600px] h-[70vh] bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500`}>

                    {/* Header */}
                    <div className="bg-[#1A1A1A] p-6 text-white relative overflow-hidden flex-shrink-0">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[#28B463] flex items-center justify-center shadow-lg shadow-[#28B463]/30">
                                    <Sparkles className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg uppercase tracking-widest font-Cairo">{t('chatbot.title')}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Always Online</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronDown className="h-6 w-6 text-white/50" /></button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-[#1A1A1A]' : 'bg-[#28B463]'}`}>
                                            {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                                        </div>
                                        <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm font-bold leading-relaxed ${msg.role === 'user' ? 'bg-[#1A1A1A] text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                            }`}>
                                            {formatMessage(msg.content)}
                                        </div>
                                    </div>
                                </div>

                                {/* Options Buttons */}
                                {msg.options && msg.options.length > 0 && idx === messages.length - 1 && !isLoading && (
                                    <div className="flex flex-wrap gap-2 px-11">
                                        {msg.options.map((opt, oIdx) => (
                                            <button
                                                key={oIdx}
                                                onClick={() => handleSend(opt.label, opt.intent)}
                                                className="px-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 hover:border-[#28B463] hover:text-[#28B463] transition-all shadow-sm"
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="h-8 w-8 rounded-xl bg-[#28B463] flex items-center justify-center"><Loader2 className="h-4 w-4 text-white animate-spin" /></div>
                                    <div className="bg-white border border-gray-100 p-4 rounded-[1.5rem] rounded-tl-none shadow-sm"><div className="flex gap-1"><div className="h-2 w-2 rounded-full bg-gray-200 animate-bounce"></div><div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:-.3s]"></div><div className="h-2 w-2 rounded-full bg-gray-200 animate-bounce [animation-delay:-.5s]"></div></div></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white border-t border-gray-100 flex-shrink-0">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-3">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={t('chatbot.placeholder')}
                                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:ring-2 focus:ring-[#28B463] outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="h-[52px] w-[52px] bg-[#1A1A1A] text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-95 disabled:opacity-30 group"
                            >
                                <Send className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-16 w-16 bg-[#28B463] text-white rounded-2xl flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(40,180,99,0.5)] hover:scale-110 active:scale-90 transition-all duration-300 group`}
            >
                {isOpen ? <X className="h-7 w-7" /> : <MessageSquare className="h-7 w-7" />}
                {!isOpen && <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#1A1A1A] rounded-full border-2 border-white animate-bounce"></div>}
            </button>
        </div>
    );
};

export default ChatWidget;
