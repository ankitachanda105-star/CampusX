import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  Monitor,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  SlidersHorizontal,
  X
} from 'lucide-react';

const RESOURCE_TYPES = ['Classroom', 'Computer Lab', 'Seminar Hall/Auditorium', 'Sports Facility'];
const STATUS_OPTIONS = ['Available', 'Occupied', 'Under Maintenance'];

export default function AdminResourceManagement() {
  const { token } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBlock, setFilterBlock] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Modal State for CRUD
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formResourceId, setFormResourceId] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Classroom');
  const [formBlock, setFormBlock] = useState(CAMPUS_CONFIG.academicBlocks[0] || 'Block 32');
  const [formCapacity, setFormCapacity] = useState(60);
  const [formSystemCount, setFormSystemCount] = useState(0);
  const [formDepartment, setFormDepartment] = useState('School of Computer Science & Engineering');
  const [formStatus, setFormStatus] = useState('Available');
  const [formAmenities, setFormAmenities] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/resources', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Error fetching resources for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [token]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormResourceId('');
    setFormName('');
    setFormType('Classroom');
    setFormBlock(CAMPUS_CONFIG.academicBlocks[0] || 'Block 32');
    setFormCapacity(60);
    setFormSystemCount(0);
    setFormDepartment('School of Computer Science & Engineering');
    setFormStatus('Available');
    setFormAmenities('Projector, Central AC, Whiteboard');
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (res) => {
    setIsEditing(true);
    setCurrentId(res._id);
    setFormResourceId(res.resource_id);
    setFormName(res.name);
    setFormType(res.type);
    setFormBlock(res.block);
    setFormCapacity(res.capacity);
    setFormSystemCount(res.systemCount || 0);
    setFormDepartment(res.department || 'School of Computer Science & Engineering');
    setFormStatus(res.status);
    setFormAmenities(Array.isArray(res.amenities) ? res.amenities.join(', ') : '');
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleDeleteResource = async (res) => {
    if (!window.confirm(`Are you sure you want to delete ${res.name} (${res.resource_id})?`)) {
      return;
    }

    try {
      const resp = await fetch(`http://localhost:5000/api/resources/${res._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) {
        setToastMessage(`Resource ${res.resource_id} deleted successfully.`);
        fetchResources();
      } else {
        alert(data.message || 'Error deleting resource.');
      }
    } catch (err) {
      console.error('Error deleting resource:', err);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const payload = {
      resource_id: formResourceId,
      name: formName,
      type: formType,
      block: formBlock,
      capacity: Number(formCapacity),
      systemCount: Number(formSystemCount),
      status: formStatus,
      department: formDepartment,
      amenities: formAmenities,
    };

    try {
      const url = isEditing
        ? `http://localhost:5000/api/resources/${currentId}`
        : 'http://localhost:5000/api/resources';
      const method = isEditing ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setErrorMessage(data.message || 'Error processing resource.');
        return;
      }

      setToastMessage(data.message || 'Resource saved successfully.');
      setShowModal(false);
      fetchResources();
    } catch (err) {
      setErrorMessage('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered resources
  const filtered = resources.filter((r) => {
    if (filterBlock !== 'All' && r.block !== filterBlock) return false;
    if (filterType !== 'All' && r.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.resource_id.toLowerCase().includes(q) ||
        r.block.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Campus-wide summary metrics
  const totalVenues = resources.length;
  const avgUtilization =
    totalVenues > 0
      ? Math.round(resources.reduce((acc, r) => acc + (r.utilizationPercent || 0), 0) / totalVenues)
      : 0;
  const totalBookedHours = resources.reduce((acc, r) => acc + (r.bookedHours30Days || 0), 0);
  const underMaintenanceCount = resources.filter((r) => r.status === 'Under Maintenance').length;

  return (
    <div className="space-y-6" id="admin-resource-management-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600 text-base">
            &times;
          </button>
        </div>
      )}

      {/* Header & KPI Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
              Module 5 &bull; Space Governance
            </span>
            <span className="text-xs text-brand-800 font-bold flex items-center">
              <Activity className="w-3.5 h-3.5 mr-1" />
              30-Day Actual Booking Telemetry
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Campus Resources &amp; Utilization Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Full inventory CRUD and live 30-day capacity utilization ratios computed from booking durations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchResources}
            className="p-2 text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-add-new-resource"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Campus Space</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Venues</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalVenues}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Across LPU Blocks</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Utilization</p>
          <p id="kpi-avg-utilization" className="text-2xl font-black text-brand-800 mt-1">
            {avgUtilization}%
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Past 30 Days Target</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booked Hours</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalBookedHours} hrs</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Actual Occupancy</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Under Maintenance</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{underMaintenanceCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Offline for Repairs</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search venue ID, room, block..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={filterBlock}
            onChange={(e) => setFilterBlock(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="All">All Blocks</option>
            {CAMPUS_CONFIG.academicBlocks.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="All">All Types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resources Table with Utilization Bar and % */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="admin-resource-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="table-admin-resources">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Venue ID</th>
                <th className="py-3.5 px-4">Space Name &amp; Type</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Capacity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 min-w-[220px]">30-Day Utilization</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((res) => {
                const util = res.utilizationPercent || 0;
                let barColor = 'bg-emerald-500';
                if (util >= 75) barColor = 'bg-purple-600';
                else if (util >= 45) barColor = 'bg-brand-800';
                else if (util >= 20) barColor = 'bg-amber-500';

                return (
                  <tr key={res.resource_id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Venue ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-900">
                      <span className="px-2 py-0.5 bg-brand-50 rounded border border-brand-200">
                        {res.resource_id}
                      </span>
                    </td>

                    {/* Name & Type */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{res.name}</p>
                      <p className="text-[11px] text-slate-400">{res.type}</p>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {res.block}
                    </td>

                    {/* Capacity */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <span className="flex items-center">
                        <Users className="w-3 h-3 text-slate-400 mr-1" />
                        {res.capacity}
                        {res.systemCount > 0 && (
                          <span className="ml-1.5 text-[10px] text-brand-800 font-semibold">
                            ({res.systemCount} PCs)
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          res.status === 'Available'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : res.status === 'Occupied'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {res.status}
                      </span>
                    </td>

                    {/* 30-Day Utilization Bar with Percentage */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-800">{util}% Utilized</span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {res.bookedHours30Days || 0}h / 240h
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(3, util))}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        id={`btn-edit-resource-${res.resource_id.toLowerCase()}`}
                        onClick={() => handleOpenEditModal(res)}
                        className="p-1.5 text-slate-500 hover:text-brand-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Space"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-delete-resource-${res.resource_id.toLowerCase()}`}
                        onClick={() => handleDeleteResource(res)}
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Space"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD MODAL: CREATE / EDIT RESOURCE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            id="admin-resource-modal"
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {isEditing ? `Edit Space: ${formResourceId}` : 'Add New Campus Space'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Venue ID *</label>
                  <input
                    id="input-form-resource-id"
                    type="text"
                    required
                    disabled={isEditing}
                    placeholder="e.g. 32-401, CSE-LAB-07"
                    value={formResourceId}
                    onChange={(e) => setFormResourceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 disabled:bg-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Facility Type *</label>
                  <select
                    id="select-form-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 bg-white"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Space Name *</label>
                <input
                  id="input-form-name"
                  type="text"
                  required
                  placeholder="e.g. Advanced AI & Robotics Studio"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Block *</label>
                  <select
                    id="select-form-block"
                    value={formBlock}
                    onChange={(e) => setFormBlock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 bg-white"
                  >
                    {CAMPUS_CONFIG.academicBlocks.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operational Status</label>
                  <select
                    id="select-form-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800 bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student Capacity *</label>
                  <input
                    id="input-form-capacity"
                    type="number"
                    min={1}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Workstation PCs (Labs)</label>
                  <input
                    id="input-form-system-count"
                    type="number"
                    min={0}
                    value={formSystemCount}
                    onChange={(e) => setFormSystemCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Owner</label>
                <input
                  id="input-form-department"
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amenities (comma-separated)</label>
                <input
                  id="input-form-amenities"
                  type="text"
                  placeholder="e.g. Dual 4K Projector, Central AC, Smart Board"
                  value={formAmenities}
                  onChange={(e) => setFormAmenities(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-resource"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update Space' : 'Create Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
