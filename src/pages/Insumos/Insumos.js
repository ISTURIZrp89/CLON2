import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import syncService from '../../services/SyncService';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import useOfflineData from '../../hooks/useOfflineData';
import './Insumos.css';

const Insumos = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const { userData } = useAuth();

  // Usar hooks de persistencia offline
  const {
    data: insumos,
    loading,
    error,
    fromCache,
    lastUpdated,
    refresh,
    createDocument,
    updateDocument,
    deleteDocument,
    isOnline,
    isOffline
  } = useOfflineData('insumos', {
    orderBy: 'nombre',
    orderDirection: 'asc',
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTime: true
  });

  const {
    data: lotes,
    createDocument: createLote,
    updateDocument: updateLote,
    deleteDocument: deleteLote
  } = useOfflineData('lotes', {
    orderBy: 'fecha_caducidad',
    orderDirection: 'asc',
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTime: true
  });

  const [filteredInsumos, setFilteredInsumos] = useState([]);

  // Compatibility para código legacy - removed to prevent conflicts with useOfflineData hook
  const [showModal, setShowModal] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [expandedLotes, setExpandedLotes] = useState({});
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [editingLote, setEditingLote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loteForm, setLoteForm] = useState({
    lote: '',
    existencia: '',
    fecha_caducidad: '',
    insumo_id: ''
  });
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    categoria: '',
    unidad_medida: '',
    existencia_total: '',
    stock_minimo: '',
    stock_maximo: '',
    precio_venta: '',
    proveedor: '',
    numero_lote: '',
    fecha_caducidad: '',
    fecha_ingreso: '',
    observaciones: ''
  });

  // Manejar errores de los hooks
  useEffect(() => {
    if (error) {
      showError('Error', `Error cargando insumos: ${error}`);
    }
  }, [error, showError]);

  // Filtrar insumos cuando cambien los datos o el término de búsqueda
  useEffect(() => {
    if (searchTerm) {
      const filtered = insumos.filter(insumo =>
        insumo.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insumo.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insumo.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInsumos(filtered);
    } else {
      setFilteredInsumos(insumos);
    }
  }, [insumos, searchTerm]);

  // Search filtering effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInsumos(insumos);
    } else {
      const filtered = insumos.filter(insumo => {
        const searchLower = searchTerm.toLowerCase();
        return (
          insumo.nombre?.toLowerCase().includes(searchLower) ||
          insumo.codigo?.toLowerCase().includes(searchLower) ||
          insumo.categoria?.toLowerCase().includes(searchLower) ||
        insumo.proveedor?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredInsumos(filtered);
    }
  }, [searchTerm, insumos]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Función para refrescar datos
  const handleRefresh = () => {
    refresh();
    showSuccess('Actualizado', `Datos actualizados ${isOffline ? '(modo offline)' : ''}`);
  };

  const loadInsumos = async () => {
    try {
      const result = await firebaseService.getAll('insumos');
      if (result.success) {
        let insumosData = result.data || [];

        // If no insumos exist, create some sample data
        if (insumosData.length === 0) {
          const sampleInsumos = [
            {
              codigo: 'HCL001',
              nombre: 'Ácido Clorhídrico 37%',
              categoria: 'acidos',
              unidad_medida: 'ml',
              existencia_total: 2500,
              stock_minimo: 500,
              stock_maximo: 5000,
              costo_unitario: 15.50,
              precio_venta: 25.00,
              ubicacion_almacen: 'A-1-B',
              proveedor: 'Química Industrial SA',
              estado: 'activo'
            },
            {
              codigo: 'NAOH001',
              nombre: 'Hidr��xido de Sodio',
              categoria: 'bases',
              unidad_medida: 'g',
              existencia_total: 1000,
              stock_minimo: 200,
              stock_maximo: 2000,
              costo_unitario: 8.75,
              precio_venta: 15.00,
              ubicacion_almacen: 'B-2-C',
              proveedor: 'Reactivos Químicos Ltda',
              estado: 'activo'
            },
            {
              codigo: 'H2SO4001',
              nombre: 'Ácido Sulfúrico 98%',
              categoria: 'acidos',
              unidad_medida: 'ml',
              existencia_total: 800,
              stock_minimo: 100,
              stock_maximo: 1500,
              costo_unitario: 22.00,
              precio_venta: 35.00,
              ubicacion_almacen: 'A-1-A',
              proveedor: 'Química Industrial SA',
              estado: 'activo'
            }
          ];

          for (const insumo of sampleInsumos) {
            try {
              const createResult = await firebaseService.create('insumos', insumo);
              if (createResult.success) {
                insumosData.push({ ...insumo, id: createResult.id });
              }
            } catch (err) {
              console.log('Sample insumo creation:', err.message);
            }
          }
        }

        setInsumos(insumosData);
        setFilteredInsumos(insumosData);

        // Load lotes after insumos are set
        if (insumosData.length > 0) {
          loadLotes(insumosData);
        }
      } else {
        showError('Error', 'No se pudieron cargar los insumos');
      }
    } catch (error) {
      console.error('Error loading insumos:', error);
      showError('Error', 'Error al cargar insumos');
    }
  };

  const loadLotes = async (insumosData = null) => {
    try {
      const result = await firebaseService.getAll('lotes');
      if (result.success) {
        let lotesData = result.data || [];
        // Real lotes data from Firebase

        setLotes(lotesData);
      }
    } catch (error) {
      console.error('Error loading lotes:', error);
    }
  };

  const getLotesForInsumo = (insumoId) => {
    return lotes.filter(lote => lote.insumo_id === insumoId);
  };

  const toggleLotesExpansion = (insumoId) => {
    setExpandedLotes(prev => ({
      ...prev,
      [insumoId]: !prev[insumoId]
    }));
  };

  const handleEditLote = (lote) => {
    console.log('Edit lote:', lote);
    setEditingLote(lote);
    setLoteForm({
      lote: lote.lote || '',
      existencia: lote.existencia || '',
      fecha_caducidad: lote.fecha_caducidad || '',
      insumo_id: lote.insumo_id || ''
    });
    setShowLoteModal(true);
  };

  const handleDeleteLote = async (lote) => {
    if (window.confirm(`¿Estás seguro de eliminar el lote "${lote.lote}"?`)) {
      try {
        const result = await firebaseService.delete('lotes', lote.id);
        if (result.success) {
          // Use sync service to handle the lote deletion
          const syncResult = await syncService.handleLoteDeletion(
            lote,
            userData?.id,
            userData?.nombre
          );

          if (syncResult.success) {
            showSuccess('Éxito', 'Lote eliminado y sincronizado correctamente');
          } else {
            showWarning('Éxito parcial', 'Lote eliminado pero hubo problemas en la sincronización');
          }

          await loadLotes();
          await loadInsumos();
        } else {
          showError('Error', 'No se pudo eliminar el lote');
        }
      } catch (error) {
        console.error('Error deleting lote:', error);
        showError('Error', 'Error al eliminar el lote');
      }
    }
  };

  const handleSaveLote = async () => {
    if (!loteForm.lote || !loteForm.existencia) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const loteData = {
        lote: loteForm.lote,
        existencia: parseInt(loteForm.existencia) || 0,
        fecha_caducidad: loteForm.fecha_caducidad || null,
        insumo_id: loteForm.insumo_id
      };

      if (editingLote) {
        // Get old lote data for sync service
        const oldLoteData = editingLote;

        const result = await firebaseService.update('lotes', editingLote.id, loteData);
        if (result.success) {
          // Use sync service to handle the lote change
          const syncResult = await syncService.handleLoteChange(
            loteData,
            true, // isEdit
            oldLoteData,
            userData?.id,
            userData?.nombre
          );

          if (syncResult.success) {
            showSuccess('Éxito', 'Lote actualizado y sincronizado correctamente');
          } else {
            showWarning('Éxito parcial', 'Lote actualizado pero hubo problemas en la sincronización');
          }

          await loadLotes();
          await loadInsumos();
          handleCloseLoteModal();
        } else {
          showError('Error', 'No se pudo actualizar el lote');
          return;
        }
      } else {
        const result = await firebaseService.create('lotes', loteData);
        if (result.success) {
          // Use sync service to handle the new lote
          const syncResult = await syncService.handleLoteChange(
            loteData,
            false, // isEdit
            null,
            userData?.id,
            userData?.nombre
          );

          if (syncResult.success) {
            showSuccess('Éxito', 'Lote creado y sincronizado correctamente');
          } else {
            showWarning('Éxito parcial', 'Lote creado pero hubo problemas en la sincronización');
          }

          await loadLotes();
          await loadInsumos();
          handleCloseLoteModal();
        } else {
          showError('Error', 'No se pudo crear el lote');
          return;
        }
      }
    } catch (error) {
      console.error('Error saving lote:', error);
      showError('Error', 'Error al guardar el lote');
    }
  };

  const handleCloseLoteModal = () => {
    setShowLoteModal(false);
    setEditingLote(null);
    setLoteForm({
      lote: '',
      existencia: '',
      fecha_caducidad: '',
      insumo_id: ''
    });
  };

  const generateInsumoCode = async () => {
    const prefix = 'INS';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get existing insumos to generate next sequential number
    const result = await firebaseService.getAll('insumos');
    const count = result.success ? result.data.length + 1 : 1;
    const sequence = String(count).padStart(4, '0');

    return `${prefix}-${year}${month}-${sequence}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.categoria) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    // Auto-generate code if not provided
    let codigo = formData.codigo;
    if (!codigo) {
      codigo = await generateInsumoCode();
    }

    try {
      setLoading(true);
      const insumoData = {
        ...formData,
        codigo: codigo,
        existencia_total: parseInt(formData.existencia_total) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 0,
        stock_maximo: parseInt(formData.stock_maximo) || 0,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        fecha_caducidad: formData.fecha_caducidad || null,
        fecha_ingreso: formData.fecha_ingreso || new Date().toISOString().split('T')[0],
        updated_at: new Date()
      };

      if (editingInsumo) {
        // Store old data for sync service
        const oldData = editingInsumo;

        const result = await firebaseService.update('insumos', editingInsumo.id, insumoData);
        if (result.success) {
          // Use sync service to create movement for the change
          const syncResult = await syncService.createMovementFromInsumoChange(
            editingInsumo.id,
            oldData,
            insumoData,
            userData?.id,
            userData?.nombre
          );

          if (syncResult.success) {
            const movementCount = syncResult.movements?.length || 0;
            showSuccess('Éxito', `Insumo actualizado correctamente${movementCount > 0 ? ` (${movementCount} movimiento(s) creado(s))` : ''}`);
          } else {
            showWarning('Éxito parcial', 'Insumo actualizado pero hubo problemas creando los movimientos');
          }

          await loadInsumos();
          await loadLotes();
          handleCloseModal();
        } else {
          showError('Error', 'No se pudo actualizar el insumo');
          return;
        }
      } else {
        insumoData.created_at = new Date();
        const result = await firebaseService.create('insumos', insumoData);
        if (result.success) {
          // For new insumos, create a movement if there's initial stock
          if (insumoData.existencia_total > 0) {
            const syncResult = await syncService.createMovementFromInsumoChange(
              result.id,
              { existencia_total: 0 }, // No previous stock
              insumoData,
              userData?.id,
              userData?.nombre
            );

            if (syncResult.success) {
              showSuccess('Éxito', 'Insumo creado correctamente con movimiento de entrada');
            } else {
              showWarning('Éxito parcial', 'Insumo creado pero hubo problemas creando el movimiento');
            }
          } else {
            showSuccess('Éxito', 'Insumo creado correctamente');
          }

          await loadInsumos();
          await loadLotes();
          handleCloseModal();
        } else {
          showError('Error', 'No se pudo crear el insumo');
          return;
        }
      }
    } catch (error) {
      console.error('Error saving insumo:', error);
      showError('Error', 'Error al guardar el insumo');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (insumo) => {
    setEditingInsumo(insumo);
    setFormData({
      nombre: insumo.nombre || '',
      codigo: insumo.codigo || '',
      categoria: insumo.categoria || '',
      unidad_medida: insumo.unidad_medida || '',
      existencia_total: insumo.existencia_total || '',
      stock_minimo: insumo.stock_minimo || '',
      stock_maximo: insumo.stock_maximo || '',
      precio_venta: insumo.precio_venta || '',
      proveedor: insumo.proveedor || '',
      numero_lote: insumo.numero_lote || '',
      fecha_caducidad: insumo.fecha_caducidad ? (insumo.fecha_caducidad.seconds ? new Date(insumo.fecha_caducidad.seconds * 1000).toISOString().split('T')[0] : insumo.fecha_caducidad) : '',
      fecha_ingreso: insumo.fecha_ingreso ? (insumo.fecha_ingreso.seconds ? new Date(insumo.fecha_ingreso.seconds * 1000).toISOString().split('T')[0] : insumo.fecha_ingreso) : '',
      observaciones: insumo.observaciones || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (insumo) => {
    if (window.confirm(`¿Estás seguro de eliminar el insumo "${insumo.nombre}"?`)) {
      try {
        const result = await firebaseService.delete('insumos', insumo.id);
        if (result.success) {
          showSuccess('Éxito', 'Insumo eliminado correctamente');
          // Force reload after deletion
          await loadInsumos();
          await loadLotes(); // Also reload lotes in case they were related
        } else {
          showError('Error', 'No se pudo eliminar el insumo');
        }
      } catch (error) {
        console.error('Error deleting insumo:', error);
        showError('Error', 'Error al eliminar el insumo');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInsumo(null);
    setFormData({
      nombre: '',
      codigo: '',
      categoria: '',
      unidad_medida: '',
      existencia_total: '',
      stock_minimo: '',
      stock_maximo: '',
    precio_venta: '',
    proveedor: '',
    numero_lote: '',
    fecha_caducidad: '',
    fecha_ingreso: '',
    observaciones: ''
    });
  };

  const checkStockStatus = (insumo) => {
    const existencia = insumo.existencia_total || 0;
    const minimo = insumo.stock_minimo || 0;
    
    if (existencia === 0) return 'agotado';
    if (existencia <= minimo) return 'bajo';
    return 'normal';
  };





  return (
    <div className="insumos-page">
      {/* Estado de Conexión y Persistencia Offline */}
      <ConnectionStatus />

      <div className="page-header">
        <div className="page-title">
          <div className="title-icon">
            <i className="mdi mdi-flask"></i>
          </div>
          <div className="title-content">
            <h1>Gestión de Insumos</h1>
            <p className="page-subtitle">Administra el inventario de reactivos y materiales del laboratorio</p>
          </div>
        </div>
        <div className="header-actions">
          <Button
            variant="secondary"
            icon="mdi-refresh"
            onClick={() => {
              loadInsumos();
              loadLotes();
              showSuccess('Actualizado', 'Lista de insumos actualizada');
            }}
          >
            Actualizar
          </Button>
          <Button
            variant="warning"
            icon="mdi-sync"
            loading={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const result = await syncService.performFullSync(
                  userData?.id,
                  userData?.nombre
                );
                if (result.success) {
                  showSuccess('Sincronización completa', `Procesados: ${result.results.processed}, Actualizados: ${result.results.updated}`);
                  await loadInsumos();
                  await loadLotes();
                } else {
                  showError('Error', 'Error en la sincronización: ' + result.error);
                }
              } catch (error) {
                showError('Error', 'Error al ejecutar la sincronización');
              } finally {
                setSyncing(false);
              }
            }}
          >
            Sincronizar
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowModal(true)}
            icon="mdi-plus"
          >
            Nuevo Insumo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stat-card primary">
          <div className="stat-icon">
            <i className="mdi mdi-flask-outline"></i>
          </div>
          <div className="stat-content">
            <h3>{insumos.length}</h3>
            <p>Total Insumos</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <i className="mdi mdi-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{insumos.filter(i => checkStockStatus(i) === 'normal').length}</h3>
            <p>Stock Normal</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="mdi mdi-alert-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{insumos.filter(i => checkStockStatus(i) === 'bajo').length}</h3>
            <p>Stock Bajo</p>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <i className="mdi mdi-close-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{insumos.filter(i => checkStockStatus(i) === 'agotado').length}</h3>
            <p>Agotados</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <i className="mdi mdi-package-variant"></i>
          </div>
          <div className="stat-content">
            <h3>{lotes.length}</h3>
            <p>Total Lotes</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Search Component */}
        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar insumos por nombre, código, categoría, proveedor o ubicación..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={clearSearch}
              title="Limpiar búsqueda"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="search-results-info">
            <span className="results-count">
              {filteredInsumos.length} de {insumos.length} insumos encontrados
            </span>
            <span className="search-term">
              para "{searchTerm}"
            </span>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading"></div>
            <p>Cargando insumos...</p>
          </div>
        ) : insumos.length === 0 ? (
          <div className="empty-state">
            <i className="mdi mdi-flask empty-icon"></i>
            <h3>No hay insumos registrados</h3>
            <p>Los insumos aparecerán aquí cuando los agregues</p>
          </div>
        ) : (
          <div className="accordion-table">
            <div className="table-header">
              <div className="header-cell expand-header"></div>
              <div className="header-cell">Código</div>
              <div className="header-cell">Nombre</div>
              <div className="header-cell">Categoría</div>
              <div className="header-cell">Existencia</div>
              <div className="header-cell">Stock Mín.</div>
              <div className="header-cell">Acciones</div>
            </div>

            {filteredInsumos.map((insumo) => (
              <div key={insumo.id} className="table-row-group">
                <div className="table-row">
                  <div className="table-cell expand-cell">
                    {(() => {
                      const insumoLotes = getLotesForInsumo(insumo.id);
                      if (insumoLotes.length === 0) return null;

                      const isExpanded = expandedLotes[insumo.id];
                      return (
                        <button
                          className="expand-btn"
                          onClick={() => toggleLotesExpansion(insumo.id)}
                          type="button"
                          title={`${isExpanded ? 'Ocultar' : 'Ver'} ${insumoLotes.length} lote(s)`}
                        >
                          <i className={`mdi ${isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right'}`}></i>
                          <span className="lotes-count-indicator">{insumoLotes.length}</span>
                        </button>
                      );
                    })()}
                  </div>
                  <div className="table-cell">{insumo.codigo}</div>
                  <div className="table-cell font-medium">{insumo.nombre}</div>
                  <div className="table-cell">
                    <span className="category-badge">{insumo.categoria}</span>
                  </div>
                  <div className="table-cell">
                    {(() => {
                      const status = checkStockStatus(insumo);
                      const statusColors = {
                        agotado: 'danger',
                        bajo: 'warning',
                        normal: 'success'
                      };
                      return (
                        <span className={`status-badge ${statusColors[status]}`}>
                          {insumo.existencia_total || 0} {insumo.unidad_medida || ''}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="table-cell">{insumo.stock_minimo || 0}</div>
                  <div className="table-cell">
                    <div className="action-buttons">
                      <Button
                        variant="secondary"
                        size="small"
                        icon="mdi-pencil"
                        onClick={() => handleEdit(insumo)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        icon="mdi-delete"
                        onClick={() => handleDelete(insumo)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expandable Lotes Section */}
                {expandedLotes[insumo.id] && (
                  <div className="expanded-content">
                    <div className="lotes-section">
                      <h4 className="lotes-title">
                        <i className="mdi mdi-package-variant"></i>
                        Lotes Disponibles ({getLotesForInsumo(insumo.id).length})
                      </h4>
                      <div className="lotes-grid">
                        {getLotesForInsumo(insumo.id).map((loteItem) => (
                          <div key={loteItem.id} className="lote-card">
                            <div className="lote-header">
                              <span className="lote-numero">{loteItem.lote}</span>
                              <div className="lote-actions">
                                <button
                                  type="button"
                                  onClick={() => handleEditLote(loteItem)}
                                  className="lote-action-btn edit"
                                  title="Editar lote"
                                >
                                  <i className="mdi mdi-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLote(loteItem)}
                                  className="lote-action-btn delete"
                                  title="Eliminar lote"
                                >
                                  <i className="mdi mdi-delete"></i>
                                </button>
                              </div>
                            </div>
                            <div className="lote-info">
                              <div className="lote-detail">
                                <i className="mdi mdi-cube-outline"></i>
                                <span>{loteItem.existencia} {insumo.unidad_medida}</span>
                              </div>
                              {loteItem.fecha_caducidad && (
                                <div className="lote-detail expiry">
                                  <i className="mdi mdi-calendar-clock"></i>
                                  <span>Vence: {new Date(loteItem.fecha_caducidad).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-flask"></i>
                {editingInsumo ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="codigo">Código (Opcional - Se genera automáticamente)</label>
                  <input
                    type="text"
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    placeholder="Se generará automáticamente si se deja vacío"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    type="text"
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="categoria">Categoría *</label>
                  <select
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="reactivos">Reactivos</option>
                    <option value="solventes">Solventes</option>
                    <option value="acidos">Ácidos</option>
                    <option value="bases">Bases</option>
                    <option value="sales">Sales</option>
                    <option value="organicos">Compuestos Orgánicos</option>
                    <option value="indicadores">Indicadores</option>
                    <option value="buffer">Soluciones Buffer</option>
                    <option value="estandares">Estándares</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="unidad_medida">Unidad de Medida</label>
                  <select
                    id="unidad_medida"
                    value={formData.unidad_medida}
                    onChange={(e) => setFormData({...formData, unidad_medida: e.target.value})}
                  >
                    <option value="">Seleccionar unidad</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="l">Litros (L)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="mg">Miligramos (mg)</option>
                    <option value="piezas">Piezas</option>
                    <option value="cajas">Cajas</option>
                    <option value="frascos">Frascos</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="existencia_total">Existencia Total</label>
                  <input
                    type="number"
                    min="0"
                    id="existencia_total"
                    value={formData.existencia_total}
                    onChange={(e) => setFormData({...formData, existencia_total: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="stock_minimo">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    id="stock_minimo"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="stock_maximo">Stock Máximo</label>
                  <input
                    type="number"
                    min="0"
                    id="stock_maximo"
                    value={formData.stock_maximo}
                    onChange={(e) => setFormData({...formData, stock_maximo: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="precio_venta">Precio de Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="precio_venta"
                    value={formData.precio_venta}
                    onChange={(e) => setFormData({...formData, precio_venta: e.target.value})}
                  />
                </div>
                

                
                <div className="form-group">
                  <label htmlFor="proveedor">Proveedor</label>
                  <input
                    type="text"
                    id="proveedor"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="numero_lote">N��mero de Lote</label>
                  <input
                    type="text"
                    id="numero_lote"
                    value={formData.numero_lote}
                    onChange={(e) => setFormData({...formData, numero_lote: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_caducidad">Fecha de Caducidad</label>
                  <input
                    type="date"
                    id="fecha_caducidad"
                    value={formData.fecha_caducidad}
                    onChange={(e) => setFormData({...formData, fecha_caducidad: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_ingreso">Fecha de Ingreso</label>
                  <input
                    type="date"
                    id="fecha_ingreso"
                    value={formData.fecha_ingreso}
                    onChange={(e) => setFormData({...formData, fecha_ingreso: e.target.value})}
                  />
                </div>
                

                
                <div className="form-group full-width">
                  <label htmlFor="observaciones">Observaciones</label>
                  <textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <Button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" loading={loading}>
                  {editingInsumo ? 'Actualizar' : 'Crear'} Insumo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lote Edit Modal */}
      {showLoteModal && (
        <div className="modal-overlay" onClick={handleCloseLoteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-package-variant"></i>
                {editingLote ? 'Editar Lote' : 'Nuevo Lote'}
              </h2>
              <button className="modal-close" onClick={handleCloseLoteModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveLote(); }} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="lote">Número de Lote *</label>
                  <input
                    type="text"
                    id="lote"
                    value={loteForm.lote}
                    onChange={(e) => setLoteForm({...loteForm, lote: e.target.value})}
                    required
                    placeholder="Ej: 1511-105B5-23"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="existencia">Existencia *</label>
                  <input
                    type="number"
                    min="0"
                    id="existencia"
                    value={loteForm.existencia}
                    onChange={(e) => setLoteForm({...loteForm, existencia: e.target.value})}
                    required
                    placeholder="Cantidad disponible"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fecha_caducidad_lote">Fecha de Caducidad</label>
                  <input
                    type="date"
                    id="fecha_caducidad_lote"
                    value={loteForm.fecha_caducidad}
                    onChange={(e) => setLoteForm({...loteForm, fecha_caducidad: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <Button type="button" onClick={handleCloseLoteModal} className="btn-secondary">
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" loading={loading}>
                  {editingLote ? 'Actualizar' : 'Crear'} Lote
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insumos;
