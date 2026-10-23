import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CAMPUS_CONFIG } from '../config/campus';
import { ShieldAlert, LogOut, Home } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Unauthorized() {
  const { role, user, getDashboardPathForRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const attemptedPath = location.state?.attemptedPath || 'Restricted Area';
  const userRole = location.state?.userRole || role || 'Unknown';
  const homePath = getDashboardPathForRole(userRole);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div
          id="unauthorized-card"
          className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-800 flex items-center justify-center mx-auto mb-5 ring-8 ring-brand-50/50 border border-brand-200">
            <ShieldAlert className="w-8 h-8 text-brand-800" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-900 mb-2 border border-red-200">
            HTTP 403 Forbidden
          </span>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Access Restricted
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Your institutional role at <strong>{CAMPUS_CONFIG.university.name}</strong> does not possess the permissions required to view this resource.
          </p>

          {/* Diagnostic Context Box */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-500">Attempted Route:</span>
              <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {attemptedPath}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-500">Your Current Role:</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {userRole}
              </span>
            </div>
            {user?.regNo && (
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Reg No / ID:</span>
                <span className="font-mono font-medium text-slate-700">{user.regNo}</span>
              </div>
            )}
            {user?.department && (
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Department:</span>
                <span className="font-medium text-slate-700">{user.department}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={homePath}
              id="back-to-dashboard-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-md shadow-brand-900/15 border border-gold-500/20 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to My Dashboard
            </Link>

            <button
              onClick={handleLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
