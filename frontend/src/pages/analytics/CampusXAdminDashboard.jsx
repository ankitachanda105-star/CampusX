import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ticket,
  FileCheck2,
  Building,
  Wrench,
  ShieldAlert,
  Users,
  UserCheck,
  RefreshCw,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import AIInsightsPanel from '../../components/AIInsightsPanel';

export default function CampusXAdminDashboard({ onNavigateTab }) {
  const { token, user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d'); // 'today' | '7d' | '30d'
  const [selectedDept, setSelectedDept] = useState('All');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/dashboard?timeRange=${timeRange}&`;
      if (selectedDept !== 'All') {
        url += `department=${encodeURIComponent(selectedDept)}&`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(resJson);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error fetching admin dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, selectedDept, token]);

  const metrics = data?.metrics || {
    activeComplaints: 0,
    pendingServiceRequests: 0,
    todayTokensIssued: 0,
    currentQueueLoadPercent: 0,
    resolvedToday: 0,
    overallResourceUtilization: 0,
    equipmentAtHighRisk: 0,
  };

  const charts = data?.charts || {
    complaintsByDepartment: [],
    complaintVolumeTrend: [],
    complaintStatusBreakdown: [],
    resourceUtilizationByBlock: [],
  };

  const superAdmin = data?.superAdmin || {
    userRoleSummary: [],
    departmentStaffCount: [],
  };

  const isSuperAdmin = user?.role === 'Super Admin';

  return (
    <div className="space-y-8" id="campusx-admin-dashboard-root">
      {/* 1. Header & Dynamic Filter Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
                Module 7 &bull; Central Operations
              </span>
              <span className="text-xs text-emerald-600 font-bold flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
                Live MongoDB Telemetry
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              Campus Intelligence &amp; Performance Telemetry
            </h2>
            <p className="text-xs text-slate-500">
              Aggregated real-time metrics across complaints, queues, services, space utilization, and equipment health
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <span className="text-[11px] text-slate-400 font-medium">
              Updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              id="btn-refresh-dashboard"
              onClick={fetchDashboardData}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-xs"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls: Date Range & Department */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Time Range Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
            <button
              id="filter-range-today"
              onClick={() => setTimeRange('today')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                timeRange === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today (24h)
            </button>
            <button
              id="filter-range-7d"
              onClick={() => setTimeRange('7d')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                timeRange === '7d'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              id="filter-range-30d"
              onClick={() => setTimeRange('30d')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                timeRange === '30d'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Department Dropdown */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="select-dashboard-dept"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-800"
            >
              <option value="All">All University Departments</option>
              {CAMPUS_CONFIG.departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. 7 Live Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" id="kpi-metric-cards-grid">
        {/* 1. Active Complaints */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tickets</p>
          <p id="metric-active-complaints" className="text-2xl font-black text-slate-900 mt-1">
            {metrics.activeComplaints}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Status != Resolved</p>
        </div>

        {/* 2. Pending Service Requests */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Services</p>
          <p id="metric-pending-services" className="text-2xl font-black text-brand-800 mt-1">
            {metrics.pendingServiceRequests}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">In Pipeline</p>
        </div>

        {/* 3. Today's Tokens Issued */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today Tokens</p>
          <p id="metric-today-tokens" className="text-2xl font-black text-slate-900 mt-1">
            {metrics.todayTokensIssued}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Queue Intake</p>
        </div>

        {/* 4. Current Queue Load % */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          metrics.currentQueueLoadPercent >= 75
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Queue Load</p>
          <p id="metric-queue-load" className="text-2xl font-black mt-1">
            {metrics.currentQueueLoadPercent}%
          </p>
          <p className="text-[10px] opacity-75 mt-0.5">
            {metrics.waitingTokens || 0} Waiting Students
          </p>
        </div>

        {/* 5. Resolved Today */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved Today</p>
          <p id="metric-resolved-today" className="text-2xl font-black text-emerald-600 mt-1">
            {metrics.resolvedToday}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Tickets Closed</p>
        </div>

        {/* 6. Overall Resource Utilization % */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Utilization</p>
          <p id="metric-resource-utilization" className="text-2xl font-black text-purple-700 mt-1">
            {metrics.overallResourceUtilization}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Campus Venues</p>
        </div>

        {/* 7. Equipment at High Risk */}
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-xs">
          <p className="text-[10px] font-bold text-red-900 uppercase tracking-wider flex items-center">
            <ShieldAlert className="w-3 h-3 mr-1 text-red-600" />
            High Risk Assets
          </p>
          <p id="metric-high-risk-equipment" className="text-2xl font-black text-red-900 mt-1">
            {metrics.equipmentAtHighRisk}
          </p>
          <p className="text-[10px] text-red-700 mt-0.5">Score &ge; 70 Alerts</p>
        </div>
      </div>

      {/* 3. AI Insights Panel (Phase 5 Live Rules & Anomaly Feed) */}
      <AIInsightsPanel insights={data?.insights || []} onNavigateTab={onNavigateTab} />

      {/* 4. Interactive Recharts Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-recharts-grid">
        {/* Chart 1: Complaints by Department (Multi-bar) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Complaints by Department</h3>
              <p className="text-xs text-slate-400">Active vs Resolved distribution</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              Bar Chart
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.complaintsByDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortName" angle={-15} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="active" name="Active Tickets" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Complaint Volume Over Selected Time Range (Line Chart) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Complaint Intake Volume Trend</h3>
              <p className="text-xs text-slate-400">Daily incident registration over time</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              Line Chart
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.complaintVolumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }} />
                <Line type="monotone" dataKey="complaints" name="Complaints" stroke="#7a1c2d" strokeWidth={3} dot={{ r: 4, fill: '#7a1c2d' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Complaint Status Breakdown (Donut Chart) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Complaint Lifecycle Status Breakdown</h3>
              <p className="text-xs text-slate-400">Resolution lifecycle pipeline ratio</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              Donut Chart
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {charts.complaintStatusBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400">No complaints registered in selected time range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.complaintStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {charts.complaintStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Resource Utilization by Block (Bar Chart) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Space Utilization by LPU Block</h3>
              <p className="text-xs text-slate-400">30-day occupancy ratio per academic block</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              Bar Chart
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.resourceUtilizationByBlock} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="block" angle={-15} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis unit="%" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }} formatter={(val) => [`${val}%`, 'Utilization']} />
                <Bar dataKey="utilization" name="Utilization %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Super Admin Exclusive Governance Section */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-200 shadow-xs space-y-6" id="super-admin-governance-card">
          <div className="flex items-center justify-between pb-4 border-b border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Super Admin Root Authority
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Institutional User &amp; Staff Headcount Governance
                </h3>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-900 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
              Executive View
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Roles Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Total Campus Accounts by Role
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {superAdmin.userRoleSummary.map((r) => (
                  <div key={r.role} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{r.role}</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{r.count}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Registered Identity</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department-wise Staff Headcount */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Department-wise Staff Headcount
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">University Department</th>
                      <th className="py-2.5 px-3 text-right">Active Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {superAdmin.departmentStaffCount.map((dept, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {dept.department}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900">
                          {dept.staffCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
