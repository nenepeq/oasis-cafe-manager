import React, { createContext, useContext, useState, useEffect } from 'react';
import * as apiService from '../services/apiService';

const AuthContext = createContext();

/**
 * Contexto de Autenticación y Perfil de Usuario.
 * Gestiona: usuario, rol, login y logout.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('ventas');

  const fetchProfile = async (currentUser) => {
    setUser(currentUser);
    const { data } = await apiService.getUserRole(currentUser.id);
    if (data && data.role) setUserRole(data.role);
  };

  const login = async (email, password) => {
    const { data, error } = await apiService.signIn(email, password);
    if (!error && data?.user) {
      await fetchProfile(data.user);
    }
    return { data, error };
  };

  const handleLogout = async () => {
    await apiService.signOut();
    setUser(null);
    setUserRole('ventas');
  };

  // Recuperar sesión al cargar
  useEffect(() => {
    apiService.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, setUser, userRole, setUserRole,
      fetchProfile, login, handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
