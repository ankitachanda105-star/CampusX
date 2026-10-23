import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  RefreshCw,
  Building,
  Ban
} from 'lucide-react';

export default function MyBookings() {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/resources/bookings/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  const handleCancelBooking = async (bId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    setCancellingId(bId);
    try {
      const res = await fetch(`/api/resources/bookings/${bId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'info', text: 'Reservation cancelled successfully.' });
        await fetchBookings();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to cancel reservation.' });
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            My Facility Reservations
          </h2>
          <p className="text-xs text-slate-500">
            Review your confirmed and pending bookings across campus venues
          </p>
        </div>
        <button
          onClick={fetchBookings}
          className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            message.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl text-center border border-slate-200 text-xs text-slate-400">
          You have no active or historical facility reservations. Browse the Catalogue to book.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-brand-50 text-brand-900 rounded border border-brand-200">
                    {b.bookingId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
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
                </div>

                <h3 className="text-base font-black text-slate-900">
                  {b.eventName}
                </h3>
                <p className="text-xs text-brand-800 font-semibold mt-0.5">
                  {b.resourceName} ({b.resourceCode}) &bull; {b.location}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {b.bookingDate}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {b.startTime} - {b.endTime}
                  </span>
                </div>

                {b.approvalRemark && (
                  <p className="text-[11px] text-slate-600 italic mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    Note: "{b.approvalRemark}"
                  </p>
                )}
              </div>

              <div>
                {['Pending Approval', 'Approved'].includes(b.status) && (
                  <button
                    onClick={() => handleCancelBooking(b._id)}
                    disabled={cancellingId === b._id}
                    className="px-3.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors flex items-center space-x-1"
                  >
                    <Ban className="w-3.5 h-3.5 text-red-600" />
                    <span>{cancellingId === b._id ? 'Cancelling...' : 'Cancel Reservation'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
