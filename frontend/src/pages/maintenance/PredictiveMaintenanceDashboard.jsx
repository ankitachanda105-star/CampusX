import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Activity,
  Cpu,
  RefreshCw,
  Search,
  Filter,
  Zap,
  Layers,
  ArrowRight,
  PenTool,
  Check
} from 'lucide-react';

const RISK_LEVELS = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function PredictiveMaintenanceDashboard() {
  const { token, user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Servicing Modal State
  const [servicingAsset, setServicingAsset] = useState(null);
  const [technicianName, setTechnicianName] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingService, setSubmittingService] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchAssets = async () => {
    try {
      let url = '/api/maintenance/assets?';
      if (selectedRisk !== 'All') {
        url += `riskLevel=${encodeURIComponent(selectedRisk)}&`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets);
      }
    } catch (err) {
      console.error('Error fetching maintenance assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 8000);
    return () => clearInterval(interval);
  }, [token, selectedRisk]);

  const handleOpenServiceModal = (asset) => {
    setServicingAsset(asset);
    setTechnicianName(user?.name || 'Facilities Specialist');
    setActionTaken('');
    setPartsReplaced('');
    setNotes('');
  };

  const handleLogService = async (e) => {
    e.preventDefault();
    if (!actionTaken.trim()) {
      alert('Please describe the repair / maintenance action taken.');
      return;
    }

    setSubmittingService(true);
    try {
      const partsArray = partsReplaced
        ? partsReplaced.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      const res = await fetch(
        `/api/maintenance/assets/${servicingAsset._id}/service`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            technicianName: technicianName.trim(),
            actionTaken: actionTaken.trim(),
            partsReplaced: partsArray,
            notes: notes.trim(),
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setToastMessage({
          type: 'success',
          text: data.message,
        });
        setServicingAsset(null);
        await fetchAssets();
      } else {
        setToastMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: 'Network error recording maintenance.' });
    } finally {
      setSubmittingService(false);
    }
  };

  const criticalCount = assets.filter((a) => a.riskLevel === 'CRITICAL').length;
  const highRiskCount = assets.filter((a) => a.riskLevel === 'HIGH').length;

  const filtered = assets.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.assetId.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.block.toLowerCase().includes(q)
    );
  });

  const getRiskColor = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'MEDIUM':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'LOW':
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  const getRiskBarColor = (score) => {
    if (score >= 85) return 'bg-red-600';
    if (score >= 70) return 'bg-amber-500';
    if (score >= 40) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Assets Monitored
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {assets.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Across LPU Blocks</p>
        </div>

        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-xs">
          <p className="text-[10px] font-bold text-red-900 uppercase tracking-wider flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-600" />
            Critical Failure Risk
          </p>
          <p id="kpi-critical-risk-count" className="text-3xl font-black text-red-900 mt-1">
            {criticalCount}
          </p>
          <p className="text-[11px] text-red-700 mt-0.5">Urgent Overhaul Required</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center">
            <Activity className="w-3.5 h-3.5 mr-1 text-amber-600" />
            High Wear / Watchlist
          </p>
          <p className="text-3xl font-black text-amber-900 mt-1">
            {highRiskCount}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Schedule within 72h</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs">
          <p className="text-[10px] font-bold text-gold-400 uppercase tracking-wider">
            Risk Predictor Model
          </p>
          <p className="text-xl font-black mt-1 font-mono">
            AI Heuristic
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Phase 4 ML Ready</p>
        </div>
      </div>

      {/* Critical Equipment Warning Banner */}
      {criticalCount > 0 && (
        <div
          id="critical-maintenance-alert-banner"
          className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-black text-sm tracking-tight">
                PREDICTIVE ALERT: {criticalCount} infrastructure asset(s) at CRITICAL failure probability!
              </h4>
              <p className="text-xs text-red-100">
                Operating parameters, breakdown recurrence, and missed service intervals indicate imminent breakdown.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-white text-red-800 text-[11px] font-black rounded-lg uppercase tracking-wider">
            Action Required
          </span>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {RISK_LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedRisk(lvl)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedRisk === lvl
                  ? 'bg-brand-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {lvl === 'All' ? 'All Risk Levels' : `${lvl} Risk`}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search asset, block, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 w-60"
          />
        </div>
      </div>

      {/* Asset Cards Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl text-center border border-slate-200 text-xs text-slate-400">
          No campus assets matching risk filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((asset) => (
            <div
              key={asset.assetId}
              className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                asset.riskLevel === 'CRITICAL'
                  ? 'border-red-400 ring-2 ring-red-400/20 shadow-md'
                  : asset.riskLevel === 'HIGH'
                  ? 'border-amber-300 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg">
                    {asset.assetId}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getRiskColor(
                      asset.riskLevel
                    )}`}
                  >
                    {asset.riskLevel} RISK ({asset.riskScore}%)
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 line-clamp-1">
                  {asset.name}
                </h3>
                <p className="text-xs text-brand-800 font-semibold mt-0.5">
                  {asset.category} &bull; {asset.block}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {asset.location} ({asset.manufacturer})
                </p>

                {/* Risk Score Progress Bar */}
                <div className="my-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Failure Probability Index</span>
                    <span className="font-mono">{asset.riskScore} / 100</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getRiskBarColor(
                        asset.riskScore
                      )}`}
                      style={{ width: `${asset.riskScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Diagnostics stats */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-center mb-4">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Age</span>
                    <span className="font-bold text-slate-800">{asset.ageInMonths} mo</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Failures</span>
                    <span className="font-bold text-slate-800">{asset.failureCount} times</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Last Service</span>
                    <span className="font-bold text-slate-800">
                      {Math.round(
                        (Date.now() - new Date(asset.lastServiceDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}d ago
                    </span>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 mb-4">
                  <strong className="text-slate-800">Recommendation:</strong> {asset.recommendedAction}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  id={`btn-service-asset-${asset.assetId.toLowerCase()}`}
                  onClick={() => handleOpenServiceModal(asset)}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-gold-400" />
                  <span>Log Service &amp; Repair</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Servicing Modal */}
      {servicingAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono font-bold text-xs text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {servicingAsset.assetId}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Dispatch Maintenance Service
                </h3>
              </div>
              <button
                onClick={() => setServicingAsset(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleLogService} className="space-y-4 mt-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 space-y-1">
                <p>
                  <strong>Target Asset:</strong> {servicingAsset.name} ({servicingAsset.category})
                </p>
                <p>
                  <strong>Location:</strong> {servicingAsset.block} &bull; {servicingAsset.location}
                </p>
                <p>
                  <strong>Current Risk Score:</strong>{' '}
                  <span className="font-bold text-red-700">{servicingAsset.riskScore}% ({servicingAsset.riskLevel})</span>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Certified Technician Name *
                </label>
                <input
                  type="text"
                  required
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Action Taken / Overhaul Performed *
                </label>
                <input
                  id="input-maintenance-action-taken"
                  type="text"
                  required
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. Replaced compressor valve, flushed refrigerant lines, calibrated telemetry..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Parts Replaced (Comma-separated)
                </label>
                <input
                  type="text"
                  value={partsReplaced}
                  onChange={(e) => setPartsReplaced(e.target.value)}
                  placeholder="e.g. O-ring gasket, 40A Contactor, Filter Cartridge"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Diagnostic Notes &amp; Observations
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes regarding operating temperatures, vibrations, and safety clearance..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setServicingAsset(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-maintenance-service"
                  type="submit"
                  disabled={submittingService}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>{submittingService ? 'Logging Service...' : 'Confirm Service & Reset Risk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
