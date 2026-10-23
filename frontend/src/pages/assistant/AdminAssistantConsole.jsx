import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  Layers,
  Building,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Clock,
  Ticket,
  Wrench,
  HelpCircle,
  Database,
  ArrowRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';

export default function AdminAssistantConsole() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'admin-welcome',
          sender: 'assistant',
          text: `Welcome Administrator **${user?.name || 'Officer'}** to the **CampusX AI Operations Console**.\n\nAll intelligence returned here is computed on-the-fly via deterministic **MongoDB aggregation pipelines** and our **Python AI microservice**. Responses are strictly grounded in live LPU records.`,
          citations: ['LPU Campus Database Core', 'RBAC Scoped: Admin View'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const adminQueries = [
    {
      label: 'Department Complaints',
      query: 'Which department has the most pending complaints?',
      desc: 'Aggregates unresolved tickets across all academic & facility departments',
      icon: BarChart3,
      color: 'from-amber-500/10 to-brand-500/10 border-amber-200 text-brand-900',
    },
    {
      label: 'Monthly Problem Breakdown',
      query: 'What are the major campus problems this month?',
      desc: 'Categorical distribution of incident reports logged over the past 30 days',
      icon: AlertTriangle,
      color: 'from-rose-500/10 to-orange-500/10 border-rose-200 text-rose-900',
    },
    {
      label: 'Equipment Failure Risk',
      query: 'Which equipment has the highest failure rate?',
      desc: 'Identifies high-risk assets using maintenance history and ML risk scoring',
      icon: Wrench,
      color: 'from-purple-500/10 to-indigo-500/10 border-purple-200 text-purple-900',
    },
    {
      label: 'Live Queue Telemetry',
      query: 'How many people are waiting at accounts?',
      desc: 'Real-time queue load, active tokens, and waiting student counts',
      icon: Ticket,
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-900',
    },
  ];

  const handleSend = async (queryText) => {
    const text = (queryText || inputQuery).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.success) {
        const asstMsg = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: data.answer,
          citations: data.citations || [],
          intent: data.intent,
          action: data.action || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, asstMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ ${data.message || 'Unable to execute query.'}`,
            citations: ['Error Handler'],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `net-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to reach backend assistant engine. Please verify server connectivity.',
          citations: ['Network Error'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'assistant',
        text: `Console cleared. Select an operational query below or type your inquiry.`,
        citations: ['LPU Operations Directory'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="space-y-6" id="admin-assistant-console-root">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-slate-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-brand-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-gold-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-7 h-7 text-gold-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-gold-400/20 text-gold-300 border border-gold-400/30 flex items-center">
                  <Database className="w-3 h-3 mr-1" />
                  RAG Analytics Engine
                </span>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-400/30">
                  Grounding: 100% Live DB
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1.5">
                CampusX AI Operations &amp; Retrieval Desk
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Query operational intelligence directly from Lovely Professional University records. Zero hallucinations: answers are derived via live MongoDB aggregation pipelines and Python AI models.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClear}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 border border-white/15 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1-Click Administrative Analytics Cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-1.5 text-brand-800" />
          Recommended Operational Inquiries (1-Click Run)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {adminQueries.map((q, idx) => {
            const Icon = q.icon;
            return (
              <button
                key={idx}
                id={`admin-quick-query-${idx}`}
                onClick={() => handleSend(q.query)}
                disabled={loading}
                className="text-left p-4 rounded-2xl bg-white border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center mb-2.5 group-hover:bg-brand-800 group-hover:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-brand-800 transition-colors">
                    {q.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    "{q.query}"
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-brand-800">
                  <span>Execute RAG</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Chat Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[560px]">
        {/* Chat History */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-brand-800 text-gold-300 ring-2 ring-brand-100'
                  }`}
                >
                  {isUser ? user?.name?.charAt(0) || 'A' : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
                  <div
                    className={`inline-block p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-brand-800 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Citations Grounding Badge */}
                  {!isUser && m.citations && m.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center mr-1">
                        <Database className="w-3 h-3 mr-1 text-slate-400" />
                        Grounded In:
                      </span>
                      {m.citations.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                        >
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 mt-1 px-1">
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl shrink-0 bg-brand-800 text-gold-300 flex items-center justify-center ring-2 ring-brand-100">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs rounded-tl-none flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-brand-800 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-brand-800 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-brand-800 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-xs text-slate-500 font-medium pl-2">
                  Querying MongoDB pipelines &amp; analyzing campus records...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              id="admin-assistant-query-input"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about campus operations, pending complaints, equipment risk, or queues..."
              disabled={loading}
              className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-800 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
            />
            <button
              id="admin-assistant-query-submit-btn"
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="px-5 py-3 rounded-xl bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-brand-900/10 transition-all shrink-0"
            >
              <span>Query AI</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Deterministic RAG &bull; Scoped strictly to administrative permissions</span>
            <span>Max 30 requests / minute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
