import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';

const RegistroPedidos = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const { userData } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    pedido_id: '',
    accion: '',
    estado_anterior: '',
    estado_nuevo: '',
    comentarios: '',
    tiempo_estimado: '',
    prioridad: 'normal'
  });

  useEffect(() => {
    loadRegistros();
    loadPedidos();
  }, []);

  const loadRegistros = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('registro_pedidos');
      if (result.success) {
        setRegistros(result.data || []);
      } else {
        showError('Error', 'No se pudieron cargar los registros');
      }
    } catch (error) {
      console.error('Error loading registros:', error);
      showError('Error', 'Error al cargar registros');
    } finally {
      setLoading(false);
    }
  };

  const loadPedidos = async () => {
    try {
      const result = await firebaseService.getAll('pedidos');
      if (result.success) {
        setPedidos(result.data || []);
      }
    } catch (error) {
      console.error('Error loading pedidos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.pedido_id || !formData.accion) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      
      const registroData = {
        ...formData,
        usuario: userData?.nombre || 'Usuario',
        usuario_id: userData?.id || 'unknown',
        fecha_registro: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Create the registro
      const result = await firebaseService.create('registro_pedidos', registroData);
      if (result.success) {
        // Update pedido status if estado_nuevo is provided
        if (formData.estado_nuevo && formData.pedido_id) {
          await firebaseService.update('pedidos', formData.pedido_id, {
            estado: formData.estado_nuevo,
            updated_at: new Date()
          });
          
          // Reload pedidos to update status
          await loadPedidos();
        }
        
        showSuccess('Éxito', 'Registro creado correctamente');
        await loadRegistros();
        handleCloseModal();
      } else {
        showError('Error', 'No se pudo crear el registro');
      }
    } catch (error) {
      console.error('Error saving registro:', error);
      showError('Error', 'Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (pedidoId, accion, estadoNuevo) => {
    try {
      setLoading(true);
      
      const registroData = {
        pedido_id: pedidoId,
        accion: accion,
        estado_anterior: getPedidoEstado(pedidoId),
        estado_nuevo: estadoNuevo,
        comentarios: `Acción rápida: ${accion}`,
        usuario: userData?.nombre || 'Usuario',
        usuario_id: userData?.id || 'unknown',
        fecha_registro: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await firebaseService.create('registro_pedidos', registroData);
      if (result.success) {
        // Update pedido status
        await firebaseService.update('pedidos', pedidoId, {
          estado: estadoNuevo,
          updated_at: new Date()
        });
        
        showSuccess('Éxito', `Pedido ${accion.toLowerCase()} correctamente`);
        await loadRegistros();
        await loadPedidos();
      }
    } catch (error) {
      console.error('Error in quick action:', error);
      showError('Error', 'Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      pedido_id: '',
      accion: '',
      estado_anterior: '',
      estado_nuevo: '',
      comentarios: '',
      tiempo_estimado: '',
      prioridad: 'normal'
    });
  };

  const getPedidoInfo = (pedidoId) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    return pedido ? `${pedido.numero || pedidoId} - ${pedido.cliente || 'Cliente'}` : pedidoId;
  };

  const getPedidoEstado = (pedidoId) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    return pedido ? pedido.estado : '';
  };

  const onPedidoChange = (pedidoId) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido) {
      setFormData({
        ...formData,
        pedido_id: pedidoId,
        estado_anterior: pedido.estado || ''
      });
    }
  };

  const columns = [
    {
      key: 'fecha_registro',
      label: 'Fecha',
      render: (value) => value ? new Date(value.seconds * 1000).toLocaleString() : '-'
    },
    { 
      key: 'pedido_id', 
      label: 'Pedido',
      render: (value) => getPedidoInfo(value)
    },
    { key: 'accion', label: 'Acción' },
    {
      key: 'estado_anterior',
      label: 'Estado Anterior',
      render: (value) => value ? (
        <span className="status-badge secondary">{value}</span>
      ) : '-'
    },
    {
      key: 'estado_nuevo',
      label: 'Estado Nuevo',
      render: (value) => {
        if (!value) return '-';
        const statusColors = {
          pendiente: 'warning',
          aprobado: 'info',
          en_proceso: 'info',
          completado: 'success',
          cancelado: 'danger'
        };
        return (
          <span className={`status-badge ${statusColors[value] || 'secondary'}`}>
            {value}
          </span>
        );
      }
    },
    { key: 'usuario', label: 'Usuario' },
    {
      key: 'prioridad',
      label: 'Prioridad',
      render: (value) => {
        const priorityColors = {
          alta: 'danger',
          normal: 'info',
          baja: 'secondary'
        };
        return (
          <span className={`status-badge ${priorityColors[value] || 'secondary'}`}>
            {value || 'normal'}
          </span>
        );
      }
    }
  ];

  const actions = [
    {
      label: 'Ver Detalles',
      icon: 'mdi-eye',
      onClick: (registro) => {
        showWarning('Detalles', `Registro: ${registro.accion} - ${registro.comentarios || 'Sin comentarios'}`);
      },
      className: 'btn-secondary'
    }
  ];

  return (
    <div className="registro-pedidos-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-cart-plus"></i>
          <h1>Registro de Pedidos</h1>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nuevo Registro
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section" style={{ marginBottom: '2rem' }}>
        <h3>Acciones Rápidas</h3>
        <div className="quick-actions-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1rem',
          marginTop: '1rem'
        }}>
          {pedidos.filter(p => p.estado !== 'completado' && p.estado !== 'cancelado').map(pedido => (
            <div key={pedido.id} className="quick-action-card" style={{
              padding: '1rem',
              background: 'var(--background-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>{pedido.numero || pedido.id}</strong> - {pedido.cliente}
              </div>
              <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Estado: <span className={`status-badge ${pedido.estado === 'pendiente' ? 'warning' : 'info'}`}>
                  {pedido.estado}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {pedido.estado === 'pendiente' && (
                  <Button
                    onClick={() => handleQuickAction(pedido.id, 'Aprobar', 'aprobado')}
                    className="btn-success btn-small"
                    icon="mdi-check"
                  >
                    Aprobar
                  </Button>
                )}
                {pedido.estado === 'aprobado' && (
                  <Button
                    onClick={() => handleQuickAction(pedido.id, 'Iniciar Proceso', 'en_proceso')}
                    className="btn-info btn-small"
                    icon="mdi-play"
                  >
                    Procesar
                  </Button>
                )}
                {pedido.estado === 'en_proceso' && (
                  <Button
                    onClick={() => handleQuickAction(pedido.id, 'Completar', 'completado')}
                    className="btn-primary btn-small"
                    icon="mdi-check-all"
                  >
                    Completar
                  </Button>
                )}
                <Button
                  onClick={() => handleQuickAction(pedido.id, 'Cancelar', 'cancelado')}
                  className="btn-danger btn-small"
                  icon="mdi-close"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        <DataTable
          data={registros}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          searchPlaceholder="Buscar registros..."
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-cart-plus"></i>
                Nuevo Registro de Pedido
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="pedido_id">Pedido *</label>
                  <select
                    id="pedido_id"
                    value={formData.pedido_id}
                    onChange={(e) => onPedidoChange(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar pedido</option>
                    {pedidos.map(pedido => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.numero || pedido.id} - {pedido.cliente} ({pedido.estado})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="accion">Acción *</label>
                  <select
                    id="accion"
                    value={formData.accion}
                    onChange={(e) => setFormData({...formData, accion: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar acción</option>
                    <option value="Crear">Crear</option>
                    <option value="Aprobar">Aprobar</option>
                    <option value="Rechazar">Rechazar</option>
                    <option value="Iniciar Proceso">Iniciar Proceso</option>
                    <option value="Pausar">Pausar</option>
                    <option value="Completar">Completar</option>
                    <option value="Cancelar">Cancelar</option>
                    <option value="Modificar">Modificar</option>
                    <option value="Comentario">Agregar Comentario</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="estado_anterior">Estado Anterior</label>
                  <input
                    type="text"
                    id="estado_anterior"
                    value={formData.estado_anterior}
                    onChange={(e) => setFormData({...formData, estado_anterior: e.target.value})}
                    readOnly
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="estado_nuevo">Estado Nuevo</label>
                  <select
                    id="estado_nuevo"
                    value={formData.estado_nuevo}
                    onChange={(e) => setFormData({...formData, estado_nuevo: e.target.value})}
                  >
                    <option value="">Sin cambio de estado</option>
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
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="tiempo_estimado">Tiempo Estimado (horas)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    id="tiempo_estimado"
                    value={formData.tiempo_estimado}
                    onChange={(e) => setFormData({...formData, tiempo_estimado: e.target.value})}
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="comentarios">Comentarios</label>
                  <textarea
                    id="comentarios"
                    value={formData.comentarios}
                    onChange={(e) => setFormData({...formData, comentarios: e.target.value})}
                    rows="3"
                    placeholder="Describe la acción realizada, observaciones o comentarios adicionales..."
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <Button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" loading={loading}>
                  Guardar Registro
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroPedidos;
