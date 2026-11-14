'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearToken, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTok] = useState(null);
  const [ready, setReady] = useState(false); // true once we have checked localStorage

  useEffect(() => {
    setTok(getToken());
    setReady(true);
  }, []);

  const signIn = useCallback((t) => {
    setToken(t);
    setTok(t);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setTok(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
