'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Copy, Check, RefreshCw, ChevronDown, ArrowUp, Moon, Sun, X, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Message = {
  id: string;
  text: string;
  thinking?: string;
  image?: string;
  sender: 'user' | 'ai';
  isTranslating?: boolean;
  isStreaming?: boolean;
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

function ThinkingBlock({ content, isStreaming, isDarkMode }: { content: string, isStreaming: boolean, isDarkMode: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [prevIsStreaming, setPrevIsStreaming] = useState(isStreaming);

  // Derived state to auto-collapse/expand when streaming status changes, directly updating state
  // to avoid 'react-hooks/set-state-in-effect' cascading render warnings.
  if (isStreaming !== prevIsStreaming) {
    setPrevIsStreaming(isStreaming);
    if (!isStreaming && content.length > 0) {
      setIsExpanded(false);
    } else if (isStreaming && content.length > 0) {
      setIsExpanded(true);
    }
  }

  if (!content) return null;

  return (
    <div className={`mb-3 w-full rounded-[16px] border ${isDarkMode ? 'border-[#3A3A3C] bg-[#2C2C2E]' : 'border-gray-300/60 bg-white/50'} overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] hover:bg-black/5 dark:hover:bg-white/5`}
      >
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <RefreshCw size={14} className="animate-spin opacity-70" />
          ) : (
            <ChevronDown size={16} className={`transition-transform duration-300 opacity-70 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
          )}
          <span className="opacity-80">
            {isStreaming ? 'Thinking...' : 'Thoughts Process'}
          </span>
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-black/5 dark:border-white/5"
          >
            <div className="px-3 pb-3 pt-2 text-[13px] whitespace-pre-wrap leading-relaxed opacity-70 max-h-[150px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              {content}
              {isStreaming && <span className="inline-block w-1.5 h-3.5 ml-1 bg-current animate-pulse align-text-bottom" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TranslatorApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('my');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Vision feature states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }

    // Set initial message on mount to avoid hydration mismatch with dates
    setMessages([
      {
        id: 'welcome-msg',
        text: 'အနီးစပ်ဆုံးနဲ့ အမှန်ကန်ဆုံး ဖြစ်အောင် ဘာသာ ပြန်ပေးပါသည်။',
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
        text: 'အနီးစပ်ဆုံးနဲ့ အမှန်ကန်ဆုံး ဖြစ်အောင် ဘာသာ ပြန်ပေးပါသည်။',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const scrollToBottom = () => {
    // Using a subtle delay to ensure motion animations yield correct heights before scrolling
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Image handling methods
  const processFile = (file: File) => {
    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('ကျေးဇူးပြုပြီး ပုံ (Image) အမျိုးအစားကိုသာ ရွေးချယ်ပေးပါ။');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ဖိုင်အရွယ်အစား 5MB ထက် မကျော်လွန်ပါစေနဲ့။');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') === 0) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault(); // Prevent pasting the image name text if any
          processFile(file);
          break;
        }
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedImage) || isTranslating) return;

    const userText = inputValue.trim();
    const currentImage = selectedImage;
    const newMessageId = Date.now().toString();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: newMessageId + '-user', text: userText, image: currentImage || undefined, sender: 'user', timestamp },
    ]);

    setInputValue('');
    removeImage(); // clear pending image
    setIsTranslating(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add temporary AI message showing loading state
    const aiMessageId = newMessageId + '-ai';
    setMessages((prev) => [
      ...prev,
      { id: aiMessageId, text: '', sender: 'ai', isTranslating: true, timestamp },
    ]);

    try {
      const selectedLangName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userText,
          targetLanguageName: selectedLangName,
          image: currentImage // Passing base64 string directly
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, isTranslating: false, isStreaming: true } : msg
        )
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      let done = false;
      let fullText = '';
      let fullThinking = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // The last element is either an empty string (if it ended with \n) 
          // or an incomplete line. We keep it in the buffer for the next chunk.
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.trim().slice(6));

                let hasStructuredThought = false;
                if (data.parts && data.parts.length > 0) {
                  for (const part of data.parts) {
                    if (part.thought) {
                      fullThinking += part.text;
                      hasStructuredThought = true;
                    } else {
                      fullText += part.text;
                    }
                  }
                } else if (data.text) {
                  fullText += data.text;
                }

                let currentText = fullText;
                let currentThinking = fullThinking;

                // Advanced manual parsing for <think> in fullText
                if (!hasStructuredThought && currentText) {
                  const thinkStart = currentText.indexOf('<think>');
                  const thinkEnd = currentText.indexOf('</think>');
                  const channelStart = currentText.indexOf('<|channel>thought');
                  const channelEnd = currentText.indexOf('<channel|>');

                  if (thinkStart !== -1) {
                    if (thinkEnd !== -1) {
                      currentThinking = currentText.substring(thinkStart + 7, thinkEnd);
                      currentText = currentText.substring(0, thinkStart) + currentText.substring(thinkEnd + 8);
                    } else {
                      currentThinking = currentText.substring(thinkStart + 7);
                      currentText = currentText.substring(0, thinkStart);
                    }
                  } else if (channelStart !== -1) {
                    if (channelEnd !== -1) {
                      currentThinking = currentText.substring(channelStart + 17, channelEnd);
                      currentText = currentText.substring(0, channelStart) + currentText.substring(channelEnd + 10);
                    } else {
                      currentThinking = currentText.substring(channelStart + 17);
                      currentText = currentText.substring(0, channelStart);
                    }
                  }
                }

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, text: currentText.trimStart(), thinking: currentThinking }
                      : msg
                  )
                );
              } catch (e) {
                // Ignore parse errors for incomplete JSON chunks
              }
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
        )
      );

    } catch (error) {
      console.error('Translation error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: 'Sorry, an error occurred during translation.', isTranslating: false, isStreaming: false }
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
              <Image src="/favicon.ico" alt="Translator Logo" width={40} height={40} priority className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className={`text-[17px] font-semibold leading-tight tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Translator</h1>
              <span className={`text-[13px] transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Auto-detect to target</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={() => {
                  const newDarkMode = !isDarkMode;
                  setIsDarkMode(newDarkMode);
                  localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
                }}
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
          className={`flex-1 overflow-y-auto w-full p-5 space-y-4 scroll-smooth transition-colors duration-300 ${isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white'}`}
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
                  className="flex flex-col w-full"
                >
                  {showTimestamp && msg.timestamp && (
                    <div className="text-center mb-4 mt-2">
                      <span className={`text-[11px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{msg.timestamp}</span>
                    </div>
                  )}

                  <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 group w-full`}>
                    <div
                      className={`max-w-[85%] px-[16px] py-[10px] transition-all duration-300 ${msg.sender === 'user'
                        ? (isDarkMode
                          ? 'bg-gradient-to-br from-[#3A9FFF] to-[#0A84FF] text-white rounded-[20px] rounded-br-[4px]'
                          : 'bg-gradient-to-br from-[#2E8CFF] to-[#007AFF] text-white rounded-[20px] rounded-br-[4px]')
                        : (isDarkMode
                          ? 'bg-[#262628] text-white rounded-[20px] rounded-tl-[4px]'
                          : 'bg-[#E9E9EB] text-black rounded-[20px] rounded-tl-[4px]')
                        }`}
                    >
                      {/* Image Thumbnail inside Chat Bubble */}
                      {msg.sender === 'user' && msg.image && (
                        <div className={`mb-2 w-full max-w-[200px] overflow-hidden rounded-[14px] border border-white/20 shadow-sm ${!msg.text && 'mb-0'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.image} alt="User upload" className="w-full h-auto object-cover" />
                        </div>
                      )}

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
                        <div className="flex flex-col w-full min-w-0">
                          {msg.thinking && (
                            <ThinkingBlock content={msg.thinking} isStreaming={!!msg.isStreaming} isDarkMode={isDarkMode} />
                          )}
                          {msg.text && (
                            <p className="text-[15px] leading-[1.35] tracking-[-0.01em] whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          )}
                          {msg.isStreaming && !msg.text && !msg.thinking && (
                            <span className="inline-block w-2.5 h-4 bg-current animate-pulse align-text-bottom opacity-50" />
                          )}
                        </div>
                      )}
                    </div>

                    {msg.sender === 'ai' && !msg.isTranslating && !msg.isStreaming && (
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
          <div className="relative flex flex-col gap-2">

            {/* Image Preview Container */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="relative self-start ml-2 mb-1"
                >
                  <div className={`relative w-16 h-16 rounded-[14px] overflow-hidden border-[2px] ${isDarkMode ? 'border-[#0A84FF]' : 'border-[#007AFF]'} shadow-sm`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedImage} alt="Selected to translate" className="w-full h-full object-cover" />
                    <button
                      onClick={removeImage}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-white"
                      aria-label="Remove image"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Box Row */}
            <div className="relative flex items-end">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                aria-hidden="true"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTranslating}
                className={`absolute left-2.5 bottom-1.5 p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] z-10 ${isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3A3A3C]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  } ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Upload Image"
                aria-label="Upload Image"
              >
                <ImageIcon size={20} strokeWidth={2} />
              </button>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                maxLength={500}
                rows={1}
                placeholder="Message or paste image..."
                aria-label="Message to translate"
                className={`w-full border rounded-[20px] pl-[2.8rem] pr-12 py-3 text-[15px] outline-none transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:border-transparent resize-none overflow-y-auto min-h-[48px] max-h-[120px] leading-relaxed [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDarkMode
                  ? 'bg-[#2C2C2E] border-[#3A3A3C] text-white placeholder:text-gray-500 focus:border-[#48484A]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300'
                  }`}
              />

              <button
                onClick={handleSend}
                disabled={(!inputValue.trim() && !selectedImage) || isTranslating}
                aria-label="Send message"
                className={`absolute right-1.5 bottom-1.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#007AFF] z-10 ${(inputValue.trim() || selectedImage) && !isTranslating
                  ? (isDarkMode ? 'bg-[#0A84FF] text-white shadow-md hover:bg-blue-500 scale-100' : 'bg-[#007AFF] text-white shadow-md hover:bg-blue-600 scale-100')
                  : (isDarkMode ? 'bg-[#2C2C2E] text-gray-500 scale-95' : 'bg-gray-100 text-gray-400 scale-95')
                  }`}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex justify-between items-center mt-2 mb-1 px-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Direct Translation Engine
              </span>
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${inputValue.length >= 500
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
    </div>
  );
}
