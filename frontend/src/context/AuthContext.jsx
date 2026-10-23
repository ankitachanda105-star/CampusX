import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('campusx_token');
    const savedUser = localStorage.getItem('campusx_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse cached user data:', e);
        localStorage.removeItem('campusx_token');
        localStorage.removeItem('campusx_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      // Persist auth data
      localStorage.setItem('campusx_token', data.token);
      localStorage.setItem('campusx_user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('campusx_token');
    localStorage.removeItem('campusx_user');
    setToken(null);
    setUser(null);
  };

  const getDashboardPathForRole = (userRole) => {
    switch (userRole) {
      case 'Student':
        return '/student/dashboard';
      case 'Faculty/Staff':
        return '/faculty/dashboard';
      case 'Admin':
        return '/admin/dashboard';
      case 'Super Admin':
        return '/superadmin/dashboard';
      default:
        return '/login';
    }
  };

  const testApiAccess = async (endpoint) => {
    if (!token) {
      return { status: 401, data: { message: 'No authentication token available' } };
    }

    try {
      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      return { status: res.status, ok: res.ok, data };
    } catch (err) {
      return { status: 500, ok: false, data: { message: err.message } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        role: user?.role || null,
        loading,
        login,
        logout,
        getDashboardPathForRole,
        testApiAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
