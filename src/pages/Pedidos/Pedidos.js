import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import useOfflineData from '../../hooks/useOfflineData';
import './Pedidos.css';

const Pedidos = () => {
  const { showSuccess, showError } = useNotification();
  const { userData } = useAuth();

  // Hooks de persistencia offline
  const pedidosData = useOfflineData('pedidos', {
    orderBy: 'fecha_solicitud',
    orderDirection: 'desc',
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTime: true
  });

  const insumosData = useOfflineData('insumos', {
    orderBy: 'nombre',
    orderDirection: 'asc',
    autoRefresh: false,
    refreshInterval: 60000,
    enableRealTime: false
  });

  // Estado consolidado
  const pedidos = pedidosData.data;
  const insumos = insumosData.data;
  const loading = pedidosData.loading || insumosData.loading;
  const isOffline = pedidosData.isOffline || insumosData.isOffline;

  const [borradores, setBorradores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showBorradoresModal, setShowBorradoresModal] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [activeTab, setActiveTab] = useState('pedidos');
  const [formData, setFormData] = useState({
    numero: '',
    solicitante: userData?.nombre || '',
    fecha_solicitud: '',
    fecha_necesaria: '',
    estado: 'pendiente',
    prioridad: 'normal',
    justificacion: '',
    observaciones: '',
    articulos: [],
    notas: ''
  });

  const loadBorradores = useCallback(async () => {
    try {
      const result = await firebaseService.getAll('requisiciones');
      if (result.success) {
        const allRequisiciones = result.data || [];
        setBorradores(allRequisiciones.filter(req => req.estado === 'borrador'));
      } else {
        showError('Error', 'No se pudieron cargar los borradores');
      }
    } catch (error) {
      console.error('Error loading borradores:', error);
      showError('Error', 'Error al cargar borradores');
    }
  }, [showError]);

  useEffect(() => {
    loadBorradores();
  }, [loadBorradores]);

  useEffect(() => {
    if (userData?.nombre && !formData.solicitante) {
      setFormData(prev => ({
        ...prev,
        solicitante: userData.nombre
      }));
    }
  }, [userData, formData.solicitante]);

  const generateOrderNumber = () => {
    const prefix = 'REQ';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}-${year}${month}-${timestamp}-${random}`;
  };

  const calculateTotal = () => {
    return formData.articulos.reduce((sum, item) => {
      return sum + ((item.cantidad_solicitada || item.cantidad || 0) * (item.precio_estimado || 0));
    }, 0);
  };

  const getInsumoById = (id) => {
    return insumos.find(insumo => insumo.id === id);
  };

  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    
    if (!saveAsDraft && (!formData.solicitante || formData.articulos.length === 0)) {
      showError('Error', 'Por favor completa los campos obligatorios y agrega al menos un artículo');
      return;
    }

    try {
      const requisicionData = {
        ...formData,
        numero: formData.numero || generateOrderNumber(),
        presupuesto_total: calculateTotal(),
        presupuesto_estimado: parseFloat(formData.presupuesto_estimado) || 0,
        usuario_solicitud: userData?.nombre || 'Usuario',
        usuario_id: userData?.id || 'unknown',
        solicitante: formData.solicitante || userData?.nombre || 'Usuario',
        fecha_solicitud: formData.fecha_solicitud || new Date().toISOString().split('T')[0],
        estado: saveAsDraft ? 'borrador' : (formData.estado === 'borrador' ? 'pendiente' : formData.estado),
        updated_at: new Date()
      };

      if (editingPedido) {
        const result = await firebaseService.update('requisiciones', editingPedido.id, requisicionData);
        if (result.success) {
          showSuccess('Éxito', saveAsDraft ? 'Borrador guardado correctamente' : 'Requisición actualizada correctamente');
        } else {
          showError('Error', 'No se pudo actualizar la requisición');
        }
      } else {
        requisicionData.created_at = new Date();
        const result = await firebaseService.create('requisiciones', requisicionData);
        if (result.success) {
          showSuccess('Éxito', saveAsDraft ? 'Borrador creado correctamente' : 'Requisición creada correctamente');
        } else {
          showError('Error', 'No se pudo crear la requisición');
        }
      }

      await pedidosData.refresh();
      await loadBorradores();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving pedido:', error);
      showError('Error', 'Error al guardar el pedido');
    }
  };

  const handleEdit = (pedido) => {
    setEditingPedido(pedido);
    setFormData({
      numero: pedido.numero || '',
      solicitante: pedido.solicitante || '',
      departamento: pedido.departamento || '',
      telefono: pedido.telefono || '',
      fecha_solicitud: pedido.fecha_solicitud ? new Date(pedido.fecha_solicitud.seconds * 1000).toISOString().split('T')[0] : '',
      fecha_necesaria: pedido.fecha_necesaria ? new Date(pedido.fecha_necesaria.seconds * 1000).toISOString().split('T')[0] : '',
      estado: pedido.estado || 'borrador',
      prioridad: pedido.prioridad || 'normal',
      justificacion: pedido.justificacion || '',
      presupuesto_estimado: pedido.presupuesto_estimado || '',
      observaciones: pedido.observaciones || '',
      notas: pedido.notas || '',
      articulos: pedido.articulos || []
    });
    setShowModal(true);
  };

  const handleDelete = async (pedido) => {
    if (window.confirm(`¿Estás seguro de eliminar el pedido "${pedido.numero}"?`)) {
      try {
        const result = await firebaseService.delete('requisiciones', pedido.id);
        if (result.success) {
          showSuccess('Éxito', 'Pedido eliminado correctamente');
          await pedidosData.refresh();
          await loadBorradores();
        } else {
          showError('Error', 'No se pudo eliminar el pedido');
        }
      } catch (error) {
        console.error('Error deleting pedido:', error);
        showError('Error', 'Error al eliminar el pedido');
      }
    }
  };

  const handleAddArticulo = () => {
    setFormData({
      ...formData,
      articulos: [...formData.articulos, {
        tipo: 'inventario',
        insumo_id: '',
        nombre: '',
        descripcion: '',
        especificaciones: '',
        cantidad_solicitada: 1,
        cantidad_disponible: 0,
        precio_estimado: 0,
        proveedor_sugerido: '',
        urgente: false,
        unidad_medida: ''
      }]
    });
  };

  const handleAddArticuloFromInventory = (insumo) => {
    const newArticulo = {
      tipo: 'inventario',
      insumo_id: insumo.id,
      nombre: insumo.nombre,
      descripcion: `Código: ${insumo.codigo} - Categoría: ${insumo.categoria}`,
      especificaciones: insumo.observaciones || '',
      cantidad_solicitada: 1,
      cantidad_disponible: insumo.existencia_total || 0,
      precio_estimado: insumo.precio_venta || 0,
      proveedor_sugerido: insumo.proveedor || '',
      urgente: false,
      unidad_medida: insumo.unidad_medida || ''
    };
    
    setFormData({
      ...formData,
      articulos: [...formData.articulos, newArticulo]
    });
  };

  const copyFromDraft = (borrador) => {
    setFormData({
      numero: generateOrderNumber(),
      solicitante: borrador.solicitante || '',
      departamento: borrador.departamento || '',
      telefono: borrador.telefono || '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      fecha_necesaria: borrador.fecha_necesaria ? new Date(borrador.fecha_necesaria.seconds * 1000).toISOString().split('T')[0] : '',
      estado: 'pendiente',
      prioridad: borrador.prioridad || 'normal',
      justificacion: borrador.justificacion || '',
      presupuesto_estimado: borrador.presupuesto_estimado || '',
      observaciones: borrador.observaciones || '',
      notas: borrador.notas || '',
      articulos: borrador.articulos || []
    });
    setShowBorradoresModal(false);
    setShowModal(true);
  };

  const handleRemoveArticulo = (index) => {
    const newArticulos = formData.articulos.filter((_, i) => i !== index);
    setFormData({ ...formData, articulos: newArticulos });
  };

  const handleArticuloChange = (index, field, value) => {
    const newArticulos = [...formData.articulos];
    
    if (field === 'insumo_id' && value) {
      const insumo = getInsumoById(value);
      if (insumo) {
        newArticulos[index] = {
          ...newArticulos[index],
          insumo_id: value,
          nombre: insumo.nombre,
          descripcion: `Código: ${insumo.codigo} - Categoría: ${insumo.categoria}`,
          cantidad_disponible: insumo.existencia_total || 0,
          precio_estimado: insumo.precio_venta || 0,
          proveedor_sugerido: insumo.proveedor || '',
          unidad_medida: insumo.unidad_medida || '',
          tipo: 'inventario'
        };
      }
    } else if (field === 'tipo' && value === 'externo') {
      newArticulos[index] = {
        ...newArticulos[index],
        tipo: 'externo',
        insumo_id: '',
        cantidad_disponible: 0
      };
    } else {
      newArticulos[index][field] = value;
    }
    
    setFormData({ ...formData, articulos: newArticulos });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPedido(null);
    setFormData({
      numero: '',
      solicitante: userData?.nombre || '',
      fecha_solicitud: '',
      fecha_necesaria: '',
      estado: 'pendiente',
      prioridad: 'normal',
      justificacion: '',
      observaciones: '',
      articulos: [],
      notas: ''
    });
  };

  const columns = [
    { key: 'numero', label: 'N° Requisición' },
    { key: 'solicitante', label: 'Solicitante' },
    { key: 'departamento', label: 'Departamento' },
    {
      key: 'fecha_solicitud',
      label: 'Fecha Solicitud',
      render: (value) => value ? new Date(value.seconds * 1000).toLocaleDateString() : '-'
    },
    {
      key: 'fecha_necesaria',
      label: 'Fecha Necesaria',
      render: (value) => value ? new Date(value.seconds * 1000).toLocaleDateString() : '-'
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value) => {
        const statusColors = {
          borrador: 'secondary',
          pendiente: 'warning',
          aprobado: 'info',
          en_proceso: 'info',
          completado: 'success',
          cancelado: 'danger'
        };
        const statusLabels = {
          borrador: 'Borrador',
          pendiente: 'Pendiente',
          aprobado: 'Aprobado',
          en_proceso: 'En Proceso',
          completado: 'Completado',
          cancelado: 'Cancelado'
        };
        return (
          <span className={`status-badge ${statusColors[value] || 'secondary'}`}>
            {statusLabels[value] || value}
          </span>
        );
      }
    },
    {
      key: 'presupuesto_total',
      label: 'Presupuesto Total',
      render: (value) => `$${(value || 0).toFixed(2)}`
    }
  ];

  const actions = [
    {
      label: 'Editar',
      icon: 'mdi-pencil',
      onClick: handleEdit,
      className: 'btn-secondary'
    },
    {
      label: 'Eliminar',
      icon: 'mdi-delete',
      onClick: handleDelete,
      className: 'btn-danger'
    }
  ];

  return (
    <div className="pedidos-page">
      {/* Estado de Conexión y Persistencia Offline */}
      <ConnectionStatus />

      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-clipboard-list"></i>
          <h1>Gestión de Pedidos y Requisiciones</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
            Solicitud de insumos y artículos del laboratorio
          </p>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowBorradoresModal(true)}
            className="btn-info"
            icon="mdi-content-copy"
          >
            Copiar de Borrador ({borradores.length})
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nueva Requisición
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'pedidos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pedidos')}
          >
            <i className="mdi mdi-clipboard-check"></i>
            Requisiciones ({pedidos.length})
          </button>
          <button 
            className={`tab ${activeTab === 'borradores' ? 'active' : ''}`}
            onClick={() => setActiveTab('borradores')}
          >
            <i className="mdi mdi-content-save-edit"></i>
            Borradores ({borradores.length})
          </button>
        </div>
      </div>

      <div className="page-content">
        <DataTable
          data={activeTab === 'pedidos' ? pedidos : borradores}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          searchPlaceholder="Buscar requisiciones..."
        />
      </div>

      {/* Borrador Selection Modal */}
      {showBorradoresModal && (
        <div className="modal-overlay" onClick={() => setShowBorradoresModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-content-copy"></i>
                Seleccionar Borrador para Copiar
              </h2>
              <button className="modal-close" onClick={() => setShowBorradoresModal(false)}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {borradores.length === 0 ? (
                <div className="empty-state">
                  <i className="mdi mdi-content-save-edit empty-icon"></i>
                  <h3>No hay borradores disponibles</h3>
                  <p>Los borradores aparecerán aquí cuando los crees</p>
                </div>
              ) : (
                <div className="borradores-list">
                  {borradores.map((borrador) => (
                    <div key={borrador.id} className="borrador-card">
                      <div className="borrador-header">
                        <h4>{borrador.numero || 'Sin número'}</h4>
                        <span className="borrador-date">
                          {borrador.created_at ? new Date(borrador.created_at.seconds * 1000).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      <div className="borrador-info">
                        <p><strong>Solicitante:</strong> {borrador.solicitante || 'Sin especificar'}</p>
                        <p><strong>Artículos:</strong> {borrador.articulos?.length || 0}</p>
                        <p><strong>Presupuesto:</strong> ${(borrador.presupuesto_total || 0).toFixed(2)}</p>
                      </div>
                      <div className="borrador-actions">
                        <Button
                          variant="primary"
                          size="small"
                          icon="mdi-content-copy"
                          onClick={() => copyFromDraft(borrador)}
                        >
                          Copiar
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          icon="mdi-pencil"
                          onClick={() => handleEdit(borrador)}
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-clipboard-list"></i>
                {editingPedido ? 'Editar Requisición' : 'Nueva Requisición'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="numero">N° Requisición</label>
                  <input
                    type="text"
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({...formData, numero: e.target.value})}
                    placeholder="Se generará automáticamente"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="solicitante">Solicitante *</label>
                  <input
                    type="text"
                    id="solicitante"
                    value={formData.solicitante}
                    onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                    required
                    placeholder={userData?.nombre || 'Nombre del solicitante'}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Usuario actual: {userData?.nombre || 'No identificado'}
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="fecha_solicitud">Fecha Solicitud</label>
                  <input
                    type="date"
                    id="fecha_solicitud"
                    value={formData.fecha_solicitud}
                    onChange={(e) => setFormData({...formData, fecha_solicitud: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fecha_necesaria">Fecha Necesaria</label>
                  <input
                    type="date"
                    id="fecha_necesaria"
                    value={formData.fecha_necesaria}
                    onChange={(e) => setFormData({...formData, fecha_necesaria: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    id="prioridad"
                    value={formData.prioridad}
                    onChange={(e) => setFormData({...formData, prioridad: e.target.value})}
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="justificacion">Justificación *</label>
                  <textarea
                    id="justificacion"
                    value={formData.justificacion}
                    onChange={(e) => setFormData({...formData, justificacion: e.target.value})}
                    rows="3"
                    placeholder="Explique por qué necesita estos artículos..."
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="notas">Notas Adicionales</label>
                  <textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                    rows="2"
                    placeholder="Notas internas o comentarios adicionales..."
                  />
                </div>
              </div>

              {/* Articles Section */}
              <div className="articles-section">
                <div className="section-header">
                  <h3>Artículos Solicitados</h3>
                  <div className="section-actions">
                    <Button
                      type="button"
                      onClick={handleAddArticulo}
                      className="btn-secondary btn-small"
                      icon="mdi-plus"
                    >
                      Agregar Artículo
                    </Button>
                  </div>
                </div>

                {formData.articulos.map((articulo, index) => (
                  <div key={index} className="article-row">
                    <div className="form-group">
                      <label>Tipo de Artículo</label>
                      <select
                        value={articulo.tipo || 'inventario'}
                        onChange={(e) => handleArticuloChange(index, 'tipo', e.target.value)}
                      >
                        <option value="inventario">Del Inventario</option>
                        <option value="externo">Externo (No en inventario)</option>
                      </select>
                    </div>

                    {articulo.tipo === 'inventario' && (
                      <div className="form-group">
                        <label>Seleccionar del Inventario</label>
                        <select
                          value={articulo.insumo_id || ''}
                          onChange={(e) => handleArticuloChange(index, 'insumo_id', e.target.value)}
                        >
                          <option value="">Seleccionar insumo...</option>
                          {insumos.map((insumo) => (
                            <option key={insumo.id} value={insumo.id}>
                              {insumo.codigo} - {insumo.nombre} (Disponible: {insumo.existencia_total || 0} {insumo.unidad_medida})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Nombre del Artículo</label>
                      <input
                        type="text"
                        value={articulo.nombre}
                        onChange={(e) => handleArticuloChange(index, 'nombre', e.target.value)}
                        placeholder="Ej: Reactivo químico XYZ"
                        disabled={articulo.tipo === 'inventario' && articulo.insumo_id}
                      />
                    </div>

                    <div className="form-group">
                      <label>Cantidad Solicitada</label>
                      <input
                        type="number"
                        min="1"
                        value={articulo.cantidad_solicitada || articulo.cantidad || 1}
                        onChange={(e) => handleArticuloChange(index, 'cantidad_solicitada', parseInt(e.target.value))}
                      />
                    </div>

                    {articulo.tipo === 'inventario' && articulo.cantidad_disponible !== undefined && (
                      <div className="form-group">
                        <label>Disponible en Inventario</label>
                        <input
                          type="text"
                          value={`${articulo.cantidad_disponible} ${articulo.unidad_medida || ''}`}
                          readOnly
                          className={articulo.cantidad_disponible < (articulo.cantidad_solicitada || 0) ? 'insufficient-stock' : 'sufficient-stock'}
                        />
                        {articulo.cantidad_disponible < (articulo.cantidad_solicitada || 0) && (
                          <small className="text-danger">Stock insuficiente</small>
                        )}
                      </div>
                    )}

                    <div className="form-group">
                      <label>Precio Estimado</label>
                      <input
                        type="number"
                        step="0.01"
                        value={articulo.precio_estimado}
                        onChange={(e) => handleArticuloChange(index, 'precio_estimado', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="form-group">
                      <label>Subtotal</label>
                      <input
                        type="text"
                        value={`$${((articulo.cantidad_solicitada || articulo.cantidad || 0) * (articulo.precio_estimado || 0)).toFixed(2)}`}
                        readOnly
                      />
                    </div>

                    <div className="form-group">
                      <button
                        type="button"
                        onClick={() => handleRemoveArticulo(index)}
                        className="btn-danger btn-small"
                      >
                        <i className="mdi mdi-delete"></i>
                      </button>
                    </div>

                    <div className="form-group full-width">
                      <label>Descripción/Especificaciones</label>
                      <textarea
                        value={articulo.descripcion}
                        onChange={(e) => handleArticuloChange(index, 'descripcion', e.target.value)}
                        rows="2"
                        placeholder="Especificaciones técnicas, marca preferida, etc."
                      />
                    </div>

                    <div className="form-group">
                      <label>Proveedor Sugerido</label>
                      <input
                        type="text"
                        value={articulo.proveedor_sugerido}
                        onChange={(e) => handleArticuloChange(index, 'proveedor_sugerido', e.target.value)}
                        placeholder="Proveedor sugerido (opcional)"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={articulo.urgente}
                          onChange={(e) => handleArticuloChange(index, 'urgente', e.target.checked)}
                        />
                        Urgente
                      </label>
                    </div>
                  </div>
                ))}
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
              
              <div className="modal-actions">
                <Button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowBorradoresModal(true)}
                  className="btn-info"
                  icon="mdi-content-copy"
                >
                  Copiar de Pedido Existente
                </Button>
                <Button type="submit" className="btn-primary" loading={loading}>
                  {editingPedido ? 'Actualizar' : 'Crear'} Requisición
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default Pedidos;
