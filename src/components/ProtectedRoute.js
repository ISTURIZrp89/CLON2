import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="loading"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole && userData?.rol !== requiredRole && userData?.rol !== 'administrador') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        textAlign: 'center',
        padding: '24px'
      }}>
        <i className="mdi mdi-shield-alert" style={{ fontSize: '4rem', color: 'var(--action-error)' }}></i>
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta página.</p>
        <p>Rol requerido: <strong>{requiredRole}</strong></p>
        <p>Tu rol: <strong>{userData?.rol || 'Sin rol'}</strong></p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
