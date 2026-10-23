import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Building,
  User,
  Image as ImageIcon,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  FileText
} from 'lucide-react';

export default function MyComplaints({ onNewComplaintClick }) {
  const { token, user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const fetchMyComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/complaints/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load complaints');
      }
      setComplaints(data.complaints || []);
    } catch (err) {
      setError(err.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyComplaints();
    }
  }, [token]);

  const handleSelectComplaint = async (complaint) => {
    setSelectedComplaint(complaint);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/complaints/${complaint.complaintId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedComplaint(data.complaint);
        setUpdates(data.updates || []);
      }
    } catch (err) {
      console.error('Error fetching complaint details:', err);
    } finally {
      setLoadingDetail(false);
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
      {/* Detail View Modal / Section */}
      {selectedComplaint ? (
        <div id="complaint-detail-view" className="animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <button
              onClick={() => setSelectedComplaint(null)}
              className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-brand-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to My Complaints List
            </button>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800">
                #{selectedComplaint.complaintId}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(selectedComplaint.status)}`}>
                {selectedComplaint.status}
              </span>
            </div>
          </div>

          {/* Main Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedComplaint.title}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-800" />
                  <span className="font-semibold text-slate-700">{selectedComplaint.location}</span>
                  <span>&bull;</span>
                  <span>Submitted {new Date(selectedComplaint.createdAt).toLocaleDateString()} at {new Date(selectedComplaint.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Uploaded Image */}
              {selectedComplaint.imageUrl && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center">
                    <ImageIcon className="w-3.5 h-3.5 mr-1" />
                    Attached Photo
                  </h4>
                  <div className="inline-block rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={selectedComplaint.imageUrl}
                      alt="Complaint attachment"
                      className="max-h-64 w-auto object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar / Meta Badges */}
            <div className="space-y-4">
              {/* AI Auto-Classification System Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-50 to-gold-50/50 border border-brand-200/60 shadow-xs">
                <div className="flex items-center space-x-1.5 text-xs font-extrabold text-brand-900 mb-3">
                  <Sparkles className="w-4 h-4 text-gold-600" />
                  <span>System-Classified by AI</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-brand-100">
                    <span className="text-slate-600 font-medium">Category:</span>
                    <span className="font-bold text-slate-900">{selectedComplaint.category}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-brand-100">
                    <span className="text-slate-600 font-medium">Priority:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] border ${getPriorityBadge(selectedComplaint.priority)}`}>
                      {selectedComplaint.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium">Auto-Assigned:</span>
                    <span className="font-bold text-brand-900">{selectedComplaint.department}</span>
                  </div>
                </div>
              </div>

              {/* Assignment Info */}
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Handling Details
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">Department:</span>
                    <div className="font-bold text-slate-800">{selectedComplaint.department}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned Staff:</span>
                    <div className="font-medium text-slate-700">
                      {selectedComplaint.assignedStaffName || 'Pending staff assignment'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Status Update Timeline */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-800" />
              <span>Status Update Timeline & Activity History</span>
            </h3>

            {loadingDetail ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading timeline updates...</div>
            ) : updates.length === 0 ? (
              <p className="text-xs text-slate-500">No updates logged yet.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {updates.map((upd, idx) => (
                  <div key={upd._id || idx} className="relative group">
                    {/* Stepper Dot */}
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs bg-brand-800 ring-2 ring-brand-100 flex items-center justify-center"></div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(upd.status)}`}>
                          Status: {upd.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(upd.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium mt-1">
                        {upd.note}
                      </p>
                      <div className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Action by:</span>
                        <strong className="text-slate-700">{upd.actorName}</strong>
                        <span>({upd.actorRole})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                My Reported Complaints
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Track status updates and resolution progress for tickets you have submitted.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchMyComplaints}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh complaints"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onNewComplaintClick}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 transition-colors"
              >
                + Report New Problem
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-brand-800 border-t-transparent rounded-full animate-spin mb-3"></div>
              <span>Loading your tickets...</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No complaints filed yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Have you noticed broken facilities, network problems, or electrical issues at LPU? Use the Report a Problem form to log a ticket.
              </p>
              <button
                onClick={onNewComplaintClick}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 transition-colors"
              >
                Report a Problem Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleSelectComplaint(item)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-brand-800/50 hover:bg-brand-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                        #{item.complaintId}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-900 transition-colors">
                        {item.title}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center text-slate-600">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                        {item.location}
                      </span>
                      <span>&bull;</span>
                      <span className="text-brand-800 font-semibold">{item.department}</span>
                      <span>&bull;</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-start sm:self-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getPriorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-800 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
