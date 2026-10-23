import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
  Building,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function StaffServiceApprovalQueue() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('In Progress');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal State
  const [activeRequest, setActiveRequest] = useState(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchQueue = async () => {
    try {
      let url = '/api/services/admin/queue?';
      if (statusFilter !== 'All') {
        url += `status=${encodeURIComponent(statusFilter)}&`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Error fetching approval queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 6000);
    return () => clearInterval(interval);
  }, [token, statusFilter]);

  const handleReviewAction = async (actionType) => {
    if (!activeRequest) return;
    if (actionType === 'Rejected' && (!reviewRemark || !reviewRemark.trim())) {
      alert('Please enter a rejection reason/remark explaining why the request is rejected.');
      return;
    }

    setProcessingAction(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/services/${activeRequest._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: actionType,
          remark: reviewRemark.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Request ${activeRequest.requestId} ${actionType === 'Approved' ? 'approved' : 'rejected'} successfully.`,
        });
        setActiveRequest(null);
        setReviewRemark('');
        await fetchQueue();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error processing review.' });
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.requestId?.toLowerCase().includes(q) ||
      r.studentName?.toLowerCase().includes(q) ||
      r.studentRegNo?.toLowerCase().includes(q) ||
      r.serviceName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Student Service Approval Desk
          </h2>
          <p className="text-xs text-slate-500">
            Verify submitted student documents, endorse clearance stages, and issue certificates
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Reg No or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 w-48"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white"
          >
            <option value="In Progress">Pending Review (In Progress)</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
            <option value="All">All Statuses</option>
          </select>

          <button
            onClick={fetchQueue}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
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

      {/* Approval Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No service applications currently match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Request ID</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Student Name & Reg No</th>
                  <th className="px-6 py-3">Current Stage</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 bg-brand-50 text-brand-900 rounded-lg border border-brand-200">
                        {req.requestId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{req.serviceName}</p>
                      <p className="text-[10px] text-slate-400">{req.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{req.studentName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{req.studentRegNo}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {req.currentStage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setActiveRequest(req);
                          setReviewRemark('');
                        }}
                        className="px-3 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                      >
                        Review Stage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono font-bold text-xs text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {activeRequest.requestId}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Review: {activeRequest.serviceName}
                </h3>
              </div>
              <button
                onClick={() => setActiveRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              {/* Applicant Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{activeRequest.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registration / Emp ID:</span>
                  <span className="font-mono font-semibold text-slate-900">{activeRequest.studentRegNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Email:</span>
                  <span className="text-slate-700">{activeRequest.studentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Application Purpose:</span>
                  <span className="font-semibold text-slate-900 max-w-xs text-right">
                    {activeRequest.purpose}
                  </span>
                </div>
                {activeRequest.documentUrl && (
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Uploaded Document:</span>
                    <a
                      href={`${activeRequest.documentUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-brand-800 hover:text-brand-900 font-bold underline"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      {activeRequest.documentOriginalName || 'Download File'}
                    </a>
                  </div>
                )}
              </div>

              {/* Current Stage Indicator */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                    Current Evaluation Stage
                  </p>
                  <p className="text-sm font-black text-amber-900">
                    {activeRequest.currentStage} (Stage {activeRequest.currentStageIndex + 1} of {activeRequest.stages.length})
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                  Action Required
                </span>
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Staff Evaluation Remark / Reason
                </label>
                <textarea
                  rows="2"
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  placeholder="e.g. Identity documents verified. Approved to proceed to HOD... (Mandatory if rejecting)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              {/* Decision Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleReviewAction('Rejected')}
                  disabled={processingAction}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center space-x-1"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Reject Request</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveRequest(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewAction('Approved')}
                    disabled={processingAction}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Approve Stage &amp; Advance &rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
