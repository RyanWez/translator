'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Copy, Check, RefreshCw, ChevronDown, ArrowUp, Moon, Sun, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isTranslating?: boolean;
  timestamp?: string;
};

const LANGUAGES = [
  { code: 'my', name: 'Burmese (မြန်မာ)' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'th', name: 'Thai (ไทย)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
];

export default function TranslatorApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('my');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Check system preference on mount
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
    
    // Set initial message on mount to avoid hydration mismatch with dates
    setMessages([
      {
        id: 'welcome-msg',
        text: 'ဘာသာပြန်ဖို့ ခက်နေတဲ့ စာလေးတွေ ရှိလား? ကျွန်တော့်ဆီသာ ပို့လိုက်ပါ! ဘာစကားပလ္လင်မှ မခံဘဲ လိုချင်တဲ့ ဘာသာပြန်ချက်သက်သက်ကိုပဲ ချက်ချင်း တိုက်ရိုက် ဖော်ပြပေးသွားပါမယ်။',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: 'ဘာသာပြန်ဖို့ ခက်နေတဲ့ စာလေးတွေ ရှိလား? ကျွန်တော့်ဆီသာ ပို့လိုက်ပါ! ဘာစကားပလ္လင်မှ မခံဘဲ လိုချင်တဲ့ ဘာသာပြန်ချက်သက်သက်ကိုပဲ ချက်ချင်း တိုက်ရိုက် ဖော်ပြပေးသွားပါမယ်',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTranslating) return;

    const userText = inputValue.trim();
    const newMessageId = Date.now().toString();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: newMessageId + '-user', text: userText, sender: 'user', timestamp },
    ]);
    
    setInputValue('');
    setIsTranslating(true);

    // Add temporary AI message showing loading state
    const aiMessageId = newMessageId + '-ai';
    setMessages((prev) => [
      ...prev,
      { id: aiMessageId, text: '', sender: 'ai', isTranslating: true, timestamp },
    ]);

    try {
      const selectedLangName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
      
      // Add a minimum delay so the typing animation is always visible for a smooth experience
      const minDelay = new Promise(resolve => setTimeout(resolve, 800));
      
      const [response] = await Promise.all([
        ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: userText,
          config: {
            systemInstruction: `You are a direct translator. Translate the user's input into ${selectedLangName}. Provide ONLY the translation. Do not include any quotes, explanations, original text, or markdown formatting. Just the translated text.`,
            temperature: 0.3,
          },
        }),
        minDelay
      ]);

      const translatedText = response.text || 'Translation failed.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: translatedText, isTranslating: false }
            : msg
        )
      );
    } catch (error) {
      console.error('Translation error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: 'Sorry, an error occurred during translation.', isTranslating: false }
            : msg
        )
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max height ~5 lines
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (inputValue === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue]);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-[#e5e7eb]'} font-sans selection:bg-blue-200 p-4 sm:p-8`}>
      
      {/* Mobile Container */}
      <div className={`w-full max-w-[420px] h-[85vh] max-h-[850px] min-h-[600px] ${isDarkMode ? 'bg-[#1C1C1E] border-[#1C1C1E] ring-[#2C2C2E]' : 'bg-white border-white ring-gray-200'} rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border-[6px] ring-1 transition-colors duration-300`}>
        
        {/* Header */}
        <header className={`px-6 py-5 border-b ${isDarkMode ? 'border-[#2C2C2E] bg-[#1C1C1E]' : 'border-gray-100 bg-white'} flex items-center justify-between z-10 shrink-0 transition-colors duration-300`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-colors duration-300`}>
              <img src="/favicon.ico" alt="Translator Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className={`text-[17px] font-semibold leading-tight tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Translator</h1>
              <span className={`text-[13px] transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Auto-detect to target</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#2C2C2E]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                {isDarkMode ? <Sun size={16} strokeWidth={2.5} /> : <Moon size={16} strokeWidth={2.5} />}
              </button>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20" aria-hidden="true">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </div>
            </div>

            <div className="relative group">
              <button 
                onClick={clearChat}
                aria-label="Clear chat"
                className={`p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#2C2C2E]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                <RefreshCw size={16} strokeWidth={2.5} />
              </button>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20" aria-hidden="true">
                Clear Chat
              </div>
            </div>

            <div className="relative">
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                aria-label="Select target language"
                className={`appearance-none transition-colors text-[13px] font-medium rounded-full pl-3 pr-8 py-1.5 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[#007AFF] ${isDarkMode ? 'bg-[#2C2C2E] hover:bg-[#3A3A3C] text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main 
          className={`flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth transition-colors duration-300 ${isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white'}`}
          role="log"
          aria-live="polite"
          aria-atomic="false"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const showTimestamp = index === 0 || messages[index - 1]?.timestamp !== msg.timestamp;
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-col"
                >
                  {showTimestamp && msg.timestamp && (
                    <div className="text-center mb-4 mt-2">
                      <span className={`text-[11px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{msg.timestamp}</span>
                    </div>
                  )}
                  
                  <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 group`}>
                    <div
                      className={`max-w-[85%] px-[16px] py-[10px] transition-all duration-300 ${
                        msg.sender === 'user'
                          ? (isDarkMode 
                              ? 'bg-gradient-to-br from-[#3A9FFF] to-[#0A84FF] text-white rounded-[20px] rounded-br-[4px]' 
                              : 'bg-gradient-to-br from-[#2E8CFF] to-[#007AFF] text-white rounded-[20px] rounded-br-[4px]')
                          : (isDarkMode 
                              ? 'bg-[#262628] text-white rounded-[20px] rounded-tl-[4px]' 
                              : 'bg-[#E9E9EB] text-black rounded-[20px] rounded-tl-[4px]')
                      }`}
                    >
                      {msg.isTranslating ? (
                        <div className="flex items-center gap-1.5 h-6 px-1 py-0.5">
                          <motion.div
                            animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.2, delay: 0, ease: "easeInOut" }}
                            className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-[#98989D]' : 'bg-[#8E8E93]'}`}
                          />
                          <motion.div
                            animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.2, delay: 0.2, ease: "easeInOut" }}
                            className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-[#98989D]' : 'bg-[#8E8E93]'}`}
                          />
                          <motion.div
                            animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                            className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-[#98989D]' : 'bg-[#8E8E93]'}`}
                          />
                        </div>
                      ) : (
                        <p className="text-[15px] leading-[1.35] tracking-[-0.01em] whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}
                    </div>
                    
                    {msg.sender === 'ai' && !msg.isTranslating && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        aria-label="Copy translation"
                        className={`p-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all rounded-full flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3A3A3C]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        title="Copy translation"
                      >
                        {copiedId === msg.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-2" />
        </main>

        {/* Input Area */}
        <div className={`p-4 border-t shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
          <div className="relative flex items-end">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={500}
              rows={1}
              placeholder="Message to translate..."
              aria-label="Message to translate"
              className={`w-full border rounded-[20px] pl-5 pr-20 py-3 text-[15px] outline-none transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:border-transparent resize-none overflow-y-auto min-h-[48px] max-h-[120px] leading-relaxed [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
                isDarkMode 
                  ? 'bg-[#2C2C2E] border-[#3A3A3C] text-white placeholder:text-gray-500 focus:border-[#48484A]' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300'
              }`}
            />
            <AnimatePresence>
              {inputValue.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setInputValue('')}
                  aria-label="Clear input"
                  className={`absolute right-12 bottom-2 p-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3A3A3C]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X size={16} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTranslating}
              aria-label="Send message"
              className={`absolute right-1.5 bottom-1.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#007AFF] ${
                inputValue.trim() && !isTranslating
                  ? (isDarkMode ? 'bg-[#0A84FF] text-white shadow-md hover:bg-blue-500 scale-100' : 'bg-[#007AFF] text-white shadow-md hover:bg-blue-600 scale-100')
                  : (isDarkMode ? 'bg-[#2C2C2E] text-gray-500 scale-95' : 'bg-gray-100 text-gray-400 scale-95')
              }`}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex justify-between items-center mt-3 mb-1 px-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Direct Translation Engine
            </span>
            <span 
              className={`text-[10px] font-medium transition-colors duration-300 ${
                inputValue.length >= 500 
                  ? 'text-red-500' 
                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}
              aria-live="polite"
            >
              {inputValue.length} / 500
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
