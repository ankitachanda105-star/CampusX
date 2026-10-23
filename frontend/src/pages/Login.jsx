import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CAMPUS_CONFIG } from '../config/campus';
import {
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Building2,
  ShieldCheck,
  UserCog
} from 'lucide-react';

const ROLES = ['Student', 'Faculty/Staff', 'Admin', 'Super Admin'];

const DEMO_CREDENTIALS = [
  { role: 'Student', identifier: '12345678', email: 'alex.12345678@lpu.in', pass: 'Student@123', label: 'Student (Reg No: 12345678)' },
  { role: 'Faculty/Staff', identifier: 'EMP20491', email: 'eleanor.vance@lpu.in', pass: 'Faculty@123', label: 'Faculty (EMP20491 - CSE)' },
  { role: 'Admin', identifier: 'ADM10822', email: 'marcus.admin@lpu.in', pass: 'Admin@123', label: 'Admin (ADM10822 - Hostels)' },
  { role: 'Super Admin', identifier: 'DIR001', email: 'sarah.jenkins@lpu.in', pass: 'SuperAdmin@123', label: 'Super Admin (DIR001 - Directorate)' },
];

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, getDashboardPathForRole } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!identifier.trim()) {
      setError('Please enter your LPU Registration Number, Employee ID, or institutional email.');
      return false;
    }
    if (!password) {
      setError('Please enter your account password.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (!role) {
      setError('Please select your institutional role.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const result = await login(identifier.trim(), password, role);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'Authentication failed. Please check credentials.');
      return;
    }

    // Role-based redirect
    const targetPath = getDashboardPathForRole(result.user.role);
    navigate(targetPath, { replace: true });
  };

  const handleQuickFill = (demo) => {
    setIdentifier(demo.identifier);
    setPassword(demo.pass);
    setRole(demo.role);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background LPU Gold & Maroon Accents */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-gold-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-800 to-brand-950 text-white shadow-xl shadow-black/40 mb-3.5 border-2 border-gold-400/40">
            <span className="text-2xl font-black text-gold-400 tracking-wider">LPU</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            CampusX
          </h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-gold-400">
            {CAMPUS_CONFIG.university.name}
          </p>
          <p className="text-xs text-slate-400 font-medium">
            {CAMPUS_CONFIG.university.location}
          </p>

          <div className="inline-flex items-center space-x-1.5 mt-3 px-3 py-1 rounded-full bg-brand-950/80 border border-gold-500/30 text-[11px] font-semibold text-gold-300">
            <Sparkles className="w-3 h-3 text-gold-400" />
            <span>Smart Campus Operations &bull; Module 1 Auth</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="mt-7 bg-white/95 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/20">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900">Sign in to CampusX</h2>
            <p className="text-xs text-slate-500 mt-1">
              Authenticate using your LPU Reg No, Staff ID, or university email.
            </p>
          </div>

          {/* User-visible error alert */}
          {error && (
            <div
              id="login-error-alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start space-x-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Dropdown */}
            <div>
              <label htmlFor="role-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Institutional Role
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4 text-brand-800" />
                </div>
                <select
                  id="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email / Reg No / ID Field */}
            <div>
              <label htmlFor="email-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registration No / Employee ID / Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="email-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 12345678 or student@lpu.in"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-brand-800 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="login-submit-button"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-brand-800 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-800 border border-gold-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 text-gold-300" />
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
              LPU Demo Credentials (Click to Autofill)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((demo) => (
                <button
                  key={demo.role}
                  id={`demo-btn-${demo.role.toLowerCase().replace('/', '-')}`}
                  type="button"
                  onClick={() => handleQuickFill(demo)}
                  className="text-left px-2.5 py-2 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 text-[11px] font-medium text-slate-700 transition-colors"
                >
                  <div className="font-bold text-brand-800 flex items-center justify-between">
                    <span>{demo.role}</span>
                    <span className="font-mono text-[10px] bg-gold-100 text-gold-900 px-1 rounded">
                      {demo.identifier}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[10px] truncate mt-0.5">{demo.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-400 mt-5">
          Lovely Professional University &bull; Campus Operations & Intelligence Platform
        </p>
      </div>
    </div>
  );
}
