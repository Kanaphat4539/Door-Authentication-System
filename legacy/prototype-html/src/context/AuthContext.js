import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // ดึง Token และ User มาจากคนที่ 1 (เก็บไว้ใน localStorage key: 'token' และ 'user')
  const [auth, setAuth] = useState(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';
    let user = { username: 'Teacher', role: 'teacher' };
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) user = JSON.parse(storedUser);
    } catch {
      // fallback
    }
    return { token, user, isAuthenticated: !!token };
  });

  const logout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setAuth({ token: '', user: null, isAuthenticated: false });
    window.location.href = '../login/index.html';
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token') || '';
      let user = null;
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) user = JSON.parse(storedUser);
      } catch {
        // ignore
      }
      setAuth({ token, user, isAuthenticated: !!token });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);