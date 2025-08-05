import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import useOfflineData from '../../hooks/useOfflineData';

const Equipos = () => {
  const { showSuccess, showError, showWarning } = useNotification();

  // Hook de persistencia offline
  const {
    data: equipos,
    loading,
    error,
    refresh,
    createDocument,
    updateDocument,
    deleteDocument,
    isOffline
  } = useOfflineData('equipos', {
    orderBy: 'nombre',
    orderDirection: 'asc',
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTime: true
  });
  const [showModal, setShowModal] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    categoria: '',
    ubicacion: '',
    estado: 'operativo',
    fecha_adquisicion: '',
    costo_adquisicion: '',
    proveedor: '',
    garantia_hasta: '',
    ultimo_mantenimiento: '',
    proximo_mantenimiento: '',
    frecuencia_mantenimiento: '',
    responsable: '',
    observaciones: '',
    especificaciones: ''
  });

  // Los equipos se cargan automáticamente a través del hook useOfflineData

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.codigo || !formData.categoria) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      const equipoData = {
        ...formData,
        costo_adquisicion: parseFloat(formData.costo_adquisicion) || 0,
        frecuencia_mantenimiento: parseInt(formData.frecuencia_mantenimiento) || 0,
        updated_at: new Date()
      };

      if (editingEquipo) {
        const result = await firebaseService.update('equipos', editingEquipo.id, equipoData);
        if (result.success) {
          showSuccess('Éxito', 'Equipo actualizado correctamente');
        } else {
          showError('Error', 'No se pudo actualizar el equipo');
        }
      } else {
        equipoData.created_at = new Date();
        const result = await firebaseService.create('equipos', equipoData);
        if (result.success) {
          showSuccess('Éxito', 'Equipo creado correctamente');
        } else {
          showError('Error', 'No se pudo crear el equipo');
        }
      }

      await loadEquipos();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving equipo:', error);
      showError('Error', 'Error al guardar el equipo');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (equipo) => {
    setEditingEquipo(equipo);
    setFormData({
      nombre: equipo.nombre || '',
      codigo: equipo.codigo || '',
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      numero_serie: equipo.numero_serie || '',
      categoria: equipo.categoria || '',
      ubicacion: equipo.ubicacion || '',
      estado: equipo.estado || 'operativo',
      fecha_adquisicion: equipo.fecha_adquisicion ? new Date(equipo.fecha_adquisicion.seconds * 1000).toISOString().split('T')[0] : '',
      costo_adquisicion: equipo.costo_adquisicion || '',
      proveedor: equipo.proveedor || '',
      garantia_hasta: equipo.garantia_hasta ? new Date(equipo.garantia_hasta.seconds * 1000).toISOString().split('T')[0] : '',
      ultimo_mantenimiento: equipo.ultimo_mantenimiento ? new Date(equipo.ultimo_mantenimiento.seconds * 1000).toISOString().split('T')[0] : '',
      proximo_mantenimiento: equipo.proximo_mantenimiento ? new Date(equipo.proximo_mantenimiento.seconds * 1000).toISOString().split('T')[0] : '',
      frecuencia_mantenimiento: equipo.frecuencia_mantenimiento || '',
      responsable: equipo.responsable || '',
      observaciones: equipo.observaciones || '',
      especificaciones: equipo.especificaciones || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (equipo) => {
    if (window.confirm(`¿Estás seguro de eliminar el equipo "${equipo.nombre}"?`)) {
      try {
        const result = await firebaseService.delete('equipos', equipo.id);
        if (result.success) {
          showSuccess('Éxito', 'Equipo eliminado correctamente');
          await loadEquipos();
        } else {
          showError('Error', 'No se pudo eliminar el equipo');
        }
      } catch (error) {
        console.error('Error deleting equipo:', error);
        showError('Error', 'Error al eliminar el equipo');
      }
    }
  };

  const handleMantenimiento = async (equipo) => {
    try {
      const fechaMantenimiento = new Date();
      const proximoMantenimiento = new Date();
      proximoMantenimiento.setDate(proximoMantenimiento.getDate() + (equipo.frecuencia_mantenimiento || 30));

      await firebaseService.update('equipos', equipo.id, {
        ultimo_mantenimiento: fechaMantenimiento,
        proximo_mantenimiento: proximoMantenimiento,
        updated_at: new Date()
      });

      // Crear registro de mantenimiento
      await firebaseService.create('historial_equipos', {
        equipo_id: equipo.id,
        tipo_evento: 'mantenimiento',
        descripcion: 'Mantenimiento preventivo realizado',
        fecha_evento: fechaMantenimiento,
        usuario: 'Sistema',
        created_at: new Date()
      });

      showSuccess('Éxito', 'Mantenimiento registrado correctamente');
      await loadEquipos();
    } catch (error) {
      console.error('Error registering maintenance:', error);
      showError('Error', 'Error al registrar el mantenimiento');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEquipo(null);
    setFormData({
      nombre: '',
      codigo: '',
      marca: '',
      modelo: '',
      numero_serie: '',
      categoria: '',
      ubicacion: '',
      estado: 'operativo',
      fecha_adquisicion: '',
      costo_adquisicion: '',
      proveedor: '',
      garantia_hasta: '',
      ultimo_mantenimiento: '',
      proximo_mantenimiento: '',
      frecuencia_mantenimiento: '',
      responsable: '',
      observaciones: '',
      especificaciones: ''
    });
  };

  const getMaintenanceStatus = (equipo) => {
    if (!equipo.proximo_mantenimiento) return 'sin-programar';
    
    const today = new Date();
    const proximoMantenimiento = new Date(equipo.proximo_mantenimiento.seconds * 1000);
    const diffTime = proximoMantenimiento - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'vencido';
    if (diffDays <= 7) return 'urgente';
    if (diffDays <= 30) return 'proximo';
    return 'programado';
  };

  const columns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'marca', label: 'Marca' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'ubicacion', label: 'Ubicación' },
    {
      key: 'estado',
      label: 'Estado',
      render: (value) => {
        const statusColors = {
          operativo: 'success',
          mantenimiento: 'warning',
          reparacion: 'danger',
          fuera_servicio: 'danger',
          calibracion: 'info'
        };
        const statusLabels = {
          operativo: 'Operativo',
          mantenimiento: 'Mantenimiento',
          reparacion: 'Reparación',
          fuera_servicio: 'Fuera de Servicio',
          calibracion: 'Calibración'
        };
        return (
          <span className={`status-badge ${statusColors[value] || 'secondary'}`}>
            {statusLabels[value] || value}
          </span>
        );
      }
    },
    {
      key: 'proximo_mantenimiento',
      label: 'Mantenimiento',
      render: (value, row) => {
        const status = getMaintenanceStatus(row);
        const statusColors = {
          'sin-programar': 'secondary',
          'vencido': 'danger',
          'urgente': 'warning',
          'proximo': 'info',
          'programado': 'success'
        };
        const statusLabels = {
          'sin-programar': 'No programado',
          'vencido': 'Vencido',
          'urgente': 'Urgente',
          'proximo': 'Próximo',
          'programado': 'Programado'
        };
        
        return (
          <span className={`status-badge ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        );
      }
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
      label: 'Mantenimiento',
      icon: 'mdi-wrench',
      onClick: handleMantenimiento,
      className: 'btn-warning'
    },
    {
      label: 'Eliminar',
      icon: 'mdi-delete',
      onClick: handleDelete,
      className: 'btn-danger'
    }
  ];

  return (
    <div className="equipos-page">
      {/* Estado de Conexión y Persistencia Offline */}
      <ConnectionStatus />

      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-cog"></i>
          <h1>Gestión de Equipos</h1>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nuevo Equipo
          </Button>
        </div>
      </div>

      <div className="page-content">
        <DataTable
          data={equipos}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          searchPlaceholder="Buscar equipos..."
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-cog"></i>
                {editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="codigo">Código *</label>
                  <input
                    type="text"
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    required
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
                  <label htmlFor="marca">Marca</label>
                  <input
                    type="text"
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({...formData, marca: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="modelo">Modelo</label>
                  <input
                    type="text"
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="numero_serie">Número de Serie</label>
                  <input
                    type="text"
                    id="numero_serie"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="categoria">Categor��a *</label>
                  <select
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="microscopios">Microscopios</option>
                    <option value="balanzas">Balanzas</option>
                    <option value="centrifugas">Centrífugas</option>
                    <option value="espectrofotometros">Espectrofotómetros</option>
                    <option value="incubadoras">Incubadoras</option>
                    <option value="autoclaves">Autoclaves</option>
                    <option value="ph_metros">pH Metros</option>
                    <option value="agitadores">Agitadores</option>
                    <option value="refrigeradores">Refrigeradores</option>
                    <option value="hornos">Hornos</option>
                    <option value="computadoras">Computadoras</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="ubicacion">Ubicación</label>
                  <input
                    type="text"
                    id="ubicacion"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  >
                    <option value="operativo">Operativo</option>
                    <option value="mantenimiento">En Mantenimiento</option>
                    <option value="reparacion">En Reparación</option>
                    <option value="calibracion">En Calibración</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_adquisicion">Fecha de Adquisición</label>
                  <input
                    type="date"
                    id="fecha_adquisicion"
                    value={formData.fecha_adquisicion}
                    onChange={(e) => setFormData({...formData, fecha_adquisicion: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="costo_adquisicion">Costo de Adquisición</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_adquisicion"
                    value={formData.costo_adquisicion}
                    onChange={(e) => setFormData({...formData, costo_adquisicion: e.target.value})}
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
                  <label htmlFor="garantia_hasta">Garantía Hasta</label>
                  <input
                    type="date"
                    id="garantia_hasta"
                    value={formData.garantia_hasta}
                    onChange={(e) => setFormData({...formData, garantia_hasta: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="ultimo_mantenimiento">Último Mantenimiento</label>
                  <input
                    type="date"
                    id="ultimo_mantenimiento"
                    value={formData.ultimo_mantenimiento}
                    onChange={(e) => setFormData({...formData, ultimo_mantenimiento: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="proximo_mantenimiento">Próximo Mantenimiento</label>
                  <input
                    type="date"
                    id="proximo_mantenimiento"
                    value={formData.proximo_mantenimiento}
                    onChange={(e) => setFormData({...formData, proximo_mantenimiento: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="frecuencia_mantenimiento">Frecuencia Mantenimiento (días)</label>
                  <input
                    type="number"
                    min="1"
                    id="frecuencia_mantenimiento"
                    value={formData.frecuencia_mantenimiento}
                    onChange={(e) => setFormData({...formData, frecuencia_mantenimiento: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="responsable">Responsable</label>
                  <input
                    type="text"
                    id="responsable"
                    value={formData.responsable}
                    onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="especificaciones">Especificaciones</label>
                  <textarea
                    id="especificaciones"
                    value={formData.especificaciones}
                    onChange={(e) => setFormData({...formData, especificaciones: e.target.value})}
                    rows="3"
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
                  {editingEquipo ? 'Actualizar' : 'Crear'} Equipo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipos;
