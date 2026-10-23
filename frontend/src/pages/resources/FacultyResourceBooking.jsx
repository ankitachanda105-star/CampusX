import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import {
  Calendar,
  Clock,
  Building,
  Users,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  Filter,
  Search,
  ArrowRight
} from 'lucide-react';

export default function FacultyResourceBooking() {
  const { token, user } = useAuth();
  const [resources, setResources] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('browse'); // 'browse' | 'my-bookings'
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [selectedResource, setSelectedResource] = useState(null);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [eventName, setEventName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Booked slots on selected date for preview
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resources', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Error fetching resources for booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const res = await fetch('/api/resources/my-bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMyBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Error fetching personal bookings:', err);
    }
  };

  useEffect(() => {
    fetchResources();
    fetchMyBookings();
  }, [token]);

  // Check occupied slots whenever selected resource or date changes
  const fetchSlotAvailability = async (resId, dateStr) => {
    if (!resId || !dateStr) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/resources/${resId}/availability?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBookedSlots(data.bookedSlots || []);
      }
    } catch (err) {
      console.error('Error checking slot availability:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedResource) {
      fetchSlotAvailability(selectedResource._id, bookingDate);
    }
  }, [selectedResource, bookingDate]);

  const handleOpenBookingModal = (resource) => {
    setSelectedResource(resource);
    setErrorMessage(null);
    setEventName('');
    setPurpose('');
    setStartTime('10:00');
    setEndTime('12:00');
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (startTime >= endTime) {
      setErrorMessage('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/resources/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceId: selectedResource._id,
          bookingDate,
          startTime,
          endTime,
          eventName,
          purpose,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || 'Booking conflict detected. Please pick another slot.');
        return;
      }

      setSuccessToast(`Reservation ${data.booking.bookingId} confirmed for ${selectedResource.name} on ${bookingDate} (${startTime}-${endTime})!`);
      setSelectedResource(null);
      fetchMyBookings();
      setActiveSubTab('my-bookings');
    } catch (err) {
      setErrorMessage('Network error occurred while submitting reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="faculty-resource-booking-container">
      {/* Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-600 text-base">
            &times;
          </button>
        </div>
      )}

      {/* Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
              Faculty Venue Portal
            </span>
            <span className="text-xs text-amber-600 font-bold flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Conflict Prevention Active
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Faculty Facility &amp; Classroom Reservations
          </h2>
          <p className="text-xs text-slate-500">
            Book lecture theatres, CSE computer labs, and conference venues with collision prevention
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            id="subtab-faculty-browse"
            onClick={() => setActiveSubTab('browse')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'browse'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Browse &amp; Reserve
          </button>
          <button
            id="subtab-faculty-my-reservations"
            onClick={() => setActiveSubTab('my-bookings')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'my-bookings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Reservations ({myBookings.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: BROWSE & BOOK */}
      {activeSubTab === 'browse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div
              key={res.resource_id}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-800 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-brand-50 text-brand-900 rounded-lg border border-brand-200">
                    {res.resource_id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      res.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {res.status}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 mb-1">
                  {res.name}
                </h3>
                <p className="text-xs text-slate-500 mb-3 flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                  <span>{res.block} &bull; {res.type}</span>
                </p>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-slate-700 font-semibold">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cap: {res.capacity}</span>
                  </div>
                  {res.systemCount > 0 && (
                    <span className="text-[11px] font-bold text-brand-800">
                      {res.systemCount} Systems
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">
                    {res.department?.split('/')[0]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {res.amenities?.slice(0, 3).map((am, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                      {am}
                    </span>
                  ))}
                </div>
              </div>

              <button
                id={`btn-faculty-book-${res.resource_id.toLowerCase()}`}
                onClick={() => handleOpenBookingModal(res)}
                disabled={res.status === 'Under Maintenance'}
                className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                <span>Reserve Time Slot</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 2: MY RESERVATIONS */}
      {activeSubTab === 'my-bookings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            Your Scheduled Campus Reservations
          </h3>
          {myBookings.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              You have no active facility bookings yet. Use "Browse &amp; Reserve" to book a classroom or lab.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Booking ID</th>
                    <th className="pb-3">Facility</th>
                    <th className="pb-3">Date &amp; Slot</th>
                    <th className="pb-3">Event / Purpose</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-brand-800">{b.bookingId}</td>
                      <td className="py-3 font-semibold text-slate-900">{b.resourceName || b.resourceCode}</td>
                      <td className="py-3 text-slate-600">
                        <strong>{b.bookingDate}</strong> &bull; {b.startTime} - {b.endTime}
                      </td>
                      <td className="py-3 text-slate-700">{b.eventName}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: BOOKING FORM WITH OCCUPIED SLOTS DISPLAY */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            id="faculty-booking-modal"
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {selectedResource.type} &bull; {selectedResource.resource_id}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Book {selectedResource.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedResource.block} &bull; Cap: {selectedResource.capacity} seats
                </p>
              </div>
              <button
                onClick={() => setSelectedResource(null)}
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

            {/* Occupied Slots Indicator on Selected Date */}
            <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-700 text-[11px] uppercase">
                  Occupied Slots on {bookingDate}:
                </span>
                {loadingSlots && <span className="text-slate-400 text-[10px]">checking...</span>}
              </div>
              {bookedSlots.length === 0 ? (
                <p className="text-emerald-700 font-medium text-[11px]">
                  ✓ All time slots are currently free for this date!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {bookedSlots.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200"
                    >
                      {s.startTime} - {s.endTime} ({s.eventName})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Booking Form */}
            <form onSubmit={handleBookSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Event / Lecture Title *
                </label>
                <input
                  id="input-event-name"
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Lab Workshop"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Booking Date *
                </label>
                <input
                  id="input-booking-date"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Start Time (24h) *
                  </label>
                  <input
                    id="input-start-time"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    End Time (24h) *
                  </label>
                  <input
                    id="input-end-time"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Purpose / Notes
                </label>
                <textarea
                  id="input-booking-purpose"
                  rows={2}
                  placeholder="Department practical session, guest lecture, etc."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedResource(null)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-faculty-booking"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Checking Conflicts...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
