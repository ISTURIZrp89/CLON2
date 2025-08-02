import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';

const Pedidos = () => {
  const { showSuccess, showError } = useNotification();
  const { userData } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [borradores, setBorradores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBorradoresModal, setShowBorradoresModal] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const [activeTab, setActiveTab] = useState('pedidos');
  const [formData, setFormData] = useState({
    numero: '',
    solicitante: '',
    departamento: '',
    telefono: '',
    fecha_solicitud: '',
    fecha_necesaria: '',
    estado: 'borrador',
    prioridad: 'normal',
    justificacion: '',
    presupuesto_estimado: '',
    observaciones: '',
    articulos: [],
    notas: ''
  });

  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('requisiciones');
      if (result.success) {
        const allRequisiciones = result.data || [];
        setPedidos(allRequisiciones.filter(req => req.estado !== 'borrador'));
        setBorradores(allRequisiciones.filter(req => req.estado === 'borrador'));
      } else {
        showError('Error', 'No se pudieron cargar las requisiciones');
      }
    } catch (error) {
      console.error('Error loading requisiciones:', error);
      showError('Error', 'Error al cargar requisiciones');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadInsumos = useCallback(async () => {
    try {
      const result = await firebaseService.getAll('insumos');
      if (result.success) {
        setInsumos(result.data || []);
      }
    } catch (error) {
      console.error('Error loading insumos:', error);
    }
  }, []);

  useEffect(() => {
    loadPedidos();
    loadInsumos();
  }, [loadPedidos, loadInsumos]);

  const generateOrderNumber = () => {
    const prefix = 'REQ';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const calculateTotal = () => {
    return formData.articulos.reduce((sum, item) => {
      return sum + (item.cantidad * (item.precio_estimado || 0));
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.solicitante || formData.articulos.length === 0) {
      showError('Error', 'Por favor completa los campos obligatorios y agrega al menos un artículo');
      return;
    }

    try {
      setLoading(true);
      const requisicionData = {
        ...formData,
        numero: formData.numero || generateOrderNumber(),
        presupuesto_total: calculateTotal(),
        presupuesto_estimado: parseFloat(formData.presupuesto_estimado) || 0,
        usuario_solicitud: userData?.nombre || 'Usuario',
        usuario_id: userData?.id || 'unknown',
        updated_at: new Date()
      };

      if (editingPedido) {
        const result = await firebaseService.update('requisiciones', editingPedido.id, requisicionData);
        if (result.success) {
          showSuccess('Éxito', 'Requisición actualizada correctamente');
        } else {
          showError('Error', 'No se pudo actualizar la requisición');
        }
      } else {
        requisicionData.created_at = new Date();
        const result = await firebaseService.create('requisiciones', requisicionData);
        if (result.success) {
          showSuccess('Éxito', 'Requisición creada correctamente');
        } else {
          showError('Error', 'No se pudo crear la requisición');
        }
      }

      await loadPedidos();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving pedido:', error);
      showError('Error', 'Error al guardar el pedido');
    } finally {
      setLoading(false);
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
      estado: pedido.estado || 'pendiente',
      prioridad: pedido.prioridad || 'normal',
      justificacion: pedido.justificacion || '',
      presupuesto_estimado: pedido.presupuesto_estimado || '',
      observaciones: pedido.observaciones || '',
      articulos: pedido.articulos || []
    });
    setShowModal(true);
  };

  const handleDelete = async (pedido) => {
    if (window.confirm(`¿Est��s seguro de eliminar el pedido "${pedido.numero}"?`)) {
      try {
        const result = await firebaseService.delete('pedidos', pedido.id);
        if (result.success) {
          showSuccess('Éxito', 'Pedido eliminado correctamente');
          await loadPedidos();
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
        nombre: '',
        descripcion: '',
        especificaciones: '',
        cantidad: 1,
        precio_estimado: 0,
        proveedor_sugerido: '',
        urgente: false
      }]
    });
  };

  const handleRemoveArticulo = (index) => {
    const newArticulos = formData.articulos.filter((_, i) => i !== index);
    setFormData({ ...formData, articulos: newArticulos });
  };

  const handleArticuloChange = (index, field, value) => {
    const newArticulos = [...formData.articulos];
    newArticulos[index][field] = value;
    setFormData({ ...formData, articulos: newArticulos });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPedido(null);
    setFormData({
      numero: '',
      solicitante: '',
      departamento: '',
      telefono: '',
      fecha_solicitud: '',
      fecha_necesaria: '',
      estado: 'pendiente',
      prioridad: 'normal',
      justificacion: '',
      presupuesto_estimado: '',
      observaciones: '',
      articulos: []
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
          pendiente: 'warning',
          aprobado: 'info',
          en_proceso: 'info',
          completado: 'success',
          cancelado: 'danger'
        };
        const statusLabels = {
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
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-clipboard-list"></i>
          <h1>Requisiciones de Artículos</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
            Solicitud de insumos y artículos que no se encuentran en inventario
          </p>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nueva Requisición
          </Button>
        </div>
      </div>

      <div className="page-content">
        <DataTable
          data={pedidos}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          searchPlaceholder="Buscar requisiciones..."
        />
      </div>

      {/* Modal */}
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
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="departamento">Departamento</label>
                  <input
                    type="text"
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="tel"
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
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

                <div className="form-group">
                  <label htmlFor="presupuesto_estimado">Presupuesto Estimado</label>
                  <input
                    type="number"
                    step="0.01"
                    id="presupuesto_estimado"
                    value={formData.presupuesto_estimado}
                    onChange={(e) => setFormData({...formData, presupuesto_estimado: e.target.value})}
                  />
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
              </div>

              {/* Articles Section */}
              <div className="articles-section">
                <div className="section-header">
                  <h3>Artículos Solicitados</h3>
                  <Button
                    type="button"
                    onClick={handleAddArticulo}
                    className="btn-secondary btn-small"
                    icon="mdi-plus"
                  >
                    Agregar Artículo
                  </Button>
                </div>

                {formData.articulos.map((articulo, index) => (
                  <div key={index} className="article-row">
                    <div className="form-group">
                      <label>Nombre del Artículo</label>
                      <input
                        type="text"
                        value={articulo.nombre}
                        onChange={(e) => handleArticuloChange(index, 'nombre', e.target.value)}
                        placeholder="Ej: Reactivo químico XYZ"
                      />
                    </div>

                    <div className="form-group">
                      <label>Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={articulo.cantidad}
                        onChange={(e) => handleArticuloChange(index, 'cantidad', parseInt(e.target.value))}
                      />
                    </div>

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
                        value={`$${(articulo.cantidad * (articulo.precio_estimado || 0)).toFixed(2)}`}
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

              {/* Totals Section */}
              <div className="totals-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Presupuesto Total Estimado</label>
                    <input
                      type="text"
                      value={`$${calculateTotal().toFixed(2)}`}
                      readOnly
                      className="total-field"
                    />
                  </div>
                </div>
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
