import React from 'react';
import { Sparkles, Brain, Cpu, ArrowUpRight, Lock } from 'lucide-react';

export default function AIInsightsPlaceholder({ onOpenAssistant }) {
  const handleLaunch = () => {
    if (onOpenAssistant) {
      onOpenAssistant();
    } else {
      const btn = document.getElementById('campusx-assistant-trigger-btn');
      if (btn) {
        btn.click();
      } else {
        const tabBtn = document.getElementById('tab-admin-assistant');
        if (tabBtn) tabBtn.click();
      }
    }
  };

  return (
    <div
      id="ai-insights-placeholder-panel"
      className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 text-white shadow-xl border border-slate-700/60 relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
            <Brain className="w-6 h-6 text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Phase 5 Active Engine
              </span>
              <span className="text-[10px] font-bold text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-full border border-gold-400/20">
                FastAPI :8000 &amp; RAG Desk
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight mt-1">
              AI Campus Insights &amp; Operational RAG Desk
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Interactive administrative RAG queries for department complaint distribution, monthly campus issues, and high-risk equipment failure predictions are now active.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto shrink-0">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 font-bold">RAG Online</span>
          </div>

          <button
            id="launch-assistant-from-panel-btn"
            onClick={handleLaunch}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-gold-400/20"
          >
            <Sparkles className="w-4 h-4 text-brand-900" />
            <span>Open AI Assistant</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-brand-900" />
          </button>
        </div>
      </div>
    </div>
  );
}
