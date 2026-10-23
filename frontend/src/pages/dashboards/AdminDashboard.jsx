import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import Navbar from '../../components/Navbar';
import AdminComplaintManagement from '../complaints/AdminComplaintManagement';
import AdminQueueConsole from '../queue/AdminQueueConsole';
import StaffServiceApprovalQueue from '../services/StaffServiceApprovalQueue';
import CampusXAdminDashboard from '../analytics/CampusXAdminDashboard';
import AdminEquipmentMaintenance from '../maintenance/AdminEquipmentMaintenance';
import AdminResourceManagement from '../resources/AdminResourceManagement';
import AdminAssistantConsole from '../assistant/AdminAssistantConsole';
import AdminActivityLogs from '../admin/AdminActivityLogs';
import FloatingAssistantWidget from '../../components/FloatingAssistantWidget';
import {
  ShieldCheck,
  LogOut,
  CheckCircle2,
  Clock,
  Lock,
  Table,
  Ticket,
  FileCheck2,
  Activity,
  Wrench,
  Building,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout, testApiAccess } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'maintenance' | 'facilities' | 'queue' | 'services' | 'complaints' | 'rbac'
  const [focusTargetId, setFocusTargetId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleNavigateTab = (tab, targetId = null) => {
    setActiveTab(tab);
    if (targetId) {
      setFocusTargetId(targetId);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTestEndpoint = async (endpoint, label) => {
    setTesting(true);
    const res = await testApiAccess(endpoint);
    setTesting(false);
    setTestResult({
      endpoint,
      label,
      status: res.status,
      ok: res.ok,
      data: res.data,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center ring-4 ring-amber-50 border border-amber-200">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-slate-900">Campus Operations & Administration</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Role: Admin
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gold-100 text-gold-900 border border-gold-300">
                  LPU
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Admin User: <span className="font-bold text-slate-900">{user?.name}</span>
                {user?.regNo && (
                  <span className="ml-2 font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    ID: {user.regNo}
                  </span>
                )}
                <span className="text-slate-400 mx-2">&bull;</span>
                <span className="font-semibold text-brand-800">{user?.department || 'Hostel Administration'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-brand-800 hover:bg-brand-900 shadow-md shadow-brand-900/10 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 mb-6 overflow-x-auto">
          <button
            id="tab-admin-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'analytics'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Campus Metrics</span>
          </button>

          <button
            id="tab-admin-assistant"
            onClick={() => setActiveTab('assistant')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'assistant'
                ? 'border-brand-800 text-brand-800 bg-brand-50/50'
                : 'border-transparent text-brand-900 hover:text-brand-800 bg-gold-400/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-gold-600" />
            <span className="font-black">AI Operations Assistant</span>
          </button>

          <button
            id="tab-admin-maintenance"
            onClick={() => setActiveTab('maintenance')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'maintenance'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Predictive Maintenance</span>
          </button>

          <button
            id="tab-admin-facilities"
            onClick={() => setActiveTab('facilities')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'facilities'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Facility Governance</span>
          </button>

          <button
            id="tab-admin-queue"
            onClick={() => setActiveTab('queue')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'queue'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Queue Operations Console</span>
          </button>

          <button
            id="tab-admin-services"
            onClick={() => setActiveTab('services')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'services'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Service Governance Desk</span>
          </button>

          <button
            id="tab-admin-complaints"
            onClick={() => setActiveTab('complaints')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'complaints'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Complaint Management</span>
          </button>

          <button
            id="tab-admin-logs"
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'logs'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Security &amp; Activity Logs</span>
          </button>

          <button
            id="tab-admin-rbac"
            onClick={() => setActiveTab('rbac')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'rbac'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>RBAC Verification (Phase 1)</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && (
          <CampusXAdminDashboard onNavigateTab={handleNavigateTab} />
        )}

        {activeTab === 'logs' && <AdminActivityLogs />}

        {activeTab === 'assistant' && <AdminAssistantConsole />}

        {activeTab === 'maintenance' && (
          <AdminEquipmentMaintenance initialSearchQuery={focusTargetId} />
        )}

        {activeTab === 'facilities' && <AdminResourceManagement />}

        {activeTab === 'queue' && <AdminQueueConsole />}

        {activeTab === 'services' && <StaffServiceApprovalQueue />}

        {activeTab === 'complaints' && <AdminComplaintManagement />}

        {activeTab === 'rbac' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="w-5 h-5 text-amber-700" />
              <h2 className="text-lg font-bold text-slate-900">Admin Permission Verification</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Verify operations endpoints vs higher-tier superadmin boundaries:
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => handleTestEndpoint('/api/test/admin-only', 'Admin Route')}
                disabled={testing}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                Test Authorized Admin Endpoint (GET /api/test/admin-only)
              </button>

              <button
                onClick={() => handleTestEndpoint('/api/test/superadmin-only', 'Super Admin Route')}
                disabled={testing}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
              >
                Test Restricted Super Admin Route (GET /api/test/superadmin-only)
              </button>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border font-mono text-xs ${
                  testResult.ok
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-red-50/70 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">
                    {testResult.ok ? '✓ 200 OK — ACCESS GRANTED' : '✗ 403 FORBIDDEN — ACCESS BLOCKED'}
                  </span>
                  <span className="text-[10px] text-slate-500">{testResult.timestamp}</span>
                </div>
                <p className="mb-1"><strong>Endpoint:</strong> {testResult.endpoint}</p>
                <pre className="mt-2 p-2 bg-white/70 rounded border border-slate-200 overflow-x-auto">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CampusX AI Assistant floating widget */}
      <FloatingAssistantWidget />
    </div>
  );
}
