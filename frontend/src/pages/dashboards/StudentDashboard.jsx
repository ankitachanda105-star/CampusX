import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import Navbar from '../../components/Navbar';
import ReportProblem from '../complaints/ReportProblem';
import MyComplaints from '../complaints/MyComplaints';
import StudentQueue from '../queue/StudentQueue';
import ServiceCatalogue from '../services/ServiceCatalogue';
import ServiceRequestTracker from '../services/ServiceRequestTracker';
import ResourceCatalogue from '../resources/ResourceCatalogue';
import MyBookings from '../resources/MyBookings';
import StudentResourceAvailability from '../resources/StudentResourceAvailability';
import FloatingAssistantWidget from '../../components/FloatingAssistantWidget';
import {
  GraduationCap,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  Building,
  PlusCircle,
  ListFilter,
  ShieldAlert,
  Ticket,
  FileCheck2,
  Layers,
  Sparkles
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, logout, testApiAccess } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'my-complaints' | 'queue' | 'services' | 'resources' | 'rbac'
  const [serviceSubTab, setServiceSubTab] = useState('catalogue'); // 'catalogue' | 'tracker'
  const [resourceSubTab, setResourceSubTab] = useState('catalogue'); // 'catalogue' | 'bookings'
  const [trackerRequestId, setTrackerRequestId] = useState(null);
  const [prefillComplaintData, setPrefillComplaintData] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

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
        {/* Welcome Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-800 flex items-center justify-center ring-4 ring-brand-50/50 border border-brand-200">
              <GraduationCap className="w-7 h-7 text-brand-800" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-slate-900">Student Portal</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-brand-50 text-brand-800 border border-brand-200">
                  Role: Student
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gold-100 text-gold-900 border border-gold-300">
                  LPU Phagwara
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Welcome back, <span className="font-bold text-slate-900">{user?.name}</span>
                {user?.regNo && (
                  <span className="ml-2 font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    Reg No: {user.regNo}
                  </span>
                )}
                <span className="text-slate-400 mx-2">&bull;</span>
                <span className="text-slate-500">{user?.email}</span>
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

        {/* Feature Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 mb-6 overflow-x-auto">
          <button
            id="tab-student-queue"
            onClick={() => setActiveTab('queue')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'queue'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Smart Queue (Tokens)</span>
          </button>

          <button
            id="tab-student-services"
            onClick={() => setActiveTab('services')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'services'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>College Service Hub</span>
          </button>

          <button
            id="tab-student-resources"
            onClick={() => setActiveTab('resources')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'resources'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Resource Availability</span>
          </button>

          <button
            id="tab-report-problem"
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'report'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report a Problem</span>
          </button>

          <button
            id="tab-my-complaints"
            onClick={() => setActiveTab('my-complaints')}
            className={`inline-flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'my-complaints'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>My Complaints</span>
          </button>

          <button
            id="tab-rbac"
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
        {activeTab === 'queue' && <StudentQueue />}

        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Sub-navigation for Service Hub */}
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl w-fit">
              <button
                id="subtab-service-catalogue"
                onClick={() => setServiceSubTab('catalogue')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  serviceSubTab === 'catalogue'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Service Catalogue (Apply)
              </button>
              <button
                id="subtab-service-tracker"
                onClick={() => setServiceSubTab('tracker')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  serviceSubTab === 'tracker'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Track Applications & Stepper
              </button>
            </div>

            {serviceSubTab === 'catalogue' ? (
              <ServiceCatalogue
                onApplicationSuccess={(req) => {
                  setTrackerRequestId(req.requestId);
                  setServiceSubTab('tracker');
                }}
              />
            ) : (
              <ServiceRequestTracker initialSelectedId={trackerRequestId} />
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <StudentResourceAvailability />
        )}

        {activeTab === 'report' && (
          <ReportProblem
            prefillData={prefillComplaintData}
            onComplaintSubmitted={() => {
              setPrefillComplaintData(null);
            }}
            onViewMyComplaints={() => setActiveTab('my-complaints')}
          />
        )}

        {activeTab === 'my-complaints' && (
          <MyComplaints
            onNewComplaintClick={() => setActiveTab('report')}
          />
        )}

        {activeTab === 'rbac' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200">
            <div className="flex items-center space-x-3 mb-3">
              <Lock className="w-5 h-5 text-brand-800" />
              <h2 className="text-lg font-bold text-slate-900">Live Role-Based Access Control (RBAC) Verification</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Test how the backend Express middleware enforces permissions against your Student JWT Bearer token:
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                id="test-student-endpoint-btn"
                onClick={() => handleTestEndpoint('/api/test/student-only', 'Student Route')}
                disabled={testing}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                Test Authorized Route (GET /api/test/student-only)
              </button>

              <button
                id="test-admin-endpoint-btn"
                onClick={() => handleTestEndpoint('/api/test/admin-only', 'Admin Route')}
                disabled={testing}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
              >
                Test Restricted Route (GET /api/test/admin-only)
              </button>

              <Link
                to="/admin/dashboard"
                id="attempt-admin-dashboard-link"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors inline-flex items-center"
              >
                Attempt Navigation to /admin/dashboard
              </Link>
            </div>

            {/* Test Output Box */}
            {testResult && (
              <div
                id="rbac-test-output"
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
                <p className="mb-1"><strong>Response Status:</strong> HTTP {testResult.status}</p>
                <pre className="mt-2 p-2 bg-white/70 rounded border border-slate-200 overflow-x-auto">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CampusX AI Operations & Support Assistant (Module 8) */}
      <FloatingAssistantWidget
        onPrefillComplaint={(payload) => {
          setPrefillComplaintData(payload);
          setActiveTab('report');
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
      />
    </div>
  );
}
