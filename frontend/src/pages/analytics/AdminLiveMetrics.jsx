import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ticket,
  FileText,
  Building,
  Wrench,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

export default function AdminLiveMetrics() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (resData.success) {
        setData(resData.analytics);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching live analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 8000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading && !data) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  const { complaints, queues, services, resources, maintenance } = data || {};

  return (
    <div className="space-y-8" id="admin-live-metrics-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
              Campus Intelligence Operations
            </span>
            <span className="text-xs text-emerald-600 font-bold flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
              Live Telemetry
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Campus Operations &amp; Performance KPIs
          </h2>
          <p className="text-xs text-slate-500">
            Real-time cross-functional metrics across student services, queue throughput, facilities, and maintenance health
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 5 High-Level KPI Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Complaints Tile */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Complaints</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {complaints?.resolutionRate}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Resolution Rate ({complaints?.resolved}/{complaints?.total} resolved)
          </p>
          <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${complaints?.resolutionRate || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Queues Tile */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Live Queues</span>
            <Ticket className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-900">
            {queues?.totalWaiting}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Students in line across {queues?.activeDesks} active desks
          </p>
          <div className="mt-3 text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded text-center">
            {queues?.totalServing} serving now &bull; {queues?.totalCompleted} completed
          </div>
        </div>

        {/* Service Hub Tile */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Service Hub</span>
            <FileText className="w-4 h-4 text-brand-800" />
          </div>
          <p className="text-3xl font-black text-brand-900">
            {services?.totalRequests}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Student applications processed
          </p>
          <div className="mt-3 text-[10px] text-slate-600 font-semibold flex justify-between">
            <span className="text-emerald-700">{services?.completed} Ready</span>
            <span className="text-amber-700">{services?.inProgress} In-flight</span>
          </div>
        </div>

        {/* Resource Utilization Tile */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Venues &amp; Labs</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-900">
            {resources?.utilizationRate}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Facility utilization ({resources?.activeBookingsToday} booked today)
          </p>
          <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${resources?.utilizationRate || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Maintenance Health Index Tile */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Asset Health</span>
            <Wrench className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-900">
            {maintenance?.healthIndex}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Infrastructure Health Score
          </p>
          <div className="mt-3 text-[10px] font-bold text-red-700 flex items-center justify-between">
            <span>{maintenance?.criticalCount} Critical</span>
            <span className="text-amber-700">{maintenance?.highRiskCount} High Risk</span>
          </div>
        </div>
      </div>

      {/* Queue Traffic Volume Across LPU Offices */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Ticket className="w-4 h-4 text-brand-800" />
            <h3 className="text-sm font-black text-slate-900">
              Live Queue Desk Throughput by LPU Office
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Telemetry from Module 3 QueuePredictor Engine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Office Name</th>
                <th className="px-6 py-3">Desk Prefix</th>
                <th className="px-6 py-3">Active Counters</th>
                <th className="px-6 py-3">Now Serving</th>
                <th className="px-6 py-3">Students Waiting</th>
                <th className="px-6 py-3">Estimated Next Wait</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queues?.offices?.map((off) => (
                <tr key={off.office} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-900">
                    {off.office}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold px-2 py-0.5 bg-brand-50 text-brand-900 rounded border border-brand-200">
                      Desk {off.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {off.activeCounters} open
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-brand-800">
                    {off.currentlyServing}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {off.waitingStudents} in line
                  </td>
                  <td className="px-6 py-4 font-semibold text-amber-700">
                    ~{off.estimatedWaitMinutes} minutes
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
