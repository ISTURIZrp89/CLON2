import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';

const Envios = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [envios, setEnvios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEnvio, setEditingEnvio] = useState(null);
  const [formData, setFormData] = useState({
    numero_seguimiento: '',
    pedido_id: '',
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
      const result = await firebaseService.getAll('pedidos');
      if (result.success) {
        setPedidos(result.data || []);
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
          
          // Update pedido status to 'enviado'
          if (formData.pedido_id) {
            await firebaseService.update('pedidos', formData.pedido_id, {
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
      handleCloseModal();
    } catch (error) {
      console.error('Error saving envio:', error);
      showError('Error', 'Error al guardar el envío');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (envio) => {
    setEditingEnvio(envio);
    setFormData({
      numero_seguimiento: envio.numero_seguimiento || '',
      pedido_id: envio.pedido_id || '',
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

  const getPedidoInfo = (pedidoId) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    return pedido ? `${pedido.numero || pedidoId} - ${pedido.cliente || 'Cliente'}` : pedidoId;
  };

  const columns = [
    { key: 'numero_seguimiento', label: 'N° Seguimiento' },
    { 
      key: 'pedido_id', 
      label: 'Pedido',
      render: (value) => getPedidoInfo(value)
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

  return (
    <div className="envios-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-truck"></i>
          <h1>Gestión de Envíos</h1>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nuevo Envío
          </Button>
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

      {/* Modal */}
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
                  <label htmlFor="pedido_id">Pedido *</label>
                  <select
                    id="pedido_id"
                    value={formData.pedido_id}
                    onChange={(e) => setFormData({...formData, pedido_id: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar pedido</option>
                    {pedidos.map(pedido => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.numero || pedido.id} - {pedido.cliente || 'Cliente'}
                      </option>
                    ))}
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
