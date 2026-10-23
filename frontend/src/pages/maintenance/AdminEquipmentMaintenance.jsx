import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Activity,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Check,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import EquipmentDetailModal from './EquipmentDetailModal';

export default function AdminEquipmentMaintenance({ initialSearchQuery = '' }) {
  const { token, user } = useAuth();
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [filterLevel, setFilterLevel] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/equipment', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEquipmentList(data.equipment || []);
      }
    } catch (err) {
      console.error('Error fetching maintenance equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [token]);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Schedule Maintenance Task
  const handleScheduleMaintenance = async (item) => {
    setActionLoadingId(item._id);
    try {
      const res = await fetch(`/api/maintenance/equipment/${item._id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          department: 'Maintenance/Electrical',
          notes: 'Preventative inspection scheduled from automated high-risk detection.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message);
        fetchEquipment();
      }
    } catch (err) {
      console.error('Error scheduling maintenance:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete Maintenance Task (resets last_maintenance_date to Date.now())
  const handleCompleteMaintenance = async (item) => {
    setActionLoadingId(item._id);
    try {
      const res = await fetch(`/api/maintenance/equipment/${item._id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: 'Standard overhaul, filter replacement, and sensor calibration.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(data.message);
        fetchEquipment();
      }
    } catch (err) {
      console.error('Error completing maintenance:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter list
  const filtered = equipmentList.filter((eq) => {
    if (filterLevel !== 'All' && eq.riskLevel !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        eq.name.toLowerCase().includes(q) ||
        eq.equipment_id.toLowerCase().includes(q) ||
        eq.type.toLowerCase().includes(q) ||
        (eq.parent_resource?.name && eq.parent_resource.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const highRiskCount = equipmentList.filter((e) => e.riskLevel === 'HIGH').length;
  const mediumRiskCount = equipmentList.filter((e) => e.riskLevel === 'MEDIUM').length;

  return (
    <div className="space-y-6" id="admin-maintenance-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600 text-base">
            &times;
          </button>
        </div>
      )}

      {/* Header & Risk Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
              Module 6 &bull; Predictive Intelligence
            </span>
            <span className="text-xs text-brand-800 font-bold flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              AI Risk Scoring Stub Active
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Campus Infrastructure Equipment &amp; Risk Health
          </h2>
          <p className="text-xs text-slate-500">
            Multi-factor weighted risk assessment derived from 90-day breakdown frequency, maintenance intervals, and operating age
          </p>
        </div>

        <button
          onClick={fetchEquipment}
          className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Registry</span>
        </button>
      </div>

      {/* 4 Telemetry Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Equipment</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{equipmentList.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Linked to Campus Venues</p>
        </div>

        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-xs">
          <p className="text-[10px] font-bold text-red-900 uppercase tracking-wider flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-600" />
            High Risk Assets
          </p>
          <p id="kpi-high-risk-count" className="text-2xl font-black text-red-900 mt-1">
            {highRiskCount}
          </p>
          <p className="text-[11px] text-red-700 mt-0.5">Score &ge; 70 &bull; Urgent Overhaul</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center">
            <Activity className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Medium Watchlist
          </p>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {mediumRiskCount}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Score 40-69 &bull; Preventative</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs">
          <p className="text-[10px] font-bold text-gold-400 uppercase tracking-wider">Predictor Engine</p>
          <p className="text-lg font-black mt-1 font-mono">Weighted Heuristic</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Phase 4 ML Swappable</p>
        </div>
      </div>

      {/* High Risk Alert Banner */}
      {highRiskCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-700/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                CRITICAL WARNING: {highRiskCount} equipment asset(s) flagged at HIGH breakdown probability!
              </h4>
              <p className="text-xs text-red-100">
                Operating age, breakdown recurrence, and overdue service intervals indicate imminent subsystem failure.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-white text-red-800 text-[10px] font-black rounded-lg uppercase tracking-wider">
            Intervention Required
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-equipment"
            type="text"
            placeholder="Search equipment ID, name, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['All', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filterLevel === lvl
                  ? 'bg-brand-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'All' ? 'All Risk Levels' : `${lvl} Risk`}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Table Sorted by Risk Score Descending */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="maintenance-risk-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="table-maintenance-risk">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Equipment ID</th>
                <th className="py-3.5 px-4">Asset Details &amp; Type</th>
                <th className="py-3.5 px-4">Venue Location</th>
                <th className="py-3.5 px-4">Days Overdue</th>
                <th className="py-3.5 px-4">90d Failures</th>
                <th className="py-3.5 px-4 min-w-[210px]">Risk Score &amp; Bar</th>
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const score = item.riskScore || 0;
                let barColor = 'bg-emerald-500';
                let levelBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';

                if (item.riskLevel === 'HIGH') {
                  barColor = 'bg-red-600';
                  levelBadge = 'bg-red-50 text-red-800 border-red-200';
                } else if (item.riskLevel === 'MEDIUM') {
                  barColor = 'bg-amber-500';
                  levelBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                }

                return (
                  <tr key={item.equipment_id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Equipment ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-900">
                      <span className="px-2 py-0.5 bg-brand-50 rounded border border-brand-200">
                        {item.equipment_id}
                      </span>
                    </td>

                    {/* Name & Type */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.type}</p>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <p className="text-slate-900 font-semibold">{item.parent_resource?.name || 'Classroom'}</p>
                      <p className="text-[10px] text-slate-400">{item.parent_resource?.block}</p>
                    </td>

                    {/* Days Overdue */}
                    <td className="py-3.5 px-4 text-slate-700 font-mono font-semibold">
                      {item.daysSinceLastMaintenance} days
                    </td>

                    {/* 90d Failures */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        item.failureCount90Days > 0 ? 'bg-red-50 text-red-800 font-black' : 'text-slate-500'
                      }`}>
                        {item.failureCount90Days} logged
                      </span>
                    </td>

                    {/* Risk Score & Colored Bar */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-900">{score} / 100</span>
                          <span className="text-slate-400 text-[10px] font-medium">
                            {score >= 70 ? 'Imminent Alert' : score >= 40 ? 'Moderate Wear' : 'Stable'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Risk Level Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${levelBadge}`}>
                        {item.riskLevel}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        id={`btn-view-equipment-${item.equipment_id.toLowerCase()}`}
                        onClick={() => setSelectedEquipment(item)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition-colors inline-flex items-center space-x-1"
                        title="View Failure Histogram & Logs"
                      >
                        <BarChart3 className="w-3 h-3 text-slate-500" />
                        <span>Inspect</span>
                      </button>

                      {item.riskLevel === 'HIGH' || item.status === 'Needs Maintenance' ? (
                        <button
                          id={`btn-complete-maint-${item.equipment_id.toLowerCase()}`}
                          onClick={() => handleCompleteMaintenance(item)}
                          disabled={actionLoadingId === item._id}
                          className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 transition-colors inline-flex items-center space-x-1 disabled:opacity-50"
                          title="Complete Servicing & Reset Risk"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Certify Service</span>
                        </button>
                      ) : (
                        <button
                          id={`btn-schedule-maint-${item.equipment_id.toLowerCase()}`}
                          onClick={() => handleScheduleMaintenance(item)}
                          disabled={actionLoadingId === item._id}
                          className="px-2.5 py-1 text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-lg text-xs font-bold border border-brand-200 transition-colors inline-flex items-center space-x-1 disabled:opacity-50"
                          title="Schedule Maintenance Task"
                        >
                          <Wrench className="w-3 h-3 text-brand-700" />
                          <span>Schedule</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Detail & Failure Chart Modal */}
      {selectedEquipment && (
        <EquipmentDetailModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onRefresh={() => {
            fetchEquipment();
            setSelectedEquipment(null);
          }}
        />
      )}
    </div>
  );
}
