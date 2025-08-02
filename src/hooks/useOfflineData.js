import { useState, useEffect, useCallback, useRef } from 'react';
import firebaseService from '../services/FirebaseService';

/**
 * Hook personalizado para gestión optimizada de datos con persistencia offline
 * @param {string} collectionName - Nombre de la colección de Firestore
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Estado y funciones para gestión de datos
 */
export const useOfflineData = (collectionName, options = {}) => {
  const {
    orderBy = 'created_at',
    orderDirection = 'desc',
    autoRefresh = true,
    refreshInterval = 30000, // 30 segundos
    enableRealTime = true,
    filters = []
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(firebaseService.getConnectionStatus());

  const refreshIntervalRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Función para cargar datos
  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      console.log(`🔄 Cargando datos de ${collectionName}...`);
      
      const result = await firebaseService.getAll(collectionName, orderBy, orderDirection);
      
      if (result.success) {
        setData(result.data || []);
        setFromCache(result.fromCache || result.offline || false);
        setLastUpdated(new Date());
        console.log(`✅ Datos de ${collectionName} cargados: ${result.data?.length || 0} documentos ${result.fromCache ? '(desde caché)' : '(desde servidor)'}`);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      console.error(`❌ Error cargando ${collectionName}:`, err);
      setError(err.message);
      
      // Intentar cargar desde caché local como último recurso
      try {
        const offlineData = JSON.parse(localStorage.getItem('labflow_offline_data') || '{}');
        const cachedData = offlineData[collectionName] || [];
        setData(cachedData);
        setFromCache(true);
        console.log(`📦 Datos de ${collectionName} cargados desde caché local: ${cachedData.length} documentos`);
      } catch (cacheError) {
        console.error('Error cargando desde caché local:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [collectionName, orderBy, orderDirection]);

  // Función para configurar listener en tiempo real
  const setupRealTimeListener = useCallback(() => {
    if (!enableRealTime) return;

    console.log(`🔴 Configurando listener en tiempo real para ${collectionName}`);
    
    const unsubscribe = firebaseService.listenToCollection(
      collectionName,
      (documents, metadata = {}) => {
        console.log(`🔄 Actualización en tiempo real de ${collectionName}: ${documents.length} documentos`);
        setData(documents);
        setFromCache(metadata.fromCache || metadata.offline || false);
        setLastUpdated(new Date());
        setError(null);
      },
      filters
    );

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [collectionName, enableRealTime, filters]);

  // Función para actualizar el estado de conexión
  const updateConnectionStatus = useCallback(() => {
    const status = firebaseService.getConnectionStatus();
    setConnectionStatus(status);
  }, []);

  // Efecto principal - configuración inicial
  useEffect(() => {
    loadData(true);
    updateConnectionStatus();

    // Configurar listener en tiempo real si está habilitado
    if (enableRealTime) {
      setupRealTimeListener();
    }

    // Configurar auto-refresh si está habilitado
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!enableRealTime) { // Solo auto-refresh si no hay listener en tiempo real
          loadData(false);
        }
        updateConnectionStatus();
      }, refreshInterval);
    }

    // Listener para cambios de conectividad
    const handleOnline = () => {
      console.log(`🌐 Conexión restaurada, recargando ${collectionName}`);
      updateConnectionStatus();
      loadData(false);
    };

    const handleOffline = () => {
      console.log(`📴 Conexión perdida, usando caché para ${collectionName}`);
      updateConnectionStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [collectionName, orderBy, orderDirection, autoRefresh, refreshInterval, enableRealTime, filters]);

  // Función para refrescar manualmente
  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // Función para crear documento
  const createDocument = useCallback(async (documentData) => {
    try {
      setError(null);
      const result = await firebaseService.create(collectionName, documentData);
      
      if (result.success) {
        console.log(`✅ Documento creado en ${collectionName}: ${result.id}`);
        
        // Actualizar datos locales si no hay listener en tiempo real
        if (!enableRealTime) {
          await loadData(false);
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Error creando documento');
      }
    } catch (err) {
      console.error(`❌ Error creando documento en ${collectionName}:`, err);
      setError(err.message);
      throw err;
    }
  }, [collectionName, enableRealTime, loadData]);

  // Función para actualizar documento
  const updateDocument = useCallback(async (documentId, updateData) => {
    try {
      setError(null);
      const result = await firebaseService.update(collectionName, documentId, updateData);
      
      if (result.success) {
        console.log(`✅ Documento actualizado en ${collectionName}: ${documentId}`);
        
        // Actualizar datos locales si no hay listener en tiempo real
        if (!enableRealTime) {
          await loadData(false);
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Error actualizando documento');
      }
    } catch (err) {
      console.error(`❌ Error actualizando documento en ${collectionName}:`, err);
      setError(err.message);
      throw err;
    }
  }, [collectionName, enableRealTime, loadData]);

  // Función para eliminar documento
  const deleteDocument = useCallback(async (documentId) => {
    try {
      setError(null);
      const result = await firebaseService.delete(collectionName, documentId);
      
      if (result.success) {
        console.log(`✅ Documento eliminado de ${collectionName}: ${documentId}`);
        
        // Actualizar datos locales si no hay listener en tiempo real
        if (!enableRealTime) {
          await loadData(false);
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Error eliminando documento');
      }
    } catch (err) {
      console.error(`❌ Error eliminando documento de ${collectionName}:`, err);
      setError(err.message);
      throw err;
    }
  }, [collectionName, enableRealTime, loadData]);

  return {
    // Estado
    data,
    loading,
    error,
    fromCache,
    lastUpdated,
    connectionStatus,
    
    // Funciones
    refresh,
    createDocument,
    updateDocument,
    deleteDocument,
    
    // Metadata
    isEmpty: data.length === 0,
    count: data.length,
    isOnline: connectionStatus.online && connectionStatus.firebase,
    isOffline: !connectionStatus.online || !connectionStatus.firebase
  };
};

export default useOfflineData;
