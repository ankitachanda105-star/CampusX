import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ResourceBookingModal from './ResourceBookingModal';
import {
  Building2,
  Users,
  Calendar,
  CheckCircle2,
  Filter,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Laptop,
  Trophy,
  Presentation,
  BookOpen
} from 'lucide-react';

const CATEGORIES = ['All', 'Auditorium', 'Lab', 'Classroom', 'Sports Facility', 'Conference Hall'];

export default function ResourceCatalogue({ onBookingSuccess }) {
  const { token, user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const fetchResources = async () => {
    try {
      let url = 'http://localhost:5000/api/resources?';
      if (selectedCategory !== 'All') {
        url += `category=${encodeURIComponent(selectedCategory)}&`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setResources(data.resources);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [token, selectedCategory]);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Auditorium':
        return <Presentation className="w-5 h-5 text-purple-700" />;
      case 'Lab':
        return <Laptop className="w-5 h-5 text-blue-700" />;
      case 'Classroom':
        return <BookOpen className="w-5 h-5 text-emerald-700" />;
      case 'Sports Facility':
        return <Trophy className="w-5 h-5 text-amber-600" />;
      case 'Conference Hall':
      default:
        return <Building2 className="w-5 h-5 text-brand-800" />;
    }
  };

  const filteredResources = resources.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.block.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Campus Facilities &amp; Resource Booking
          </h2>
          <p className="text-xs text-slate-500">
            Reserve auditoriums, smart computer labs, lecture theatres, and sports facilities across LPU campus blocks
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search facility name, code, or block..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 w-64"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-brand-800 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl text-center border border-slate-200 text-xs text-slate-400">
          No campus resources found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <div
              key={res.code}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-800 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-xs">
                    {getCategoryIcon(res.category)}
                  </div>
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

                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-brand-50 text-brand-900 rounded border border-brand-200">
                    {res.code}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {res.category}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 line-clamp-1 mb-1">
                  {res.name}
                </h3>
                <p className="text-xs text-slate-500 mb-2 flex items-center">
                  <MapPin className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                  <span>{res.block} &bull; {res.room}</span>
                </p>

                <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                  {res.description}
                </p>

                {/* Capacity & Policy */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-700 font-semibold">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Capacity: {res.capacity} seats</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {res.bookingPolicy}
                  </span>
                </div>

                {/* Amenities pills */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {res.amenities?.slice(0, 3).map((am, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600"
                    >
                      {am}
                    </span>
                  ))}
                  {res.amenities?.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400">
                      +{res.amenities.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  id={`btn-book-resource-${res.code.toLowerCase()}`}
                  onClick={() => setSelectedResource(res)}
                  disabled={res.status === 'Under Maintenance'}
                  className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  <span>Reserve Facility</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedResource && (
        <ResourceBookingModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onBookingSuccess={(b) => {
            setSuccessToast(
              `Reservation ${b.bookingId} registered for "${b.resourceName}" on ${b.bookingDate} (${b.startTime}-${b.endTime}). Status: ${b.status}.`
            );
            if (onBookingSuccess) onBookingSuccess(b);
          }}
        />
      )}
    </div>
  );
}
