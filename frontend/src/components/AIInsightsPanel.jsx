import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  Ticket,
  Building
} from 'lucide-react';

export default function AIInsightsPanel({ insights = [], onNavigateTab }) {
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'QUEUE_ANOMALY':
        return Ticket;
      case 'REPEATED_FAILURE':
      case 'HIGH_RISK_EQUIPMENT':
        return Wrench;
      case 'RESOURCE_OPTIMIZATION':
        return Building;
      default:
        return Sparkles;
    }
  };

  return (
    <div
      id="ai-insights-panel-root"
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/60 relative overflow-hidden space-y-6"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 pb-4 border-b border-white/10">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15 shadow-inner">
            <Sparkles className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center">
                <Cpu className="w-3 h-3 mr-1" />
                Live Rule Engine
              </span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                Live Data Grounded
              </span>
            </div>
            <h3 className="text-xl font-black tracking-tight mt-1">
              AI Campus Insights &amp; Operational Anomaly Feed
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Real-time heuristic evaluation running over MongoDB operational metrics, queue velocity, equipment failure frequency, and venue utilization.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-slate-200">
            {insights.length} Active Insight{insights.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Insights Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {insights.length === 0 ? (
          <div className="col-span-2 py-10 text-center bg-white/5 rounded-2xl border border-white/10">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">All Campus Operations Nominal</p>
            <p className="text-xs text-slate-400 mt-1">
              No queue anomalies, repeated failures, or excessive facility idle times detected across university blocks.
            </p>
          </div>
        ) : (
          insights.map((item) => {
            const isWarning = item.type === 'warning';
            const Icon = getCategoryIcon(item.category);

            return (
              <div
                key={item.id}
                id={`insight-card-${item.id}`}
                className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between ${
                  isWarning
                    ? 'bg-slate-900/80 border-amber-500/40 hover:border-amber-400'
                    : 'bg-slate-900/80 border-purple-500/40 hover:border-purple-400'
                }`}
              >
                <div>
                  {/* Category Pill & Metric */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{item.icon}</span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          isWarning
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {item.categoryLabel}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-slate-300 px-2 py-0.5 rounded bg-white/10">
                      {item.metric}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-black text-white tracking-tight">
                    {item.title}
                  </h4>

                  {/* Context Description */}
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Actionable Advice */}
                  <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-200">
                    <span className="font-bold text-gold-300">Recommendation: </span>
                    {item.recommendation}
                  </div>
                </div>

                {/* Deep-link Action Button */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Target: <strong className="text-slate-300">{item.targetTab}</strong>
                  </span>

                  <button
                    id={`action-btn-${item.id}`}
                    onClick={() => {
                      if (onNavigateTab) {
                        onNavigateTab(item.targetTab, item.targetId);
                      }
                    }}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isWarning
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                        : 'bg-purple-400 hover:bg-purple-300 text-slate-950 shadow-purple-400/20'
                    }`}
                  >
                    <span>{item.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
