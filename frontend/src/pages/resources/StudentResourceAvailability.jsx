import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import {
  Building,
  Search,
  Filter,
  Users,
  Monitor,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';

const RESOURCE_TYPES = ['All', 'Classroom', 'Computer Lab', 'Seminar Hall/Auditorium', 'Sports Facility'];

export default function StudentResourceAvailability() {
  const { token } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  const fetchResources = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/resources?';
      if (selectedBlock !== 'All') url += `block=${encodeURIComponent(selectedBlock)}&`;
      if (selectedType !== 'All') url += `type=${encodeURIComponent(selectedType)}&`;
      if (onlyAvailable) url += `status=Available&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedBlock, selectedType, onlyAvailable]);

  const filtered = resources.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.resource_id && r.resource_id.toLowerCase().includes(q)) ||
      (r.block && r.block.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6" id="student-resource-availability-container">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
              Campus Intelligence &bull; Module 5
            </span>
            <span className="text-xs text-emerald-600 font-bold flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
              Live Availability
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Campus Classrooms &amp; Facility Directory
          </h2>
          <p className="text-xs text-slate-500">
            Real-time read-only occupancy and free slot status for study groups, project sessions, and lab access
          </p>
        </div>

        <button
          onClick={fetchResources}
          className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="input-search-resources"
              type="text"
              placeholder="Search by room (e.g. 32-401, CSE Lab)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
            />
          </div>

          {/* Block Dropdown */}
          <div>
            <select
              id="select-block-filter"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 bg-white font-medium text-slate-700"
            >
              <option value="All">All LPU Campus Blocks</option>
              {CAMPUS_CONFIG.academicBlocks.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Type Dropdown */}
          <div>
            <select
              id="select-type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 bg-white font-medium text-slate-700"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t === 'All' ? 'All Facility Types' : t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded border-slate-300 text-brand-800 focus:ring-brand-800"
            />
            <span className="font-semibold text-slate-700">Show Free &amp; Available Spaces Only</span>
          </label>

          <span className="text-[11px] text-slate-400 font-medium">
            Showing <strong className="text-slate-700">{filtered.length}</strong> matching venues
          </span>
        </div>
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 mt-2">Checking real-time campus space availability...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl text-center border border-slate-200">
          <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No facilities matching current filters</p>
          <p className="text-xs text-slate-400 mt-1">Try broadening your search or unchecking "Show Free Spaces Only".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="resource-cards-grid">
          {filtered.map((res) => (
            <div
              key={res.resource_id}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-800 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Tag & Status */}
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-xs font-black px-2.5 py-1 bg-brand-50 text-brand-900 rounded-lg border border-brand-200">
                    {res.resource_id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                      res.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : res.status === 'Occupied'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        res.status === 'Available'
                          ? 'bg-emerald-500'
                          : res.status === 'Occupied'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    ></span>
                    <span>{res.status}</span>
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 mb-1">
                  {res.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center mb-3">
                  <MapPin className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                  <span>{res.block} &bull; {res.type}</span>
                </p>

                {/* Specs Pill Box */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs mb-4">
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cap: <strong>{res.capacity}</strong> seats</span>
                  </div>
                  {res.systemCount > 0 ? (
                    <div className="flex items-center space-x-1.5 text-brand-800 font-semibold">
                      <Monitor className="w-3.5 h-3.5 text-brand-600" />
                      <span>{res.systemCount} Workstations</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-medium truncate">
                      {res.department ? res.department.split('/')[0] : 'General'}
                    </div>
                  )}
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {res.amenities?.slice(0, 3).map((am, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600"
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

              {/* Read Only Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" /> Student Directory
                </span>
                <span className="font-semibold text-brand-800">
                  {res.status === 'Available' ? 'Open for Access' : 'In Session'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
