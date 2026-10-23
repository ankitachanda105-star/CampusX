import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CAMPUS_CONFIG } from '../../config/campus';
import Navbar from '../../components/Navbar';
import CampusXAdminDashboard from '../analytics/CampusXAdminDashboard';
import FloatingAssistantWidget from '../../components/FloatingAssistantWidget';
import { UserCog, LogOut, CheckCircle2, Clock, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const { user, logout, testApiAccess } = useAuth();
  const navigate = useNavigate();
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
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center ring-4 ring-purple-50 border border-purple-200">
              <UserCog className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-slate-900">University Directorate Governance</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-300">
                  Role: Super Admin
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gold-100 text-gold-900 border border-gold-300">
                  LPU
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Executive Officer: <span className="font-bold text-slate-900">{user?.name}</span>
                {user?.regNo && (
                  <span className="ml-2 font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    ID: {user.regNo}
                  </span>
                )}
                <span className="text-slate-400 mx-2">&bull;</span>
                <span className="font-semibold text-brand-800">{user?.department || 'Student Welfare / Directorate'}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Highest Privilege</span>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-slate-900">Global Root Authority</div>
            <p className="text-xs text-slate-500 mt-1 font-mono">Full Cross-Role Permissions</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Jurisdiction</span>
              <Sparkles className="w-4 h-4 text-gold-600" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{CAMPUS_CONFIG.university.name}</div>
            <p className="text-xs text-slate-500 mt-0.5">Full Institutional Governance</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Governance</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-slate-900">Phase 1 Foundation</div>
            <p className="text-xs text-slate-500 mt-1">Audit logs & user control queued</p>
          </div>
        </div>

        <div className="mb-8">
          <CampusXAdminDashboard />
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <Lock className="w-5 h-5 text-purple-700" />
            <h2 className="text-lg font-bold text-slate-900">Governance Clearance Verification</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Test Super Admin access across admin and governance endpoints:
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => handleTestEndpoint('/api/test/admin-only', 'Admin Route')}
              disabled={testing}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Test Admin Operations Route (GET /api/test/admin-only)
            </button>

            <button
              onClick={() => handleTestEndpoint('/api/test/superadmin-only', 'Super Admin Route')}
              disabled={testing}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
            >
              Test Super Admin Route (GET /api/test/superadmin-only)
            </button>
          </div>

          {testResult && (
            <div
              className="p-4 rounded-xl border font-mono text-xs bg-purple-50/70 border-purple-200 text-purple-900"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">✓ 200 OK — ACCESS GRANTED</span>
                <span className="text-[10px] text-slate-500">{testResult.timestamp}</span>
              </div>
              <p className="mb-1"><strong>Endpoint:</strong> {testResult.endpoint}</p>
              <pre className="mt-2 p-2 bg-white/70 rounded border border-slate-200 overflow-x-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </main>

      {/* CampusX AI Operations & Support Assistant */}
      <FloatingAssistantWidget />
    </div>
  );
}
