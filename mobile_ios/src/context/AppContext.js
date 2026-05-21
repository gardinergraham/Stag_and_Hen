import React, { createContext, useContext, useState, useEffect } from 'react';
import { sessionStorage } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const savedSession = await sessionStorage.getSession();
      if (savedSession) {
        setSession(savedSession);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (sessionData) => {
    await sessionStorage.saveSession(sessionData);
    setSession(sessionData);
  };

  const logout = async () => {
    await sessionStorage.clearSession();
    setSession(null);
  };

  const updateSession = async (updates) => {
    const newSession = { ...session, ...updates };
    await sessionStorage.saveSession(newSession);
    setSession(newSession);
  };

  return (
    <AppContext.Provider
      value={{
        session,
        loading,
        isLoggedIn: !!session,
        isOwner: session?.role === 'owner',
        login,
        logout,
        updateSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
