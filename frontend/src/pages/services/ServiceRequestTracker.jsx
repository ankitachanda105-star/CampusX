import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Building,
  User,
  Check,
  Download,
  AlertTriangle
} from 'lucide-react';

export default function ServiceRequestTracker({ initialSelectedId }) {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMyRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/services/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
        if (data.requests.length > 0) {
          if (initialSelectedId) {
            const found = data.requests.find(
              (r) => r.requestId === initialSelectedId || r._id === initialSelectedId
            );
            setSelectedRequest(found || data.requests[0]);
          } else if (!selectedRequest) {
            setSelectedRequest(data.requests[0]);
          } else {
            // refresh existing selection
            const refreshed = data.requests.find((r) => r._id === selectedRequest._id);
            if (refreshed) setSelectedRequest(refreshed);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching student service requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
    const interval = setInterval(fetchMyRequests, 6000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-base font-black text-slate-900">
          No Service Applications Found
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          You have not submitted any certificate or service requests yet. Browse the Service Catalogue to submit an application.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Track Applications & Progress Stepper
          </h2>
          <p className="text-xs text-slate-500">
            Monitor real-time approval status across department and administrative desks
          </p>
        </div>
        <button
          onClick={fetchMyRequests}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Requests List */}
        <div className="lg:col-span-4 space-y-3">
          {requests.map((req) => {
            const isSelected = selectedRequest?._id === req._id;
            return (
              <div
                key={req._id}
                id={`request-item-${req.requestId.toLowerCase()}`}
                onClick={() => setSelectedRequest(req)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-brand-800 ring-2 ring-brand-800/15 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-xs text-brand-900 px-2 py-0.5 bg-brand-50 rounded border border-brand-200">
                    {req.requestId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <h4 className="text-sm font-black text-slate-900 line-clamp-1">
                  {req.serviceName}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current Stage: <span className="font-semibold text-slate-700">{req.currentStage}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-2">
                  Submitted {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Side: Stepper & Detail View */}
        {selectedRequest && (
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-brand-800 text-white rounded-lg">
                    {selectedRequest.requestId}
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs font-semibold text-brand-800">
                    {selectedRequest.department}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedRequest.serviceName}
                </h3>
              </div>

              <div>
                <span
                  className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold ${
                    selectedRequest.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedRequest.status === 'Rejected'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {selectedRequest.status === 'Completed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : selectedRequest.status === 'Rejected' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  )}
                  <span>{selectedRequest.status}</span>
                </span>
              </div>
            </div>

            {/* Rejection Alert Card (if rejected) */}
            {selectedRequest.status === 'Rejected' && (
              <div id="service-rejection-banner" className="my-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-sm text-red-900">
                      Application Rejected at "{selectedRequest.currentStage}"
                    </h4>
                    <p className="text-xs text-red-700 mt-1 font-semibold">
                      Reason from Staff:
                    </p>
                    <p className="text-xs text-red-800 mt-0.5 bg-white/70 p-2.5 rounded-xl border border-red-200 font-mono">
                      "{selectedRequest.rejectionReason || 'Documents or criteria did not satisfy requirements.'}"
                    </p>
                    <p className="text-[11px] text-red-600 mt-2">
                      Please address the remark above and submit a new request, or contact the {selectedRequest.department}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Application Overview Summary */}
            <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between text-slate-600 gap-1">
                <span>
                  <strong>Student:</strong> {selectedRequest.studentName} ({selectedRequest.studentRegNo})
                </span>
                <span>
                  <strong>Date:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-700">
                <strong>Purpose:</strong> {selectedRequest.purpose}
              </p>
              {selectedRequest.documentUrl && (
                <div className="pt-2 flex items-center space-x-2">
                  <span className="font-bold text-slate-700">Attached File:</span>
                  <a
                    href={`http://localhost:5000${selectedRequest.documentUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-brand-800 hover:text-brand-900 font-bold underline"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    {selectedRequest.documentOriginalName || 'View Document'}
                  </a>
                </div>
              )}
            </div>

            {/* Vertical Progress Stepper */}
            <div className="mt-8">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-6">
                Verification & Approval Workflow
              </h4>

              <div id="service-vertical-stepper" className="relative pl-6 space-y-8 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {selectedRequest.stages.map((stageName, idx) => {
                  const isCompleted =
                    selectedRequest.status === 'Completed' ||
                    idx < selectedRequest.currentStageIndex;

                  const isCurrent =
                    idx === selectedRequest.currentStageIndex &&
                    selectedRequest.status === 'In Progress';

                  const isRejectedAtThisStage =
                    selectedRequest.status === 'Rejected' &&
                    idx === selectedRequest.currentStageIndex;

                  const isFuture =
                    idx > selectedRequest.currentStageIndex;

                  // Find history audit log for this stage
                  const auditLog = selectedRequest.approvalHistory?.find(
                    (h) => h.stage === stageName
                  );

                  return (
                    <div key={stageName} className="relative flex items-start space-x-4">
                      {/* Step Circle */}
                      <div
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : isRejectedAtThisStage
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                            : isCurrent
                            ? 'bg-brand-800 text-white ring-4 ring-brand-800/20 shadow-md animate-pulse'
                            : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : isRejectedAtThisStage ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 -mt-0.5">
                        <div className="flex items-center justify-between">
                          <h5
                            className={`text-sm font-black ${
                              isCompleted
                                ? 'text-slate-900'
                                : isCurrent
                                ? 'text-brand-900'
                                : isRejectedAtThisStage
                                ? 'text-red-900'
                                : 'text-slate-400'
                            }`}
                          >
                            {stageName}
                          </h5>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isRejectedAtThisStage
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : isCurrent
                                ? 'bg-brand-50 text-brand-800 border border-brand-200'
                                : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            {isCompleted
                              ? 'Completed'
                              : isRejectedAtThisStage
                              ? 'Rejected'
                              : isCurrent
                              ? 'In Progress (Active)'
                              : 'Pending'}
                          </span>
                        </div>

                        {/* Audit Details */}
                        {auditLog && (
                          <div className="mt-1 text-xs text-slate-600">
                            <p className="text-[11px] text-slate-500">
                              By {auditLog.actorName} ({auditLog.actorRole}) &bull;{' '}
                              {new Date(auditLog.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {auditLog.remark && (
                              <p className="text-[11px] italic text-slate-700 mt-0.5">
                                "{auditLog.remark}"
                              </p>
                            )}
                          </div>
                        )}

                        {isCurrent && (
                          <p className="mt-1 text-xs text-amber-700 font-semibold">
                            Application currently under review at this stage. You will receive an in-app alert when approved.
                          </p>
                        )}

                        {isFuture && (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Awaiting completion of previous clearance stages.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
