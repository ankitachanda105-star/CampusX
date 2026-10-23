import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  User,
  Search,
  Filter,
  RefreshCw,
  Check,
  Ban,
  Wrench
} from 'lucide-react';

export default function AdminResourceDesk() {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending Approval');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal state
  const [activeBooking, setActiveBooking] = useState(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchBookings = async () => {
    try {
      let url = '/api/resources/bookings/admin?';
      if (statusFilter !== 'All') {
        url += `status=${encodeURIComponent(statusFilter)}&`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error fetching admin bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 8000);
    return () => clearInterval(interval);
  }, [token, statusFilter]);

  const handleReviewAction = async (actionType) => {
    if (!activeBooking) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `/api/resources/bookings/${activeBooking._id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: actionType,
            remark: reviewRemark.trim(),
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setToastMessage({
          type: 'success',
          text: `Reservation ${activeBooking.bookingId} ${actionType.toLowerCase()} successfully.`,
        });
        setActiveBooking(null);
        setReviewRemark('');
        await fetchBookings();
      } else {
        setToastMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: 'Network error processing review.' });
    } finally {
      setProcessing(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.bookingId.toLowerCase().includes(q) ||
      b.eventName.toLowerCase().includes(q) ||
      b.userName.toLowerCase().includes(q) ||
      b.resourceName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Facility Reservations Approval Desk
          </h2>
          <p className="text-xs text-slate-500">
            Endorse venue reservations, resolve schedule overlaps, and allocate campus facilities
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search booking ID or user..."
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
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="All">All Reservations</option>
          </select>

          <button
            onClick={fetchBookings}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No venue reservations matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Booking ID</th>
                  <th className="px-6 py-3">Facility</th>
                  <th className="px-6 py-3">Event Title</th>
                  <th className="px-6 py-3">Requester</th>
                  <th className="px-6 py-3">Date &amp; Time Slot</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 bg-brand-50 text-brand-900 rounded-lg border border-brand-200">
                        {b.bookingId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{b.resourceName}</p>
                      <p className="text-[10px] text-slate-400">{b.location}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {b.eventName}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{b.userName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {b.userRegNo} &bull; {b.userRole}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{b.bookingDate}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {b.startTime} - {b.endTime}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : b.status === 'Cancelled'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {b.status === 'Pending Approval' ? (
                        <button
                          id={`btn-review-booking-${b.bookingId.toLowerCase()}`}
                          onClick={() => {
                            setActiveBooking(b);
                            setReviewRemark('');
                          }}
                          className="px-3 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono font-bold text-xs text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
                  {activeBooking.bookingId}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Evaluate Venue Reservation
                </h3>
              </div>
              <button
                onClick={() => setActiveBooking(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Venue:</span>
                  <span className="font-bold text-slate-900">{activeBooking.resourceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Event Title:</span>
                  <span className="font-semibold text-slate-900">{activeBooking.eventName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date &amp; Slot:</span>
                  <span className="font-mono font-bold text-brand-800">
                    {activeBooking.bookingDate} ({activeBooking.startTime} - {activeBooking.endTime})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requester:</span>
                  <span className="font-semibold text-slate-900">
                    {activeBooking.userName} ({activeBooking.userRegNo})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Purpose:</span>
                  <span className="text-slate-700 max-w-xs text-right">{activeBooking.purpose}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Administrator Remark
                </label>
                <textarea
                  rows="2"
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  placeholder="e.g. Venue confirmed with audio-visual technician on standby..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleReviewAction('Rejected')}
                  disabled={processing}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center space-x-1"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Reject Booking</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveBooking(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-approve-booking"
                    type="button"
                    onClick={() => handleReviewAction('Approved')}
                    disabled={processing}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Approve Reservation</span>
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
