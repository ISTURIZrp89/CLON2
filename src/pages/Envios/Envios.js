import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import './Envios.css';

const Envios = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [envios, setEnvios] = useState([]);
  const [pedidosProductos, setPedidosProductos] = useState([]);
  const [pedidosRequisiciones, setPedidosRequisiciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPedidosModal, setShowPedidosModal] = useState(false);
  const [editingEnvio, setEditingEnvio] = useState(null);
  const [activeTab, setActiveTab] = useState('envios');
  const [formData, setFormData] = useState({
    numero_seguimiento: '',
    pedido_id: '',
    tipo_pedido: '',
    destinatario: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    telefono: '',
    transportista: '',
    fecha_envio: '',
    fecha_entrega_estimada: '',
    estado: 'preparando',
    observaciones: '',
    costo_envio: ''
  });

  useEffect(() => {
    loadEnvios();
    loadPedidos();
  }, []);

  const loadEnvios = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('envios');
      if (result.success) {
        setEnvios(result.data || []);
      } else {
        showError('Error', 'No se pudieron cargar los envíos');
      }
    } catch (error) {
      console.error('Error loading envios:', error);
      showError('Error', 'Error al cargar envíos');
    } finally {
      setLoading(false);
    }
  };

  const loadPedidos = async () => {
    try {
      // Load product orders
      const productOrdersResult = await firebaseService.getAll('pedidos_productos');
      if (productOrdersResult.success) {
        setPedidosProductos(productOrdersResult.data || []);
      }

      // Load requisition orders
      const requisitionOrdersResult = await firebaseService.getAll('requisiciones');
      if (requisitionOrdersResult.success) {
        const completedRequisitions = (requisitionOrdersResult.data || []).filter(
          req => req.estado === 'completado' || req.estado === 'aprobado'
        );
        setPedidosRequisiciones(completedRequisitions);
      }
    } catch (error) {
      console.error('Error loading pedidos:', error);
    }
  };

  const generateTrackingNumber = () => {
    const prefix = 'LF';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.pedido_id || !formData.destinatario || !formData.direccion) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      const envioData = {
        ...formData,
        numero_seguimiento: formData.numero_seguimiento || generateTrackingNumber(),
        costo_envio: parseFloat(formData.costo_envio) || 0,
        updated_at: new Date()
      };

      if (editingEnvio) {
        const result = await firebaseService.update('envios', editingEnvio.id, envioData);
        if (result.success) {
          showSuccess('Éxito', 'Envío actualizado correctamente');
        } else {
          showError('Error', 'No se pudo actualizar el envío');
        }
      } else {
        envioData.created_at = new Date();
        const result = await firebaseService.create('envios', envioData);
        if (result.success) {
          showSuccess('Éxito', 'Envío creado correctamente');
          
          // Update order status based on type
          if (formData.tipo_pedido === 'productos') {
            await firebaseService.update('pedidos_productos', formData.pedido_id, {
              estado: 'enviado',
              fecha_envio: new Date(),
              numero_seguimiento: envioData.numero_seguimiento
            });
          } else if (formData.tipo_pedido === 'requisicion') {
            await firebaseService.update('requisiciones', formData.pedido_id, {
              estado: 'enviado',
              fecha_envio: new Date(),
              numero_seguimiento: envioData.numero_seguimiento
            });
          }
        } else {
          showError('Error', 'No se pudo crear el envío');
        }
      }

      await loadEnvios();
      await loadPedidos();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving envio:', error);
      showError('Error', 'Error al guardar el envío');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnvioFromPedido = (pedido, tipo) => {
    setFormData({
      numero_seguimiento: '',
      pedido_id: pedido.id,
      tipo_pedido: tipo,
      destinatario: pedido.destinatario || pedido.solicitante || '',
      direccion: pedido.ubicacion_entrega || pedido.direccion || '',
      ciudad: '',
      codigo_postal: '',
      telefono: pedido.telefono || '',
      transportista: '',
      fecha_envio: new Date().toISOString().split('T')[0],
      fecha_entrega_estimada: '',
      estado: 'preparando',
      observaciones: `Pedido ${tipo}: ${pedido.numero}`,
      costo_envio: ''
    });
    setShowPedidosModal(false);
    setShowModal(true);
  };

  const handleEdit = (envio) => {
    setEditingEnvio(envio);
    setFormData({
      numero_seguimiento: envio.numero_seguimiento || '',
      pedido_id: envio.pedido_id || '',
      tipo_pedido: envio.tipo_pedido || '',
      destinatario: envio.destinatario || '',
      direccion: envio.direccion || '',
      ciudad: envio.ciudad || '',
      codigo_postal: envio.codigo_postal || '',
      telefono: envio.telefono || '',
      transportista: envio.transportista || '',
      fecha_envio: envio.fecha_envio ? new Date(envio.fecha_envio.seconds * 1000).toISOString().split('T')[0] : '',
      fecha_entrega_estimada: envio.fecha_entrega_estimada ? new Date(envio.fecha_entrega_estimada.seconds * 1000).toISOString().split('T')[0] : '',
      estado: envio.estado || 'preparando',
      observaciones: envio.observaciones || '',
      costo_envio: envio.costo_envio || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (envio) => {
    if (window.confirm(`¿Estás seguro de eliminar el envío "${envio.numero_seguimiento}"?`)) {
      try {
        const result = await firebaseService.delete('envios', envio.id);
        if (result.success) {
          showSuccess('Éxito', 'Envío eliminado correctamente');
          await loadEnvios();
        } else {
          showError('Error', 'No se pudo eliminar el envío');
        }
      } catch (error) {
        console.error('Error deleting envio:', error);
        showError('Error', 'Error al eliminar el envío');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEnvio(null);
    setFormData({
      numero_seguimiento: '',
      pedido_id: '',
      tipo_pedido: '',
      destinatario: '',
      direccion: '',
      ciudad: '',
      codigo_postal: '',
      telefono: '',
      transportista: '',
      fecha_envio: '',
      fecha_entrega_estimada: '',
      estado: 'preparando',
      observaciones: '',
      costo_envio: ''
    });
  };

  const getPedidoInfo = (pedidoId, tipoPedido) => {
    if (tipoPedido === 'productos') {
      const pedido = pedidosProductos.find(p => p.id === pedidoId);
      return pedido ? `${pedido.numero} - Productos (${pedido.total_articulos} items)` : pedidoId;
    } else {
      const pedido = pedidosRequisiciones.find(p => p.id === pedidoId);
      return pedido ? `${pedido.numero} - Requisición` : pedidoId;
    }
  };

  const getPendingOrders = () => {
    const productOrders = pedidosProductos.filter(p => p.estado === 'pendiente' || p.estado === 'aprobado');
    const requisitionOrders = pedidosRequisiciones.filter(r => r.estado === 'completado' || r.estado === 'aprobado');
    return { productOrders, requisitionOrders };
  };

  const columns = [
    { key: 'numero_seguimiento', label: 'N° Seguimiento' },
    { 
      key: 'pedido_id', 
      label: 'Pedido',
      render: (value, row) => getPedidoInfo(value, row.tipo_pedido)
    },
    {
      key: 'tipo_pedido',
      label: 'Tipo',
      render: (value) => {
        const typeColors = {
          productos: 'primary',
          requisicion: 'info'
        };
        const typeLabels = {
          productos: 'Productos',
          requisicion: 'Requisición'
        };
        return (
          <span className={`status-badge ${typeColors[value] || 'secondary'}`}>
            {typeLabels[value] || 'N/A'}
          </span>
        );
      }
    },
    { key: 'destinatario', label: 'Destinatario' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'transportista', label: 'Transportista' },
    {
      key: 'fecha_envio',
      label: 'Fecha Envío',
      render: (value) => value ? new Date(value.seconds * 1000).toLocaleDateString() : '-'
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value) => {
        const statusColors = {
          preparando: 'warning',
          enviado: 'info',
          en_transito: 'info',
          entregado: 'success',
          devuelto: 'danger'
        };
        const statusLabels = {
          preparando: 'Preparando',
          enviado: 'Enviado',
          en_transito: 'En Tránsito',
          entregado: 'Entregado',
          devuelto: 'Devuelto'
        };
        return (
          <span className={`status-badge ${statusColors[value] || 'secondary'}`}>
            {statusLabels[value] || value}
          </span>
        );
      }
    },
    { 
      key: 'costo_envio', 
      label: 'Costo',
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

  const { productOrders, requisitionOrders } = getPendingOrders();

  return (
    <div className="envios-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-truck"></i>
          <h1>Gestión de Envíos y Entregas</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
            Administra los envíos de productos y requisiciones
          </p>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowPedidosModal(true)}
            className="btn-info"
            icon="mdi-clipboard-list"
          >
            Pedidos Pendientes ({productOrders.length + requisitionOrders.length})
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nuevo Envío
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="mdi mdi-package-variant"></i>
          </div>
          <div className="stat-content">
            <h3>{envios.filter(e => e.estado === 'preparando').length}</h3>
            <p>Preparando</p>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">
            <i className="mdi mdi-truck"></i>
          </div>
          <div className="stat-content">
            <h3>{envios.filter(e => e.estado === 'enviado' || e.estado === 'en_transito').length}</h3>
            <p>En Tránsito</p>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">
            <i className="mdi mdi-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{envios.filter(e => e.estado === 'entregado').length}</h3>
            <p>Entregados</p>
          </div>
        </div>
        
        <div className="stat-card primary">
          <div className="stat-icon">
            <i className="mdi mdi-clipboard-alert"></i>
          </div>
          <div className="stat-content">
            <h3>{productOrders.length + requisitionOrders.length}</h3>
            <p>Pedidos Pendientes</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        <DataTable
          data={envios}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          searchPlaceholder="Buscar envíos..."
        />
      </div>

      {/* Pending Orders Modal */}
      {showPedidosModal && (
        <div className="modal-overlay" onClick={() => setShowPedidosModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-clipboard-list"></i>
                Pedidos Pendientes de Envío
              </h2>
              <button className="modal-close" onClick={() => setShowPedidosModal(false)}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="tabs-container">
                <div className="tabs">
                  <button className={`tab ${activeTab === 'productos' ? 'active' : ''}`} onClick={() => setActiveTab('productos')}>
                    <i className="mdi mdi-package-variant"></i>
                    Pedidos de Productos ({productOrders.length})
                  </button>
                  <button className={`tab ${activeTab === 'requisiciones' ? 'active' : ''}`} onClick={() => setActiveTab('requisiciones')}>
                    <i className="mdi mdi-clipboard-check"></i>
                    Requisiciones ({requisitionOrders.length})
                  </button>
                </div>
              </div>

              <div className="pedidos-list">
                {activeTab === 'productos' && (
                  productOrders.length === 0 ? (
                    <div className="empty-state">
                      <i className="mdi mdi-package-variant empty-icon"></i>
                      <h3>No hay pedidos de productos pendientes</h3>
                    </div>
                  ) : (
                    productOrders.map(pedido => (
                      <div key={pedido.id} className="pedido-card productos">
                        <div className="pedido-header">
                          <div className="pedido-info">
                            <h4>{pedido.numero}</h4>
                            <span className="pedido-type">Pedido de Productos</span>
                          </div>
                          <span className={`priority-badge ${pedido.prioridad || 'normal'}`}>
                            {pedido.prioridad || 'Normal'}
                          </span>
                        </div>
                        <div className="pedido-details">
                          <p><strong>Destinatario:</strong> {pedido.destinatario}</p>
                          <p><strong>Ubicación:</strong> {pedido.ubicacion_entrega}</p>
                          <p><strong>Artículos:</strong> {pedido.total_articulos} items</p>
                          <p><strong>Fecha:</strong> {new Date(pedido.created_at.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                        <div className="pedido-actions">
                          <Button
                            variant="primary"
                            size="small"
                            icon="mdi-truck"
                            onClick={() => handleCreateEnvioFromPedido(pedido, 'productos')}
                          >
                            Crear Envío
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                )}

                {activeTab === 'requisiciones' && (
                  requisitionOrders.length === 0 ? (
                    <div className="empty-state">
                      <i className="mdi mdi-clipboard-check empty-icon"></i>
                      <h3>No hay requisiciones pendientes</h3>
                    </div>
                  ) : (
                    requisitionOrders.map(pedido => (
                      <div key={pedido.id} className="pedido-card requisicion">
                        <div className="pedido-header">
                          <div className="pedido-info">
                            <h4>{pedido.numero}</h4>
                            <span className="pedido-type">Requisición</span>
                          </div>
                          <span className={`priority-badge ${pedido.prioridad || 'normal'}`}>
                            {pedido.prioridad || 'Normal'}
                          </span>
                        </div>
                        <div className="pedido-details">
                          <p><strong>Solicitante:</strong> {pedido.solicitante}</p>
                          <p><strong>Departamento:</strong> {pedido.departamento}</p>
                          <p><strong>Artículos:</strong> {pedido.articulos?.length || 0} items</p>
                          <p><strong>Fecha:</strong> {new Date(pedido.created_at.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                        <div className="pedido-actions">
                          <Button
                            variant="primary"
                            size="small"
                            icon="mdi-truck"
                            onClick={() => handleCreateEnvioFromPedido(pedido, 'requisicion')}
                          >
                            Crear Envío
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-truck"></i>
                {editingEnvio ? 'Editar Envío' : 'Nuevo Envío'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="numero_seguimiento">N° Seguimiento</label>
                  <input
                    type="text"
                    id="numero_seguimiento"
                    value={formData.numero_seguimiento}
                    onChange={(e) => setFormData({...formData, numero_seguimiento: e.target.value})}
                    placeholder="Se generará automáticamente"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="tipo_pedido">Tipo de Pedido</label>
                  <select
                    id="tipo_pedido"
                    value={formData.tipo_pedido}
                    onChange={(e) => setFormData({...formData, tipo_pedido: e.target.value})}
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="productos">Productos</option>
                    <option value="requisicion">Requisición</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="destinatario">Destinatario *</label>
                  <input
                    type="text"
                    id="destinatario"
                    value={formData.destinatario}
                    onChange={(e) => setFormData({...formData, destinatario: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="direccion">Dirección *</label>
                  <input
                    type="text"
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="ciudad">Ciudad</label>
                  <input
                    type="text"
                    id="ciudad"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="codigo_postal">Código Postal</label>
                  <input
                    type="text"
                    id="codigo_postal"
                    value={formData.codigo_postal}
                    onChange={(e) => setFormData({...formData, codigo_postal: e.target.value})}
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
                  <label htmlFor="transportista">Transportista</label>
                  <select
                    id="transportista"
                    value={formData.transportista}
                    onChange={(e) => setFormData({...formData, transportista: e.target.value})}
                  >
                    <option value="">Seleccionar transportista</option>
                    <option value="dhl">DHL</option>
                    <option value="fedex">FedEx</option>
                    <option value="ups">UPS</option>
                    <option value="estafeta">Estafeta</option>
                    <option value="correos_mexico">Correos de México</option>
                    <option value="propio">Transporte Propio</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_envio">Fecha de Envío</label>
                  <input
                    type="date"
                    id="fecha_envio"
                    value={formData.fecha_envio}
                    onChange={(e) => setFormData({...formData, fecha_envio: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_entrega_estimada">Fecha Entrega Estimada</label>
                  <input
                    type="date"
                    id="fecha_entrega_estimada"
                    value={formData.fecha_entrega_estimada}
                    onChange={(e) => setFormData({...formData, fecha_entrega_estimada: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  >
                    <option value="preparando">Preparando</option>
                    <option value="enviado">Enviado</option>
                    <option value="en_transito">En Tránsito</option>
                    <option value="entregado">Entregado</option>
                    <option value="devuelto">Devuelto</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="costo_envio">Costo de Envío</label>
                  <input
                    type="number"
                    step="0.01"
                    id="costo_envio"
                    value={formData.costo_envio}
                    onChange={(e) => setFormData({...formData, costo_envio: e.target.value})}
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
                  {editingEnvio ? 'Actualizar' : 'Crear'} Envío
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default Envios;
