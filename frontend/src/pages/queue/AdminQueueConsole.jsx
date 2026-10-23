import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Clock,
  Play,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Sliders,
  History,
  Building
} from 'lucide-react';

const OFFICES = [
  'Accounts Office',
  'Examination Cell',
  'Student Welfare Office',
];

export default function AdminQueueConsole() {
  const { token, user } = useAuth();
  const [selectedOffice, setSelectedOffice] = useState('Accounts Office');
  const [consoleData, setConsoleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const [message, setMessage] = useState(null);

  // Config modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configCounters, setConfigCounters] = useState(2);
  const [configDuration, setConfigDuration] = useState(8);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchConsoleData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/queues/console/${encodeURIComponent(selectedOffice)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setConsoleData(data);
        setConfigCounters(data.office.activeCounters);
        setConfigDuration(data.office.avgServiceDuration);
      }
    } catch (err) {
      console.error('Error fetching queue console:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsoleData();
    const interval = setInterval(fetchConsoleData, 5000);
    return () => clearInterval(interval);
  }, [token, selectedOffice]);

  const handleCallNext = async () => {
    setCallingNext(true);
    setMessage(null);
    try {
      const res = await fetch('http://localhost:5000/api/queues/call-next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ office: selectedOffice }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: data.servingToken
            ? `Successfully called Token ${data.servingToken.tokenCode} (${data.servingToken.studentName})!`
            : data.message,
        });
        await fetchConsoleData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to call next token.' });
    } finally {
      setCallingNext(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('http://localhost:5000/api/queues/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          office: selectedOffice,
          activeCounters: Number(configCounters),
          avgServiceDuration: Number(configDuration),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Configuration for ${selectedOffice} saved.` });
        setShowConfigModal(false);
        await fetchConsoleData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration.' });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Office Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2">
          {OFFICES.map((off) => (
            <button
              key={off}
              id={`console-tab-${off.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => {
                setSelectedOffice(off);
                setMessage(null);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                selectedOffice === off
                  ? 'bg-brand-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {off}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Counter Settings</span>
          </button>

          <button
            onClick={fetchConsoleData}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action / Alert Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Main Operations Card */}
      {consoleData && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                Service Desk Console
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {consoleData.office.office} (Desk {consoleData.office.code})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active Counters: <span className="font-bold text-slate-700">{consoleData.office.activeCounters}</span> &bull; Avg Service Time: <span className="font-bold text-slate-700">{consoleData.office.avgServiceDuration} mins</span>
              </p>
            </div>

            {/* Prominent Call Next Button */}
            <div className="flex items-center space-x-4">
              <button
                id="btn-call-next"
                onClick={handleCallNext}
                disabled={callingNext || consoleData.stats.totalWaiting === 0}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-emerald-700/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              >
                {callingNext ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Megaphone className="w-5 h-5 text-emerald-200" />
                    <span>CALL NEXT STUDENT</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-brand-900 text-white">
              <p className="text-[10px] font-bold text-gold-400 uppercase tracking-wider">
                Now Serving
              </p>
              <p id="admin-current-serving" className="text-3xl font-black font-mono mt-1">
                {consoleData.office.currentServingToken || 'Idle'}
              </p>
              <p className="text-[11px] text-brand-200 mt-0.5">
                Counter Desk {consoleData.office.code}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                In Queue (Waiting)
              </p>
              <p id="admin-waiting-count" className="text-3xl font-black text-slate-900 mt-1">
                {consoleData.stats.totalWaiting}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Students in line
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                Estimated Queue Wait
              </p>
              <p className="text-3xl font-black text-amber-900 mt-1">
                ~{consoleData.stats.estimatedNextWait}m
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Based on active counters
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Served Today
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {consoleData.stats.totalCompleted}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Completed tokens
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Waiting Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-brand-800" />
            <h3 className="text-sm font-black text-slate-900">
              Live Waiting Queue ({consoleData?.waitingTokens?.length || 0} students)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Proximity notifications triggered for top 3 positions
          </span>
        </div>

        {consoleData?.waitingTokens?.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No students currently waiting in this queue. All caught up!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Position</th>
                  <th className="px-6 py-3">Token</th>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Reg No</th>
                  <th className="px-6 py-3">Joined Time</th>
                  <th className="px-6 py-3">Notification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consoleData?.waitingTokens?.map((t, idx) => {
                  const isTopThree = idx < 3;
                  return (
                    <tr
                      key={t._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTopThree ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">
                        #{idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-black text-sm px-2.5 py-1 bg-brand-50 text-brand-900 rounded-lg border border-brand-200">
                          {t.tokenCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {t.studentName}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {t.studentRegNo}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(t.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4">
                        {isTopThree ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            ★ In-App Alert Sent (Top 3)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Queued ({idx - 2} away from alert)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Counter Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-brand-800" />
                <h3 className="text-base font-black text-slate-900">
                  Configure {selectedOffice}
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Active Service Counters
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={configCounters}
                  onChange={(e) => setConfigCounters(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Number of active physical desks servicing this line concurrently.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Average Service Duration (Minutes / Student)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={configDuration}
                  onChange={(e) => setConfigDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Used by the ML / predictor stub: (peopleAhead × duration) / counters
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 rounded-xl shadow-sm"
                >
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
