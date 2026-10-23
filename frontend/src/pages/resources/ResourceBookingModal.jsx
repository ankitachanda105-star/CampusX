import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  Building,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles
} from 'lucide-react';

export default function ResourceBookingModal({ resource, onClose, onBookingSuccess }) {
  const { token, user } = useAuth();

  // Tomorrow as default date in YYYY-MM-DD
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [bookingDate, setBookingDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [eventName, setEventName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch existing booked slots for the selected date
  const fetchAvailability = async (dateStr) => {
    if (!resource?._id || !dateStr) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/resources/${resource._id}/availability?date=${dateStr}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success) {
        setBookedSlots(data.bookedSlots || []);
      }
    } catch (err) {
      console.error('Error fetching slot availability:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAvailability(bookingDate);
  }, [bookingDate, resource?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (startTime >= endTime) {
      setErrorMessage('Start time must be strictly earlier than end time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/resources/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceId: resource._id,
          eventName: eventName.trim(),
          purpose: purpose.trim(),
          bookingDate,
          startTime,
          endTime,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onBookingSuccess) {
          onBookingSuccess(data.booking);
        }
        onClose();
      } else {
        setErrorMessage(data.message || 'Failed to complete booking.');
      }
    } catch (err) {
      setErrorMessage('Network error submitting reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div id="resource-booking-modal" className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
              {resource.category} &bull; {resource.code}
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              Book: {resource.name}
            </h3>
            <p className="text-xs text-slate-500">
              {resource.block} &bull; {resource.room} &bull; Cap: {resource.capacity} seats
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-900 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Existing Occupied Slots Display */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Occupied Slots for {bookingDate}:</span>
            {loadingSlots && <span className="text-slate-400 lowercase text-[10px]">checking...</span>}
          </p>
          {bookedSlots.length === 0 ? (
            <p className="text-xs text-emerald-700 font-medium">
              ✓ All time slots are currently open and available!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {bookedSlots.map((slot, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200"
                  title={`${slot.eventName} (${slot.status})`}
                >
                  {slot.startTime} - {slot.endTime} ({slot.eventName})
                </span>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Event / Session Title *
            </label>
            <input
              id="input-booking-event-name"
              type="text"
              required
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. AI Hackathon Orientation / Guest Lecture"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Date *
              </label>
              <input
                id="input-booking-date"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Start Time *
              </label>
              <input
                id="input-booking-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                End Time *
              </label>
              <input
                id="input-booking-end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Purpose &amp; Expected Headcount *
            </label>
            <textarea
              id="input-booking-purpose"
              rows="2.5"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Explain the academic, co-curricular or technical agenda and expected audience..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
            />
          </div>

          <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-100 text-[11px] text-brand-900">
            <strong>Policy:</strong> {resource.bookingPolicy}. You will receive an in-app alert once the reservation is processed.
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-resource-booking"
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 rounded-xl shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
            >
              {submitting ? 'Verifying Collision...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
