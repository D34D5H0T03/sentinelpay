import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import { ROLE_HOME } from '../lib/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (phone, password) => {
    const loggedInUser = await authApi.login(phone, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload) => {
    const newUser = await authApi.register(payload);
    return newUser;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const getRoleHome = (customUser = user) => {
    if (!customUser || !customUser.roles || customUser.roles.length === 0) {
      return '/login';
    }
    const primaryRole = customUser.roles[0];
    return ROLE_HOME[primaryRole] || '/dashboard';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: initAuth,
        getRoleHome,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
