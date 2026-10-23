import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Plus,
  Calendar,
  Layers,
  FileText,
  X
} from 'lucide-react';

export default function EquipmentDetailModal({ equipment, onClose, onRefresh }) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'failures' | 'tasks' | 'log-failure'

  // Manual failure log state
  const [issueText, setIssueText] = useState('');
  const [complaintIdText, setComplaintIdText] = useState('');
  const [submittingFailure, setSubmittingFailure] = useState(false);
  const [logSuccess, setLogSuccess] = useState(null);

  if (!equipment) return null;

  const handleManualFailureSubmit = async (e) => {
    e.preventDefault();
    if (!issueText.trim()) return;

    setSubmittingFailure(true);
    try {
      const res = await fetch(`http://localhost:5000/api/maintenance/equipment/${equipment._id}/failures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issue: issueText.trim(),
          complaintId: complaintIdText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLogSuccess('Failure incident successfully logged. Risk score updated.');
        setIssueText('');
        setComplaintIdText('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Error logging failure:', err);
    } finally {
      setSubmittingFailure(false);
    }
  };

  const monthlyData = equipment.monthlyFailures || [
    { month: "Apr '26", failures: 0 },
    { month: "May '26", failures: 1 },
    { month: "Jun '26", failures: 0 },
    { month: "Jul '26", failures: 2 },
    { month: "Aug '26", failures: 1 },
    { month: "Sep '26", failures: equipment.failureCount90Days || 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="equipment-detail-modal"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-brand-50 text-brand-900 rounded border border-brand-200">
                {equipment.equipment_id}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  equipment.riskLevel === 'HIGH'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : equipment.riskLevel === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {equipment.riskLevel} RISK ({equipment.riskScore}/100)
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              {equipment.name}
            </h3>
            <p className="text-xs text-slate-500">
              {equipment.type} &bull; Parent:{' '}
              <strong className="text-slate-700">
                {equipment.parent_resource?.name || 'Classroom / Lab'}
              </strong>{' '}
              ({equipment.parent_resource?.block || 'Academic Block'})
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center space-x-2 my-4 border-b border-slate-100 pb-2 text-xs">
          <button
            id="tab-modal-chart"
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'chart'
                ? 'bg-brand-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Failure Trend (Recharts)
          </button>
          <button
            id="tab-modal-failures"
            onClick={() => setActiveTab('failures')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'failures'
                ? 'bg-brand-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Failure Log ({equipment.failure_history?.length || 0})
          </button>
          <button
            id="tab-modal-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'tasks'
                ? 'bg-brand-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Maintenance Tasks ({equipment.maintenance_tasks?.length || 0})
          </button>
          <button
            id="tab-modal-log"
            onClick={() => setActiveTab('log-failure')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'log-failure'
                ? 'bg-brand-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            + Log Incident
          </button>
        </div>

        {/* TAB 1: RECHARTS FAILURE FREQUENCY HISTOGRAM */}
        {activeTab === 'chart' && (
          <div className="space-y-4" id="recharts-failure-container">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700">
                  Month-by-Month Failure Frequency (Last 6 Months)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {equipment.failureCount90Days} failure(s) in last 90 days
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                      formatter={(val) => [`${val} Incident(s)`, 'Breakdowns']}
                    />
                    <Bar dataKey="failures" fill="#7a1c2d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Factor Breakdown Card */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white border border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Overdue Days</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {equipment.daysSinceLastMaintenance || 0} days
                </p>
                <p className="text-[10px] text-slate-500">Since certified service</p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Operating Age</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {equipment.ageInMonths || 0} mos
                </p>
                <p className="text-[10px] text-slate-500">Rated: {equipment.expected_life_months || 120} mos</p>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
                <p className="text-lg font-black text-brand-800 mt-0.5 truncate">
                  {equipment.status}
                </p>
                <p className="text-[10px] text-slate-500">Current Health</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FAILURE HISTORY TABLE (LINKED COMPLAINTS) */}
        {activeTab === 'failures' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800">
              Audit Breakdown Log (Module 2 Complaints &amp; Manual Incidents)
            </h4>
            {(!equipment.failure_history || equipment.failure_history.length === 0) ? (
              <p className="text-xs text-slate-400 py-6 text-center">No failure incidents recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Ref Ticket / ID</th>
                      <th className="pb-2">Issue Diagnostic</th>
                      <th className="pb-2">Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipment.failure_history.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 text-slate-600">
                          {new Date(f.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-mono font-bold text-brand-900">
                          {f.complaintId || 'MANUAL'}
                        </td>
                        <td className="py-2.5 text-slate-800">{f.issue}</td>
                        <td className="py-2.5 text-[11px] text-slate-400">{f.loggedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MAINTENANCE TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800">
              Scheduled &amp; Certified Maintenance Orders
            </h4>
            {(!equipment.maintenance_tasks || equipment.maintenance_tasks.length === 0) ? (
              <p className="text-xs text-slate-400 py-6 text-center">No maintenance tasks scheduled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="pb-2">Task ID</th>
                      <th className="pb-2">Scheduled</th>
                      <th className="pb-2">Department</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Technician Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipment.maintenance_tasks.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-mono font-bold text-slate-900">{t.taskId}</td>
                        <td className="py-2.5 text-slate-600">
                          {new Date(t.scheduledDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-slate-700">{t.department}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600 text-[11px]">{t.technicianNotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MANUAL FAILURE LOGGING */}
        {activeTab === 'log-failure' && (
          <form onSubmit={handleManualFailureSubmit} className="space-y-4 text-xs">
            {logSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{logSuccess}</span>
              </div>
            )}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Failure Diagnostic / Issue Description *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Fan motor overheating, abnormal vibration, blown fuse..."
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Optional Reference / Complaint Ticket ID
              </label>
              <input
                type="text"
                placeholder="e.g. CX2188"
                value={complaintIdText}
                onChange={(e) => setComplaintIdText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={submittingFailure}
              className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submittingFailure ? 'Logging...' : 'Record Failure & Recalculate Risk'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
