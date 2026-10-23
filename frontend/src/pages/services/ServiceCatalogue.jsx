import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  ArrowRight,
  ShieldCheck,
  Building,
  Check,
  Paperclip,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';

export default function ServiceCatalogue({ onApplicationSuccess }) {
  const { token, user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Application Modal state
  const [selectedService, setSelectedService] = useState(null);
  const [purpose, setPurpose] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    fetchCatalogue();
  }, [token]);

  const fetchCatalogue = async () => {
    try {
      const res = await fetch('/api/services/catalogue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Error fetching service catalogue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError(null);
    if (!file) {
      setDocumentFile(null);
      return;
    }

    // Enforce 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds the 5MB maximum limit. Please select a smaller file.');
      e.target.value = '';
      setDocumentFile(null);
      return;
    }

    // Validate type (PDF or images)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Invalid file type. Only PDF and image files (JPG, PNG) are permitted.');
      e.target.value = '';
      setDocumentFile(null);
      return;
    }

    setDocumentFile(file);
  };

  const handleOpenApplyModal = (svc) => {
    setSelectedService(svc);
    setPurpose('');
    setDocumentFile(null);
    setFileError(null);
    setSubmitResult(null);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!purpose.trim()) {
      alert('Please enter the purpose of this request.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('serviceId', selectedService._id);
      formData.append('purpose', purpose.trim());
      if (documentFile) {
        formData.append('document', documentFile);
      }

      const res = await fetch('/api/services/request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSubmitResult(data.request);
      } else {
        setFileError(data.message || 'Failed to submit application.');
      }
    } catch (err) {
      setFileError('Network error submitting request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900">
          LPU College Service Hub
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Apply online for student certificates, transcripts, no-dues, and administrative clearances with multi-stage verification
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => (
          <div
            key={svc.code}
            className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-800 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-800 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {svc.fee === 0 ? 'Free' : `₹${svc.fee}`}
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900 mb-1">
                {svc.name}
              </h3>
              <p className="text-xs text-brand-800 font-semibold mb-2">
                {svc.department}
              </p>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                {svc.description}
              </p>

              {/* Required Documents checklist */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs mb-5">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-2">
                  Required Documents:
                </p>
                <ul className="space-y-1.5 text-slate-600">
                  {svc.requiredDocuments.map((doc, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5 text-[11px]">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center">
                <Clock className="w-3 h-3 mr-1 text-slate-400" />
                ~{svc.estimatedDays} business day{svc.estimatedDays > 1 ? 's' : ''}
              </span>

              <button
                id={`apply-service-${svc.code.toLowerCase()}`}
                onClick={() => handleOpenApplyModal(svc)}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <span>Apply Online</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Application Submission Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {submitResult ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Application Submitted!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your request has been logged and assigned sequential ID:
                  </p>
                  <p id="generated-request-id" className="text-2xl font-mono font-black text-brand-800 mt-2 px-4 py-1.5 bg-brand-50 rounded-xl inline-block border border-brand-200">
                    {submitResult.requestId}
                  </p>
                </div>

                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  You can track each step of your 5-stage approval lifecycle in real time under the "Track Requests" tab.
                </p>

                <div className="pt-4 flex justify-center space-x-3">
                  <button
                    onClick={() => {
                      setSelectedService(null);
                      setSubmitResult(null);
                      if (onApplicationSuccess) onApplicationSuccess(submitResult);
                    }}
                    className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    View in Request Tracker &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {selectedService.department}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      Apply: {selectedService.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmitApplication} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reason / Purpose of Request *
                    </label>
                    <textarea
                      id="input-service-purpose"
                      rows="3"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. Required for foreign university admission / education bank loan application..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supporting Document (Optional / Recommended)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-brand-800/40 transition-colors">
                      <input
                        type="file"
                        id="input-service-document"
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                      />
                      <label htmlFor="input-service-document" className="cursor-pointer block">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-brand-800">
                          {documentFile ? documentFile.name : 'Click to select supporting file'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          PDF, PNG, JPEG up to 5MB
                        </p>
                      </label>
                    </div>
                    {fileError && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {fileError}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">Approval Workflow Stages:</p>
                    <p>1. Submitted &rarr; 2. Document Verified &rarr; 3. Department Approval &rarr; 4. HOD Approval &rarr; 5. Certificate Generated</p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedService(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-submit-service-request"
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 rounded-xl shadow-sm disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
