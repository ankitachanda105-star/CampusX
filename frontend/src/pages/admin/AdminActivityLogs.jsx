import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Layers,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AdminActivityLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableActions, setAvailableActions] = useState([]);

  const fetchLogs = async (currentPage = 1) => {
    setLoading(true);
    try {
      let url = `http://localhost:5000/api/admin/activity-logs?page=${currentPage}&limit=25&`;
      if (selectedAction !== 'All') url += `action=${encodeURIComponent(selectedAction)}&`;
      if (selectedRole !== 'All') url += `userRole=${encodeURIComponent(selectedRole)}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        if (data.availableActions) setAvailableActions(data.availableActions);
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [selectedAction, selectedRole, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'REGISTER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMPLAINT_REASSIGN':
      case 'SERVICE_REJECT':
      case 'RESOURCE_DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'SERVICE_APPROVE':
      case 'MAINTENANCE_CERTIFY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MAINTENANCE_SCHEDULE':
      case 'FAILURE_LOG':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Admin':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Faculty/Staff':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6" id="admin-activity-logs-container">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-800">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-slate-900">Security &amp; Activity Audit Trail</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time audit records of logins, administrative reassignments, service approvals, and maintenance actions.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            Total Logged Events: <strong>{total}</strong>
          </span>
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="filter-log-action"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-800"
            >
              <option value="All">All Sensitive Actions</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-slate-400" />
            <select
              id="filter-log-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-800"
            >
              <option value="All">All User Roles</option>
              <option value="Student">Student</option>
              <option value="Faculty/Staff">Faculty/Staff</option>
              <option value="Admin">Admin</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search user, ID, resource, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-800 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="activity-logs-table">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4 text-right">IP Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-800" />
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No activity logs found matching the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{log.userName}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(
                            log.userRole
                          )}`}
                        >
                          {log.userRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 text-[11px]">
                      {log.target_resource}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total records)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchLogs(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => fetchLogs(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
