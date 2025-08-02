import React, { useState, useEffect } from 'react';
import firebaseService from '../../services/FirebaseService';
import './ConnectionStatus.css';

const ConnectionStatus = ({ minimized = false }) => {
  const [status, setStatus] = useState({
    online: true,
    firebase: false,
    mode: 'checking',
    offlinePersistence: false,
    cacheSize: { totalDocuments: 0, collections: 0, sizeKB: 0 }
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const connectionStatus = firebaseService.getConnectionStatus();
      setStatus(connectionStatus);
    };

    // Actualizar estado inicial
    updateStatus();

    // Actualizar cada 30 segundos
    const interval = setInterval(updateStatus, 30000);

    // Listener para cambios de red
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = () => {
    if (status.mode === 'online') return '🟢';
    if (status.mode === 'offline' && status.cacheSize.totalDocuments > 0) return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (status.mode === 'online') return 'En línea';
    if (status.mode === 'offline' && status.cacheSize.totalDocuments > 0) return 'Offline con caché';
    return 'Offline sin datos';
  };

  const clearCache = () => {
    try {
      localStorage.removeItem('labflow_offline_data');
      setStatus(prev => ({
        ...prev,
        cacheSize: { totalDocuments: 0, collections: 0, sizeKB: 0 }
      }));
      alert('Caché limpiado correctamente');
    } catch (error) {
      alert('Error al limpiar el caché');
    }
  };

  if (minimized) {
    return (
      <div className="connection-status-mini" title={getStatusText()}>
        <span className="status-icon">{getStatusIcon()}</span>
      </div>
    );
  }

  return (
    <div className="connection-status">
      <div 
        className="status-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="status-details">
          <div className="status-row">
            <span className="label">Red:</span>
            <span className={`value ${status.online ? 'online' : 'offline'}`}>
              {status.online ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="status-row">
            <span className="label">Firebase:</span>
            <span className={`value ${status.firebase ? 'connected' : 'disconnected'}`}>
              {status.firebase ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="status-row">
            <span className="label">Persistencia:</span>
            <span className={`value ${status.offlinePersistence ? 'enabled' : 'disabled'}`}>
              {status.offlinePersistence ? 'Habilitada' : 'Deshabilitada'}
            </span>
          </div>
          
          <div className="cache-info">
            <h4>Caché Offline:</h4>
            <div className="cache-stats">
              <div className="cache-stat">
                <span className="cache-number">{status.cacheSize.totalDocuments}</span>
                <span className="cache-label">Documentos</span>
              </div>
              <div className="cache-stat">
                <span className="cache-number">{status.cacheSize.collections}</span>
                <span className="cache-label">Colecciones</span>
              </div>
              <div className="cache-stat">
                <span className="cache-number">{status.cacheSize.sizeKB}KB</span>
                <span className="cache-label">Tamaño</span>
              </div>
            </div>
            
            {status.cacheSize.totalDocuments > 0 && (
              <button className="clear-cache-btn" onClick={clearCache}>
                Limpiar Caché
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
