import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserDebugInfo = () => {
  const { userData } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <strong>Debug - Usuario Actual:</strong><br/>
      <strong>Nombre:</strong> {userData?.nombre || 'N/A'}<br/>
      <strong>Email:</strong> {userData?.email || 'N/A'}<br/>
      <strong>Rol (rol):</strong> {userData?.rol || 'N/A'}<br/>
      <strong>Rol (role):</strong> {userData?.role || 'N/A'}<br/>
      <strong>ID:</strong> {userData?.id || 'N/A'}<br/>
      <strong>Es Admin (rol):</strong> {userData?.rol === 'administrador' ? 'SÍ' : 'NO'}<br/>
      <strong>Es Admin (role):</strong> {userData?.role === 'administrador' ? 'SÍ' : 'NO'}
    </div>
  );
};

export default UserDebugInfo;
