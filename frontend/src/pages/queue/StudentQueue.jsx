import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import {
  Users,
  Clock,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Building,
  Sparkles,
  ArrowRight,
  BellRing,
  Info
} from 'lucide-react';

export default function StudentQueue() {
  const { token, user } = useAuth();
  const [offices, setOffices] = useState([]);
  const [activeTokenData, setActiveTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joiningOffice, setJoiningOffice] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchOfficesAndToken = async () => {
    try {
      // 1. Fetch offices
      const officesRes = await fetch('/api/queues/offices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const officesData = await officesRes.json();
      if (officesData.success) {
        setOffices(officesData.offices);
      }

      // 2. Fetch student's active token
      const tokenRes = await fetch('/api/queues/my-token', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tokenData = await tokenRes.json();
      if (tokenData.success && tokenData.hasActiveToken) {
        setActiveTokenData(tokenData);
      } else {
        setActiveTokenData(null);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching queue status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficesAndToken();
    const interval = setInterval(fetchOfficesAndToken, 6000);
    return () => clearInterval(interval);
  }, [token]);

  const handleJoinQueue = async (officeName) => {
    setJoiningOffice(officeName);
    setMessage(null);
    try {
      const res = await fetch('/api/queues/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ office: officeName }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await fetchOfficesAndToken();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to join queue.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error joining queue.' });
    } finally {
      setJoiningOffice(null);
    }
  };

  const handleCancelToken = async () => {
    if (!activeTokenData?.token?._id) return;
    if (!window.confirm('Are you sure you want to cancel your current token? You will forfeit your position.')) {
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch('/api/queues/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tokenId: activeTokenData.token._id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'info', text: 'Your virtual token has been cancelled.' });
        await fetchOfficesAndToken();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error cancelling token.' });
    } finally {
      setCancelling(false);
    }
  };

  if (loading && offices.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isWithinThree = activeTokenData && activeTokenData.peopleAhead <= 3 && activeTokenData.token?.status === 'Waiting';
  const isServingNow = activeTokenData && activeTokenData.token?.status === 'Serving';

  return (
    <div className="space-y-8">
      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : message.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Info className="w-5 h-5 text-blue-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Proximity Alert Toast */}
      {isWithinThree && (
        <div
          id="queue-proximity-alert"
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-gold-500 text-white shadow-lg shadow-amber-500/20 flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BellRing className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-base tracking-tight">
                Hurry Up! You are within 3 positions of being served!
              </h4>
              <p className="text-xs text-amber-100">
                Only {activeTokenData.peopleAhead === 0 ? 'Nobody' : `${activeTokenData.peopleAhead} person(s)`} ahead of you at {activeTokenData.token.office}. Please head toward the desk.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-white text-amber-900 font-black text-xs rounded-lg uppercase tracking-wider">
            Near Counter
          </span>
        </div>
      )}

      {/* Active Token Live Status Card */}
      {activeTokenData && (
        <div id="live-token-status-card" className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-50 to-gold-50 rounded-bl-full pointer-events-none -z-0"></div>

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-800 text-white flex items-center justify-center font-black shadow-md shadow-brand-900/20">
                  <Ticket className="w-6 h-6 text-gold-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                      Active Queue Token
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isServingNow
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isServingNow ? '● Currently Being Served' : 'Waiting in Line'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {activeTokenData.token.office}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchOfficesAndToken}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Refresh Queue Status"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Auto-updating
                </button>
                <button
                  onClick={handleCancelToken}
                  disabled={cancelling || isServingNow}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Leave Queue
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-6">
              {/* Your Token */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-brand-900 to-brand-800 text-white shadow-md">
                <p className="text-[11px] font-bold text-gold-400 uppercase tracking-wider mb-1">
                  Your Virtual Token
                </p>
                <p id="student-token-code" className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                  {activeTokenData.token.tokenCode}
                </p>
                <p className="text-[11px] text-brand-200 mt-1">
                  Reg: {activeTokenData.token.studentRegNo}
                </p>
              </div>

              {/* Currently Serving */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Currently Serving
                </p>
                <p id="currently-serving-token" className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 font-mono">
                  {activeTokenData.currentlyServing || '—'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {activeTokenData.activeCounters} counter(s) open
                </p>
              </div>

              {/* People Ahead */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  People Ahead
                </p>
                <p id="people-ahead-count" className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  {activeTokenData.peopleAhead}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {activeTokenData.peopleAhead === 0 ? 'You are next!' : `${activeTokenData.peopleAhead} ahead in queue`}
                </p>
              </div>

              {/* Estimated Wait */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Estimated Wait
                  </p>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                    ML Stub
                  </span>
                </div>
                <p id="estimated-wait-minutes" className="text-3xl sm:text-4xl font-black tracking-tight text-amber-900">
                  ~{activeTokenData.estimatedWait} <span className="text-base font-semibold">min</span>
                </p>
                <p className="text-[10px] text-amber-700 mt-1">
                  Formula: (ahead × {activeTokenData.avgServiceDuration}m) / {activeTokenData.activeCounters}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Service Counters / Join Queue Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              LPU Administrative Service Counters
            </h3>
            <p className="text-xs text-slate-500">
              Pick an administrative office to join their live virtual queue and receive a token
            </p>
          </div>
          <span className="text-xs text-slate-400 mt-2 sm:mt-0">
            Last sync: {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {offices.map((off) => {
            const hasActiveHere = activeTokenData && activeTokenData.token?.office === off.office;

            return (
              <div
                key={off.office}
                className={`bg-white rounded-2xl p-6 border transition-all duration-200 flex flex-col justify-between ${
                  hasActiveHere
                    ? 'border-brand-800 ring-2 ring-brand-800/10 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center font-mono font-bold text-sm border border-brand-200">
                      {off.code}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {off.activeCounters} Active Counter{off.activeCounters > 1 ? 's' : ''}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900 mb-1">
                    {off.office}
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Avg Service Time: <span className="font-semibold text-slate-700">{off.avgServiceDuration} mins/student</span>
                  </p>

                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Currently Serving:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {off.currentServingToken || 'None (Idle)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Students Waiting:</span>
                      <span className="font-bold text-brand-800">
                        {off.waitingCount} in queue
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next Estimated Wait:</span>
                      <span className="font-semibold text-amber-700">
                        ~{off.estimatedWait} mins
                      </span>
                    </div>
                  </div>
                </div>

                {hasActiveHere ? (
                  <div className="w-full py-2.5 px-4 bg-brand-50 border border-brand-200 text-brand-900 text-center rounded-xl font-bold text-xs">
                    ✓ You hold Token {activeTokenData.token.tokenCode}
                  </div>
                ) : (
                  <button
                    id={`join-queue-${off.code.toLowerCase()}`}
                    onClick={() => handleJoinQueue(off.office)}
                    disabled={joiningOffice === off.office || !!activeTokenData}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {joiningOffice === off.office ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Get Virtual Token</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
