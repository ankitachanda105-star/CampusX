import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  MapPin,
  User,
  Check,
  Play,
  MessageSquare,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export default function StaffAssignedComplaints() {
  const { token, user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAssignedComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/complaints/assigned', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch complaints');
      }
      setComplaints(data.complaints || []);
      setDepartment(data.department || user?.department || 'My Department');
    } catch (err) {
      setError(err.message || 'Failed to fetch assigned complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssignedComplaints();
    }
  }, [token]);

  const handleUpdateStatus = async (complaintId, newStatus, customNote = '') => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          note: customNote || (newStatus === 'In Progress' ? 'Accepted ticket and initiated diagnosis.' : 'Resolved issue and restored functionality.'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update ticket status');
      }

      setSuccessMsg(`Ticket #${complaintId} marked as '${newStatus}'.`);
      setNoteText('');
      setSelectedComplaint(null);
      await fetchAssignedComplaints();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNoteOnly = async (complaintId) => {
    if (!noteText.trim()) return;
    try {
      setActionLoading(true);
      setError('');

      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: selectedComplaint.status,
          note: noteText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add update note');
      }

      setSuccessMsg(`Progress note added to #${complaintId}.`);
      setNoteText('');
      setSelectedComplaint(null);
      await fetchAssignedComplaints();
    } catch (err) {
      setError(err.message || 'Failed to add note.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Assigned':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Submitted':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-600 text-white';
      case 'High':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              Department Assigned Complaints
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {department}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Incoming operational issues dispatched to your department by the CampusX AI system.
          </p>
        </div>

        <button
          onClick={fetchAssignedComplaints}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Notifications */}
      {successMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Modal for Adding Note or Resolving */}
      {selectedComplaint && (
        <div className="mb-6 p-5 rounded-2xl bg-slate-50 border-2 border-brand-800/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Take Action on Ticket #{selectedComplaint.complaintId}: "{selectedComplaint.title}"
            </h3>
            <button
              onClick={() => { setSelectedComplaint(null); setNoteText(''); }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Add Work Note / Resolution Details:
            </label>
            <textarea
              rows="2"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Technician dispatched, cable replaced, rebooted switch..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
            ></textarea>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedComplaint.status !== 'In Progress' && selectedComplaint.status !== 'Resolved' && (
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(selectedComplaint.complaintId, 'In Progress', noteText)}
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Accept & Mark In Progress
              </button>
            )}

            {selectedComplaint.status !== 'Resolved' && (
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(selectedComplaint.complaintId, 'Resolved', noteText)}
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Mark Resolved
              </button>
            )}

            {noteText.trim() && (
              <button
                disabled={actionLoading}
                onClick={() => handleAddNoteOnly(selectedComplaint.complaintId)}
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Save Note Only
              </button>
            )}
          </div>
        </div>
      )}

      {/* Complaints List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading department complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No active complaints for {department}</h3>
          <p className="text-xs text-slate-500 mt-1">All tickets currently addressed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c._id}
              className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    #{c.complaintId}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">{c.title}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(c.status)}`}>
                    {c.status}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getPriorityBadge(c.priority)}`}>
                    {c.priority} Priority
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700">
                {c.description}
              </div>

              {/* Location & Reporter Info */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center text-slate-700 font-semibold">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-brand-800" />
                  {c.location}
                </span>
                <span>&bull;</span>
                <span className="flex items-center">
                  <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Student: {c.studentName} {c.studentRegNo && `(${c.studentRegNo})`}
                </span>
                <span>&bull;</span>
                <span className="flex items-center text-slate-400">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500">
                  Assigned Staff: <strong className="text-slate-800">{c.assignedStaffName || 'Unassigned'}</strong>
                </div>

                <div className="flex items-center space-x-2">
                  {c.status === 'Assigned' && (
                    <button
                      id={`accept-btn-${c.complaintId}`}
                      onClick={() => handleUpdateStatus(c.complaintId, 'In Progress')}
                      disabled={actionLoading}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Accept Ticket
                    </button>
                  )}

                  {c.status !== 'Resolved' && (
                    <button
                      id={`resolve-btn-${c.complaintId}`}
                      onClick={() => setSelectedComplaint(c)}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Resolve / Add Note
                    </button>
                  )}

                  {c.status === 'Resolved' && (
                    <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
