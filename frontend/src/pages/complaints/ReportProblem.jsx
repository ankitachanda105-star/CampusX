import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import {
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  X,
  Sparkles,
  ArrowRight,
  MapPin,
  Building,
  FileText,
  Clock,
  ShieldAlert
} from 'lucide-react';

export default function ReportProblem({ onComplaintSubmitted, onViewMyComplaints, prefillData }) {
  const { token, user } = useAuth();

  const [title, setTitle] = useState('');
  const [block, setBlock] = useState(CAMPUS_CONFIG.academicBlocks[0] || 'Block 34');
  const [roomLab, setRoomLab] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (prefillData) {
      if (prefillData.title) setTitle(prefillData.title);
      if (prefillData.description) setDescription(prefillData.description);
      if (prefillData.block) setBlock(prefillData.block);
      if (prefillData.roomLab) setRoomLab(prefillData.roomLab);
    }
  }, [prefillData]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('Selected image exceeds the 5MB maximum limit.');
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload an image file (JPEG, PNG, or WebP).');
      return;
    }

    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a brief problem title.');
      return;
    }
    if (!block.trim()) {
      setError('Please select a campus block or hostel.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the problem in detail.');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('block', block.trim());
      formData.append('roomLab', roomLab.trim());
      formData.append('description', description.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit complaint');
      }

      setSuccessResult(data);
      // Reset form fields
      setTitle('');
      setRoomLab('');
      setDescription('');
      handleRemoveImage();

      if (onComplaintSubmitted) {
        onComplaintSubmitted(data.complaint);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting your complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <span>Report a Campus Problem</span>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold-100 text-gold-900 border border-gold-300">
              Module 2
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Submit an operational or maintenance issue. CampusX AI will automatically classify and dispatch it to the relevant department.
          </p>
        </div>
      </div>

      {/* Success Confirmation Card */}
      {successResult && (
        <div
          id="complaint-success-card"
          className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 shadow-xs animate-fadeIn"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Complaint Successfully Registered
                </span>
                <span className="font-mono text-sm font-black bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 text-emerald-950 shadow-2xs">
                  ID: #{successResult.complaint.complaintId}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                {successResult.complaint.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Location: <strong>{successResult.complaint.location}</strong>
              </p>

              {/* AI Auto-Classification Badge */}
              <div className="mt-3.5 p-3 rounded-xl bg-white/80 border border-emerald-100 flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1 text-xs font-bold text-brand-800">
                  <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                  <span>AI Auto-Classification:</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200">
                  Category: {successResult.complaint.category}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  successResult.complaint.priority === 'Critical' || successResult.complaint.priority === 'High'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  Priority: {successResult.complaint.priority}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Dispatched to: {successResult.complaint.department}
                </span>
              </div>

              <div className="mt-4 flex items-center space-x-3">
                <button
                  type="button"
                  id="view-my-complaints-btn"
                  onClick={() => onViewMyComplaints && onViewMyComplaints()}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-xs transition-colors"
                >
                  <span>View in My Complaints</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSuccessResult(null)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors"
                >
                  File Another Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="complaint-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Problem Title <span className="text-red-500">*</span>
          </label>
          <input
            id="complaint-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. WiFi not connecting in Lab 204, or Water leakage in washroom"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors"
          />
        </div>

        {/* Location Selector (Driven by LPU master config) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="complaint-block" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Campus Block / Hostel <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="complaint-block"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors"
              >
                <optgroup label="Academic Blocks">
                  {CAMPUS_CONFIG.academicBlocks.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </optgroup>
                <optgroup label="Boys Hostels">
                  {CAMPUS_CONFIG.hostels.boys.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </optgroup>
                <optgroup label="Girls Hostels">
                  {CAMPUS_CONFIG.hostels.girls.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="complaint-room" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Room / Lab / Floor (Optional)
            </label>
            <input
              id="complaint-room"
              type="text"
              value={roomLab}
              onChange={(e) => setRoomLab(e.target.value)}
              placeholder="e.g. Lab 204, Room 312, 2nd Floor"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="complaint-description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="complaint-description"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail, including equipment tags, error messages, or exact conditions..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors"
          ></textarea>
        </div>

        {/* File Upload (Max 5MB) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Attachment Photo (Optional &bull; Max 5MB)
          </label>

          {!imagePreview ? (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-slate-300 rounded-2xl hover:border-brand-800/60 transition-colors bg-slate-50/50">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-9 w-9 text-slate-400" />
                <div className="flex text-xs text-slate-600 justify-center">
                  <label
                    htmlFor="complaint-file-input"
                    className="relative cursor-pointer bg-white rounded-md font-bold text-brand-800 hover:text-brand-900 focus-within:outline-none px-2 py-0.5 border border-slate-200"
                  >
                    <span>Choose an image</span>
                    <input
                      id="complaint-file-input"
                      name="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1 text-slate-500">or drag and drop</p>
                </div>
                <p className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</p>
              </div>
            </div>
          ) : (
            <div className="relative mt-2 inline-block rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
              <img
                src={imagePreview}
                alt="Attachment preview"
                className="h-36 w-auto object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="p-1.5 text-[10px] font-mono text-slate-600 bg-white/90 border-t border-slate-200">
                {imageFile?.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            id="complaint-submit-button"
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-6 py-2.5 rounded-xl shadow-md text-sm font-bold text-white bg-brand-800 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Classifying & Submitting...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <span>Submit Complaint</span>
                <ArrowRight className="w-4 h-4 text-gold-300" />
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
