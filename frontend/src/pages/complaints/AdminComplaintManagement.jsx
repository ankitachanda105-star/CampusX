import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Edit,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

export default function AdminComplaintManagement() {
  const { token, user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Reassign Modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [targetComplaint, setTargetComplaint] = useState(null);
  const [targetDept, setTargetDept] = useState('');
  const [targetStaff, setTargetStaff] = useState('');
  const [reassignNote, setReassignNote] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const fetchAllComplaints = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (selectedDept !== 'All') params.append('department', selectedDept);
      if (selectedStatus !== 'All') params.append('status', selectedStatus);
      if (selectedPriority !== 'All') params.append('priority', selectedPriority);
      if (selectedBlock !== 'All') params.append('block', selectedBlock);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/complaints/all?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch complaints');
      }

      setComplaints(data.complaints || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllComplaints();
    }
  }, [token, selectedDept, selectedStatus, selectedPriority, selectedBlock]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllComplaints();
  };

  const openReassignModal = (complaint) => {
    setTargetComplaint(complaint);
    setTargetDept(complaint.department);
    setTargetStaff(complaint.assignedStaffName || '');
    setReassignNote('');
    setReassignModalOpen(true);
  };

  const handleExecuteReassign = async (e) => {
    e.preventDefault();
    if (!targetDept) return;

    try {
      setReassigning(true);
      setError('');

      const res = await fetch(`/api/complaints/${targetComplaint.complaintId}/reassign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          department: targetDept,
          assignedStaffName: targetStaff,
          note: reassignNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reassign complaint');
      }

      setSuccessMsg(`Complaint #${targetComplaint.complaintId} reassigned to ${targetDept}.`);
      setReassignModalOpen(false);
      setTargetComplaint(null);
      await fetchAllComplaints();
    } catch (err) {
      setError(err.message || 'Failed to reassign complaint.');
    } finally {
      setReassigning(false);
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
              Campus Operations Complaint Management
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Admin Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time university-wide complaint ledger, multi-filter triage, and cross-department reassignment.
          </p>
        </div>

        <button
          onClick={fetchAllComplaints}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Table</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, keyword, student name or reg no..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-800 text-white rounded-xl text-xs font-bold hover:bg-brand-900 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="All">All Departments</option>
              {CAMPUS_CONFIG.departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Block / Location Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Campus Block / Hostel
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="All">All Locations</option>
              {CAMPUS_CONFIG.academicBlocks.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              {CAMPUS_CONFIG.hostels.boys.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading university complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">No complaints matching selected filters.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Ticket ID</th>
                <th className="py-3 px-3">Title & Location</th>
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {complaints.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-black text-brand-800">
                    #{c.complaintId}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{c.title}</div>
                    <div className="text-[11px] text-slate-500">{c.location}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-800 font-semibold">{c.studentName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{c.studentRegNo}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {c.category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded border font-semibold ${getPriorityBadge(c.priority)}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {c.department}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      id={`reassign-btn-${c.complaintId}`}
                      onClick={() => openReassignModal(c)}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-brand-800 hover:bg-brand-50 border border-brand-200 transition-colors"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Reassign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModalOpen && targetComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-900">
                Reassign Ticket #{targetComplaint.complaintId}
              </h3>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteReassign} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                >
                  {CAMPUS_CONFIG.departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assign Staff Member (Optional)
                </label>
                <input
                  type="text"
                  value={targetStaff}
                  onChange={(e) => setTargetStaff(e.target.value)}
                  placeholder="e.g. Dr. Eleanor Vance or Marcus Ward"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reassignment Reason / Note
                </label>
                <textarea
                  rows="2"
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  placeholder="e.g. Requires electrical specialist rather than IT support..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  className="px-4 py-2 rounded-xl text-white font-bold bg-brand-800 hover:bg-brand-900 transition-colors"
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
