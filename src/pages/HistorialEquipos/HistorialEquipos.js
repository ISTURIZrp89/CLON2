import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';

const HistorialEquipos = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const { userData } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState('');
  const [formData, setFormData] = useState({
    equipo_id: '',
    tipo_evento: '',
    descripcion: '',
    fecha_evento: '',
    duracion_horas: '',
    costo: '',
    tecnico: '',
    proveedor_servicio: '',
    estado_anterior: '',
    estado_nuevo: '',
    observaciones: '',
    archivo_adjunto: ''
  });

  useEffect(() => {
    loadHistorial();
    loadEquipos();
  }, []);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('historial_equipos');
      if (result.success) {
        setHistorial(result.data || []);
      } else {
        showError('Error', 'No se pudo cargar el historial');
      }
    } catch (error) {
      console.error('Error loading historial:', error);
      showError('Error', 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipos = async () => {
    try {
      const result = await firebaseService.getAll('equipos');
      if (result.success) {
        setEquipos(result.data || []);
      }
    } catch (error) {
      console.error('Error loading equipos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.equipo_id || !formData.tipo_evento || !formData.descripcion) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      
      const historialData = {
        ...formData,
        duracion_horas: parseFloat(formData.duracion_horas) || 0,
        costo: parseFloat(formData.costo) || 0,
        fecha_evento: formData.fecha_evento || new Date().toISOString().split('T')[0],
        usuario: userData?.nombre || 'Usuario',
        usuario_id: userData?.id || 'unknown',
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await firebaseService.create('historial_equipos', historialData);
      if (result.success) {
        // Update equipment status if changed
        if (formData.estado_nuevo && formData.estado_nuevo !== formData.estado_anterior) {
          await firebaseService.update('equipos', formData.equipo_id, {
            estado: formData.estado_nuevo,
            updated_at: new Date()
          });
          
          // Update maintenance dates for maintenance events
          if (formData.tipo_evento === 'mantenimiento') {
            const today = new Date();
            const equipo = equipos.find(e => e.id === formData.equipo_id);
            const frecuencia = equipo?.frecuencia_mantenimiento || 30;
            const proximoMantenimiento = new Date();
            proximoMantenimiento.setDate(today.getDate() + frecuencia);
            
            await firebaseService.update('equipos', formData.equipo_id, {
              ultimo_mantenimiento: today,
              proximo_mantenimiento: proximoMantenimiento,
              updated_at: new Date()
            });
          }
          
          // Reload equipos to update local state
          await loadEquipos();
        }
        
        showSuccess('Éxito', 'Evento registrado en el historial');
        await loadHistorial();
        handleCloseModal();
      } else {
        showError('Error', 'No se pudo registrar el evento');
      }
    } catch (error) {
      console.error('Error saving historial:', error);
      showError('Error', 'Error al guardar el evento');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      equipo_id: '',
      tipo_evento: '',
      descripcion: '',
      fecha_evento: '',
      duracion_horas: '',
      costo: '',
      tecnico: '',
      proveedor_servicio: '',
      estado_anterior: '',
      estado_nuevo: '',
      observaciones: '',
      archivo_adjunto: ''
    });
  };

  const onEquipoChange = (equipoId) => {
    const equipo = equipos.find(e => e.id === equipoId);
    if (equipo) {
      setFormData({
        ...formData,
        equipo_id: equipoId,
        estado_anterior: equipo.estado || '',
        tecnico: equipo.responsable || ''
      });
    }
  };

  const getEquipoInfo = (equipoId) => {
    const equipo = equipos.find(e => e.id === equipoId);
    return equipo ? `${equipo.codigo} - ${equipo.nombre}` : equipoId;
  };

  const filterByEquipo = (equipoId) => {
    setSelectedEquipo(equipoId);
  };

  const filteredHistorial = selectedEquipo 
    ? historial.filter(h => h.equipo_id === selectedEquipo)
    : historial;

  const columns = [
    {
      key: 'fecha_evento',
      label: 'Fecha',
      render: (value) => value ? new Date(value.seconds * 1000).toLocaleDateString() : '-'
    },
    { 
      key: 'equipo_id', 
      label: 'Equipo',
      render: (value) => getEquipoInfo(value)
    },
    {
      key: 'tipo_evento',
      label: 'Tipo',
      render: (value) => {
        const types = {
          mantenimiento: { label: 'Mantenimiento', color: 'info' },
          reparacion: { label: 'Reparación', color: 'warning' },
          calibracion: { label: 'Calibración', color: 'success' },
          incidente: { label: 'Incidente', color: 'danger' },
          inspeccion: { label: 'Inspección', color: 'secondary' },
          actualizacion: { label: 'Actualización', color: 'info' }
        };
        const type = types[value] || { label: value, color: 'secondary' };
        return (
          <span className={`status-badge ${type.color}`}>
            {type.label}
          </span>
        );
      }
    },
    { key: 'descripcion', label: 'Descripción' },
    { 
      key: 'duracion_horas', 
      label: 'Duración',
      render: (value) => value ? `${value}h` : '-'
    },
    { 
      key: 'costo', 
      label: 'Costo',
      render: (value) => value ? `$${value.toFixed(2)}` : '-'
    },
    { key: 'tecnico', label: 'Técnico' },
    { key: 'usuario', label: 'Registrado por' }
  ];

  const actions = [
    {
      label: 'Ver Detalles',
      icon: 'mdi-eye',
      onClick: (evento) => {
        showWarning('Detalles del Evento', `${evento.tipo_evento}: ${evento.descripcion}\nObservaciones: ${evento.observaciones || 'Ninguna'}`);
      },
      className: 'btn-secondary'
    }
  ];

  return (
    <div className="historial-equipos-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-history"></i>
          <h1>Historial de Equipos</h1>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* Equipment Filter */}
      <div className="filter-section" style={{ 
        marginBottom: '2rem', 
        padding: '1rem', 
        background: 'var(--background-primary)', 
        borderRadius: 'var(--radius-md)' 
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Filtrar por equipo:</label>
          <select
            value={selectedEquipo}
            onChange={(e) => filterByEquipo(e.target.value)}
            style={{ 
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}
          >
            <option value="">Todos los equipos</option>
            {equipos.map(equipo => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.codigo} - {equipo.nombre}
              </option>
            ))}
          </select>
          {selectedEquipo && (
            <Button
              onClick={() => setSelectedEquipo('')}
              className="btn-secondary btn-small"
              icon="mdi-close"
            >
              Limpiar filtro
            </Button>
          )}
        </div>
      </div>

      <div className="page-content">
        <DataTable
          data={filteredHistorial}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          searchPlaceholder="Buscar en historial..."
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-history"></i>
                Nuevo Evento en Historial
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="equipo_id">Equipo *</label>
                  <select
                    id="equipo_id"
                    value={formData.equipo_id}
                    onChange={(e) => onEquipoChange(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar equipo</option>
                    {equipos.map(equipo => (
                      <option key={equipo.id} value={equipo.id}>
                        {equipo.codigo} - {equipo.nombre} ({equipo.estado})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="tipo_evento">Tipo de Evento *</label>
                  <select
                    id="tipo_evento"
                    value={formData.tipo_evento}
                    onChange={(e) => setFormData({...formData, tipo_evento: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="mantenimiento">Mantenimiento Preventivo</option>
                    <option value="reparacion">Reparación</option>
                    <option value="calibracion">Calibración</option>
                    <option value="incidente">Incidente/Falla</option>
                    <option value="inspeccion">Inspección</option>
                    <option value="actualizacion">Actualización/Modificación</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_evento">Fecha del Evento</label>
                  <input
                    type="date"
                    id="fecha_evento"
                    value={formData.fecha_evento}
                    onChange={(e) => setFormData({...formData, fecha_evento: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="duracion_horas">Duración (horas)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    id="duracion_horas"
                    value={formData.duracion_horas}
                    onChange={(e) => setFormData({...formData, duracion_horas: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="costo">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo"
                    value={formData.costo}
                    onChange={(e) => setFormData({...formData, costo: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="tecnico">Técnico Responsable</label>
                  <input
                    type="text"
                    id="tecnico"
                    value={formData.tecnico}
                    onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="proveedor_servicio">Proveedor de Servicio</label>
                  <input
                    type="text"
                    id="proveedor_servicio"
                    value={formData.proveedor_servicio}
                    onChange={(e) => setFormData({...formData, proveedor_servicio: e.target.value})}
                  />
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
                    <option value="operativo">Operativo</option>
                    <option value="mantenimiento">En Mantenimiento</option>
                    <option value="reparacion">En Reparación</option>
                    <option value="calibracion">En Calibración</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción *</label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    rows="3"
                    required
                    placeholder="Describe detalladamente el evento, trabajo realizado, problemas encontrados, etc."
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="observaciones">Observaciones</label>
                  <textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    rows="3"
                    placeholder="Observaciones adicionales, recomendaciones, próximas acciones..."
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="archivo_adjunto">Archivo Adjunto (URL)</label>
                  <input
                    type="url"
                    id="archivo_adjunto"
                    value={formData.archivo_adjunto}
                    onChange={(e) => setFormData({...formData, archivo_adjunto: e.target.value})}
                    placeholder="https://ejemplo.com/documento.pdf"
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <Button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" loading={loading}>
                  Registrar Evento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialEquipos;
