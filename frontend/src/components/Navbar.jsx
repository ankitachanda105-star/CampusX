import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CAMPUS_CONFIG } from '../config/campus';
import {
  LogOut,
  ShieldCheck,
  GraduationCap,
  Building2,
  UserCog,
  Bell,
  Check,
  Clock,
  Sparkles,
  Ticket,
  FileText
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout, token } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      // Silently handle
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, [token]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'Super Admin':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'Admin':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Faculty/Staff':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'Student':
      default:
        return 'bg-brand-50 text-brand-800 border-brand-200';
    }
  };

  const getRoleIcon = (r) => {
    switch (r) {
      case 'Super Admin':
        return <UserCog className="w-3.5 h-3.5 mr-1 text-purple-700" />;
      case 'Admin':
        return <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-700" />;
      case 'Faculty/Staff':
        return <Building2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />;
      case 'Student':
      default:
        return <GraduationCap className="w-3.5 h-3.5 mr-1 text-brand-700" />;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-800 to-brand-900 flex items-center justify-center text-white shadow-md shadow-brand-900/20 font-black text-base border border-gold-500/30">
              <span className="text-gold-400">CX</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  CampusX
                </span>
                <span className="text-slate-300 font-light hidden sm:inline">&bull;</span>
                <span className="text-xs sm:text-sm font-bold text-brand-800 tracking-tight hidden sm:inline">
                  {CAMPUS_CONFIG.university.name}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-gold-100 text-gold-900 border border-gold-300">
                  LPU
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {CAMPUS_CONFIG.university.location}
              </p>
            </div>
          </div>

          {/* User Profile, Notifications & Actions */}
          {user && (
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* In-app Notification Bell with Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="navbar-notification-bell"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="relative p-2 text-slate-600 hover:text-brand-800 hover:bg-brand-50 rounded-xl border border-slate-200 hover:border-brand-200 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span
                      id="notification-badge-count"
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center ring-2 ring-white animate-bounce"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div
                    id="notification-dropdown-menu"
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Bell className="w-4 h-4 text-brand-800" />
                        <span className="text-xs font-black text-slate-900">
                          Notifications ({notifications.length})
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-brand-800 hover:text-brand-900 font-bold"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`p-3.5 text-xs transition-colors ${
                              n.read ? 'bg-white text-slate-600' : 'bg-amber-50/50 text-slate-900 font-medium'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-bold text-slate-900 flex items-center space-x-1">
                                {n.type === 'QUEUE_ALERT' ? (
                                  <Ticket className="w-3.5 h-3.5 text-amber-600 inline mr-1" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-brand-800 inline mr-1" />
                                )}
                                <span>{n.title}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-slate-900 flex items-center justify-end space-x-1.5">
                  <span>{user.name}</span>
                  {user.regNo && (
                    <span className="font-mono text-xs font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                      {user.regNo}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {user.department ? `${user.department}` : user.email}
                </div>
              </div>

              <span
                className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${getRoleBadgeStyle(
                  role
                )}`}
              >
                {getRoleIcon(role)}
                {role}
              </span>

              <button
                id="logout-button"
                onClick={handleLogout}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-800 hover:bg-brand-50 rounded-lg border border-slate-200 hover:border-brand-200 transition-colors duration-150"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
