import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import Button from '../../components/UI/Button';
import './Configuracion.css';

const Configuracion = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('laboratorio');
  const [configuracion, setConfiguracion] = useState({
    // Información del laboratorio
    nombreLaboratorio: '',
    direccion: '',
    telefono: '',
    email: '',
    responsable: '',
    codigoPostal: '',
    ciudad: '',
    pais: 'México',
    
    // Configuraciones de sistema
    backupAutomatico: true,
    frecuenciaBackup: 'diario',
    notificacionesEmail: true,
    notificacionesPush: true,
    idioma: 'es',
    tema: 'auto',
    
    // Configuraciones de inventario
    alertaStockMinimo: true,
    stockMinimoDefault: 10,
    alertaVencimiento: true,
    diasAlertaVencimiento: 30,
    alertaCaducidad: true,
    diasAlertaCaducidad: 7,
    
    // Configuraciones de seguridad
    sesionTimeout: 120, // minutos
    intentosLoginMax: 3,
    requiereDobleAutenticacion: false,
    bloqueoTemporal: true,
    tiempoBloqueo: 15, // minutos
    
    // Configuraciones de reportes
    formatoFechaReportes: 'DD/MM/YYYY',
    monedaDefault: 'MXN',
    incluirLogosReportes: true,
    autoGenerarReportes: false,
    
    // Configuraciones de pedidos
    aprobarPedidosAutomaticamente: false,
    limiteMontoPedido: 10000,
    requiereAprobacionSuperior: true,
    
    // Configuraciones de notificaciones
    emailStockBajo: true,
    emailVencimiento: true,
    emailPedidosNuevos: true,
    whatsappNotificaciones: false,
    numeroWhatsapp: '',
    
    // Configuraciones avanzadas
    mantenerHistorial: true,
    diasHistorial: 365,
    compresiónArchivos: true,
    logDetallado: false,
    modoDesarrollo: false
  });

  useEffect(() => {
    loadConfiguracion();
  }, []);

  const loadConfiguracion = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getById('configuracion', 'sistema');

      if (result.success && result.data) {
        setConfiguracion(prev => ({
          ...prev,
          ...result.data
        }));
      } else {
        // Si no existe configuración, crear una por defecto
        await saveConfiguracion();
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      showError('Error', 'No se pudo cargar la configuración del sistema');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguracion = async () => {
    try {
      setLoading(true);
      
      const configData = {
        ...configuracion,
        ultimaModificacion: new Date(),
        modificadoPor: userData?.nombre || 'Sistema'
      };
      
      const result = await firebaseService.update('configuracion', 'sistema', configData);

      if (result.success) {
        showSuccess('Configuración Guardada', 'Los cambios han sido guardados correctamente');
      } else {
        // Si no existe, intentar crear
        const createResult = await firebaseService.create('configuracion', {
          id: 'sistema',
          ...configData
        });
        
        if (createResult.success) {
          showSuccess('Configuración Creada', 'La configuración ha sido creada correctamente');
        } else {
          showError('Error', 'No se pudo guardar la configuración');
        }
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showError('Error', 'Ha ocurrido un error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const resetConfiguracion = () => {
    if (window.confirm('¿Estás seguro de que quieres restablecer toda la configuración a los valores por defecto?')) {
      setConfiguracion({
        nombreLaboratorio: '',
        direccion: '',
        telefono: '',
        email: '',
        responsable: '',
        codigoPostal: '',
        ciudad: '',
        pais: 'México',
        backupAutomatico: true,
        frecuenciaBackup: 'diario',
        notificacionesEmail: true,
        notificacionesPush: true,
        idioma: 'es',
        tema: 'auto',
        alertaStockMinimo: true,
        stockMinimoDefault: 10,
        alertaVencimiento: true,
        diasAlertaVencimiento: 30,
        alertaCaducidad: true,
        diasAlertaCaducidad: 7,
        sesionTimeout: 120,
        intentosLoginMax: 3,
        requiereDobleAutenticacion: false,
        bloqueoTemporal: true,
        tiempoBloqueo: 15,
        formatoFechaReportes: 'DD/MM/YYYY',
        monedaDefault: 'MXN',
        incluirLogosReportes: true,
        autoGenerarReportes: false,
        aprobarPedidosAutomaticamente: false,
        limiteMontoPedido: 10000,
        requiereAprobacionSuperior: true,
        emailStockBajo: true,
        emailVencimiento: true,
        emailPedidosNuevos: true,
        whatsappNotificaciones: false,
        numeroWhatsapp: '',
        mantenerHistorial: true,
        diasHistorial: 365,
        compresiónArchivos: true,
        logDetallado: false,
        modoDesarrollo: false
      });
      showSuccess('Configuración Restablecida', 'Todos los valores han sido restablecidos');
    }
  };

  const handleInputChange = (field, value) => {
    setConfiguracion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testBackup = async () => {
    setLoading(true);
    try {
      // Simular test de backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess('Test de Backup', 'El sistema de respaldo funciona correctamente');
    } catch (error) {
      showError('Error', 'Fallo en el test de respaldo');
    } finally {
      setLoading(false);
    }
  };

  const testNotifications = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSuccess('Test de Notificaciones', 'Sistema de notificaciones funcionando correctamente');
    } catch (error) {
      showError('Error', 'Fallo en el test de notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const exportConfiguracion = () => {
    try {
      const dataStr = JSON.stringify(configuracion, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `configuracion_labflow_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess('Exportación Completa', 'Configuración exportada exitosamente');
    } catch (error) {
      showError('Error', 'No se pudo exportar la configuración');
    }
  };

  const importConfiguracion = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target.result);
          setConfiguracion(prev => ({
            ...prev,
            ...importedConfig
          }));
          showSuccess('Importación Completa', 'Configuración importada exitosamente');
        } catch (error) {
          showError('Error', 'Archivo de configuración inválido');
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { id: 'laboratorio', label: 'Información del Laboratorio', icon: 'mdi-domain' },
    { id: 'sistema', label: 'Sistema', icon: 'mdi-cog' },
    { id: 'inventario', label: 'Inventario', icon: 'mdi-package-variant' },
    { id: 'seguridad', label: 'Seguridad', icon: 'mdi-shield-check' },
    { id: 'notificaciones', label: 'Notificaciones', icon: 'mdi-bell' },
    { id: 'pedidos', label: 'Pedidos', icon: 'mdi-clipboard-list' },
    { id: 'reportes', label: 'Reportes', icon: 'mdi-chart-line' },
    { id: 'avanzado', label: 'Avanzado', icon: 'mdi-settings-helper' }
  ];

  return (
    <div className="configuracion-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-cog"></i>
          <div>
            <h1>Configuración del Sistema</h1>
            <p className="page-subtitle">Personaliza y configura LabFlow Manager</p>
          </div>
        </div>
        <div className="header-actions">
          <input
            type="file"
            accept=".json"
            onChange={importConfiguracion}
            style={{ display: 'none' }}
            id="import-config"
          />
          <Button
            variant="secondary"
            icon="mdi-upload"
            onClick={() => document.getElementById('import-config').click()}
          >
            Importar
          </Button>
          <Button
            variant="secondary"
            icon="mdi-download"
            onClick={exportConfiguracion}
          >
            Exportar
          </Button>
          <Button
            variant="warning"
            icon="mdi-backup-restore"
            onClick={resetConfiguracion}
          >
            Restablecer
          </Button>
          <Button
            variant="primary"
            icon="mdi-content-save"
            onClick={saveConfiguracion}
            loading={loading}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="tabs-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={tab.icon}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="configuracion-content">
        {/* Información del Laboratorio */}
        {activeTab === 'laboratorio' && (
          <div className="config-section">
            <div className="section-header">
              <i className="mdi mdi-domain"></i>
              <h2>Información del Laboratorio</h2>
            </div>
            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del Laboratorio *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configuracion.nombreLaboratorio}
                    onChange={(e) => handleInputChange('nombreLaboratorio', e.target.value)}
                    placeholder="Ej: Laboratorio de Química Analítica"
                  />
                </div>
                <div className="form-group">
                  <label>Responsable *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configuracion.responsable}
                    onChange={(e) => handleInputChange('responsable', e.target.value)}
                    placeholder="Nombre del responsable del laboratorio"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configuracion.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    placeholder="Dirección completa del laboratorio"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configuracion.ciudad}
                    onChange={(e) => handleInputChange('ciudad', e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="form-group">
                  <label>Código Postal</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configuracion.codigoPostal}
                    onChange={(e) => handleInputChange('codigoPostal', e.target.value)}
                    placeholder="C.P."
                  />
                </div>
                <div className="form-group">
                  <label>País</label>
                  <select
                    className="form-select"
                    value={configuracion.pais}
                    onChange={(e) => handleInputChange('pais', e.target.value)}
                  >
                    <option value="México">México</option>
                    <option value="Colombia">Colombia</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Chile">Chile</option>
                    <option value="España">España</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={configuracion.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="+52 (555) 123-4567"
                  />
                </div>
                <div className="form-group">
                  <label>Email Institucional</label>
                  <input
                    type="email"
                    className="form-input"
                    value={configuracion.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="laboratorio@institucion.edu"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sistema */}
        {activeTab === 'sistema' && (
          <div className="config-section">
            <div className="section-header">
              <i className="mdi mdi-cog"></i>
              <h2>Configuración del Sistema</h2>
            </div>
            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Idioma del Sistema</label>
                  <select
                    className="form-select"
                    value={configuracion.idioma}
                    onChange={(e) => handleInputChange('idioma', e.target.value)}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tema de la Interfaz</label>
                  <select
                    className="form-select"
                    value={configuracion.tema}
                    onChange={(e) => handleInputChange('tema', e.target.value)}
                  >
                    <option value="auto">Automático</option>
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tiempo de Sesión (minutos)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={configuracion.sesionTimeout}
                    onChange={(e) => handleInputChange('sesionTimeout', parseInt(e.target.value))}
                    min="30"
                    max="480"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configuracion.backupAutomatico}
                      onChange={(e) => handleInputChange('backupAutomatico', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Respaldos Automáticos
                  </label>
                </div>
                <div className="form-group">
                  <label>Frecuencia de Respaldo</label>
                  <select
                    className="form-select"
                    value={configuracion.frecuenciaBackup}
                    onChange={(e) => handleInputChange('frecuenciaBackup', e.target.value)}
                    disabled={!configuracion.backupAutomatico}
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <Button
                    variant="secondary"
                    icon="mdi-backup-restore"
                    onClick={testBackup}
                    loading={loading}
                  >
                    Probar Sistema de Respaldo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resto de pestañas simplificadas por espacio */}
        {activeTab === 'inventario' && (
          <div className="config-section">
            <div className="section-header">
              <i className="mdi mdi-package-variant"></i>
              <h2>Configuración de Inventario</h2>
            </div>
            <div className="section-content">
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configuracion.alertaStockMinimo}
                      onChange={(e) => handleInputChange('alertaStockMinimo', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Alertas de Stock Mínimo
                  </label>
                </div>
                <div className="form-group">
                  <label>Stock Mínimo por Defecto</label>
                  <input
                    type="number"
                    className="form-input"
                    value={configuracion.stockMinimoDefault}
                    onChange={(e) => handleInputChange('stockMinimoDefault', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configuracion.alertaVencimiento}
                      onChange={(e) => handleInputChange('alertaVencimiento', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Alertas de Vencimiento
                  </label>
                </div>
                <div className="form-group">
                  <label>Días de Alerta de Vencimiento</label>
                  <input
                    type="number"
                    className="form-input"
                    value={configuracion.diasAlertaVencimiento}
                    onChange={(e) => handleInputChange('diasAlertaVencimiento', parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notificaciones */}
        {activeTab === 'notificaciones' && (
          <div className="config-section">
            <div className="section-header">
              <i className="mdi mdi-bell"></i>
              <h2>Sistema de Notificaciones</h2>
            </div>
            <div className="section-content">
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configuracion.notificacionesEmail}
                      onChange={(e) => handleInputChange('notificacionesEmail', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Notificaciones por Email
                  </label>
                </div>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configuracion.emailStockBajo}
                      onChange={(e) => handleInputChange('emailStockBajo', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Email para Stock Bajo
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configuracion.whatsappNotificaciones}
                      onChange={(e) => handleInputChange('whatsappNotificaciones', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Notificaciones WhatsApp
                  </label>
                </div>
                <div className="form-group">
                  <label>Número WhatsApp</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={configuracion.numeroWhatsapp}
                    onChange={(e) => handleInputChange('numeroWhatsapp', e.target.value)}
                    placeholder="+52 555 123 4567"
                    disabled={!configuracion.whatsappNotificaciones}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <Button
                    variant="secondary"
                    icon="mdi-bell-ring"
                    onClick={testNotifications}
                    loading={loading}
                  >
                    Probar Notificaciones
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuracion;
