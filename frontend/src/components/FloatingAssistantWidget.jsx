import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Bot,
  Send,
  X,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ticket,
  Maximize2,
  Minimize2,
  MessageSquare
} from 'lucide-react';

export default function FloatingAssistantWidget({ onPrefillComplaint, onNavigateTab }) {
  const { user, role, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const isAdmin = ['Admin', 'Super Admin'].includes(role);

  // Default welcome message on initialization
  useEffect(() => {
    if (messages.length === 0 && user) {
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: `Hello **${user.name}**! I am your **CampusX AI Assistant** for **Lovely Professional University**.\n\nI answer operations questions grounded strictly in real university records from MongoDB. Pick a quick prompt below or type your inquiry.`,
          citations: ['LPU Campus Operations Directory'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const studentQuickPrompts = [
    'Where is my bonafide application?',
    'Report a broken fan in Room 215',
    'How many people are waiting at accounts?',
    'Which classrooms are available?',
  ];

  const adminQuickPrompts = [
    'Which department has the most pending complaints?',
    'What are the major campus problems this month?',
    'Which equipment has the highest failure rate?',
    'How many people are waiting at accounts?',
  ];

  const quickPrompts = isAdmin ? adminQuickPrompts : studentQuickPrompts;

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: data.answer,
          citations: data.citations || [],
          action: data.action || null,
          intent: data.intent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ ${data.message || 'Unable to process query.'}`,
            citations: [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to connect to the assistant service. Please verify backend connectivity.',
          citations: ['Network Error'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;
    if (action.type === 'PREFILL_COMPLAINT' && onPrefillComplaint) {
      onPrefillComplaint(action.payload);
      setIsOpen(false);
    } else if (action.type === 'NAVIGATE' && onNavigateTab) {
      onNavigateTab(action.tab);
      setIsOpen(false);
    } else if (action.type === 'VIEW_REQUEST' && onNavigateTab) {
      onNavigateTab('services');
      setIsOpen(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. How can I assist you with Lovely Professional University operations?`,
        citations: ['LPU Campus Operations Directory'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        {!isOpen && (
          <button
            id="campusx-assistant-trigger-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Open CampusX AI Assistant"
            className="group relative flex items-center space-x-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-brand-800 to-brand-900 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 border border-gold-400/40"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
            </span>
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold-300 group-hover:rotate-12 transition-transform" />
            </div>
            <span className="text-xs font-black tracking-wide pr-1">
              {isAdmin ? 'Admin AI Ops' : 'CampusX Assistant'}
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Panel Drawer */}
      {isOpen && (
        <div
          id="campusx-assistant-modal"
          className={`fixed z-50 transition-all duration-300 shadow-2xl rounded-2xl bg-white border border-slate-300 flex flex-col overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-10 max-w-4xl max-h-[85vh] mx-auto my-auto'
              : 'bottom-6 right-6 w-[92vw] sm:w-[420px] h-[580px] max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-brand-800 via-brand-900 to-slate-900 text-white flex items-center justify-between border-b border-brand-900 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-400/40 flex items-center justify-center text-gold-300 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black tracking-tight">CampusX AI Assistant</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gold-500/20 text-gold-300 border border-gold-400/30">
                    RAG Engine
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  {isAdmin ? 'Administrative Operations Intelligence' : 'Student Operational Support'} &bull; LPU Phagwara
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear Chat History"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse Size' : 'Expand Size'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                id="close-assistant-btn"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto flex-shrink-0 flex items-center space-x-1.5 text-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap mr-1">
              Suggested:
            </span>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                id={`quick-prompt-${idx}`}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-brand-50 hover:text-brand-800 border border-slate-200 text-slate-700 text-[11px] font-semibold transition-all shadow-2xs disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-brand-800 text-white rounded-br-xs'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {/* Message Content formatted with linebreaks and bold text */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.text.split('\n').map((line, lIdx) => (
                      <p key={lIdx} className={line.startsWith('•') ? 'ml-2 my-0.5' : 'my-1'}>
                        {line.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    ))}
                  </div>

                  {/* Grounded Citation Badge (Assistant Only) */}
                  {msg.sender === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-500">
                      <span className="font-bold text-emerald-700 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Data Grounding:</span>
                      </span>
                      {msg.citations.map((cite, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono"
                        >
                          {cite}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Interactive Action Card (if payload attached) */}
                  {msg.action && (
                    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-brand-50/70 to-gold-50/70 border border-brand-200 text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-bold text-brand-900">
                          {msg.action.type === 'PREFILL_COMPLAINT'
                            ? 'Incident Pre-Fill Ready'
                            : 'Navigation Shortcut'}
                        </div>
                        <button
                          type="button"
                          id="assistant-action-btn"
                          onClick={() => handleActionClick(msg.action)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-xs transition-colors"
                        >
                          <span>{msg.action.label || 'Take Action'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {msg.action.payload && (
                        <div className="mt-2 text-[10px] text-slate-600 font-mono flex flex-wrap gap-2">
                          <span>Block: <strong>{msg.action.payload.block}</strong></span>
                          <span>Room: <strong>{msg.action.payload.roomLab || 'Venue'}</strong></span>
                          <span>Category: <strong>{msg.action.payload.category}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl p-3 w-fit shadow-xs">
                <span className="w-4 h-4 border-2 border-brand-800 border-t-transparent rounded-full animate-spin"></span>
                <span>Retrieving MongoDB records & synthesizing grounded answer...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 flex-shrink-0"
          >
            <input
              id="assistant-input-field"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isAdmin
                  ? 'Ask about pending complaints, equipment risk, or queues...'
                  : 'Ask about service requests, queues, classrooms, or file ticket...'
              }
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors disabled:bg-slate-100"
            />
            <button
              id="assistant-send-btn"
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-brand-800 text-white hover:bg-brand-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center font-bold text-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
