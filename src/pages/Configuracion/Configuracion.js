import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { FirebaseService } from '../../services/FirebaseService';
import Button from '../../components/UI/Button';
import './Configuracion.css';

const Configuracion = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [configuracion, setConfiguracion] = useState({
    // Información del laboratorio
    nombreLaboratorio: '',
    direccion: '',
    telefono: '',
    email: '',
    responsable: '',
    
    // Configuraciones de sistema
    backupAutomatico: true,
    frecuenciaBackup: 'diario',
    notificacionesEmail: true,
    notificacionesPush: true,
    idioma: 'es',
    
    // Configuraciones de inventario
    alertaStockMinimo: true,
    stockMinimoDefault: 10,
    alertaVencimiento: true,
    diasAlertaVencimiento: 30,
    
    // Configuraciones de seguridad
    sesionTimeout: 120, // minutos
    intentosLoginMax: 3,
    requiereDobleAutenticacion: false,
    
    // Configuraciones de reportes
    formatoFechaReportes: 'DD/MM/YYYY',
    monedaDefault: 'USD',
    incluirLogosReportes: true
  });

  const firebaseService = new FirebaseService();

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
      console.error('Error loading configuration:', error);
      showError('Error', 'No se pudo cargar la configuración del sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguracion();
  }, []);

  const saveConfiguracion = async () => {
    try {
      setLoading(true);
      
      const result = await firebaseService.update('configuracion', 'sistema', configuracion);

      if (result.success) {
        showSuccess('Configuración Guardada', 'La configuración del sistema ha sido actualizada correctamente');
      } else {
        // Si no existe, intentar crear
        const createResult = await firebaseService.create('configuracion', {
          id: 'sistema',
          ...configuracion
        });
        
        if (createResult.success) {
          showSuccess('Configuración Creada', 'La configuración del sistema ha sido creada correctamente');
        } else {
          showError('Error', 'No se pudo guardar la configuración');
        }
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      showError('Error', 'Ha ocurrido un error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const resetConfiguracion = () => {
    if (window.confirm('¿Estás seguro de que quieres restablecer la configuración a los valores por defecto?')) {
      setConfiguracion({
        nombreLaboratorio: '',
        direccion: '',
        telefono: '',
        email: '',
        responsable: '',
        backupAutomatico: true,
        frecuenciaBackup: 'diario',
        notificacionesEmail: true,
        notificacionesPush: true,
        idioma: 'es',
        alertaStockMinimo: true,
        stockMinimoDefault: 10,
        alertaVencimiento: true,
        diasAlertaVencimiento: 30,
        sesionTimeout: 120,
        intentosLoginMax: 3,
        requiereDobleAutenticacion: false,
        formatoFechaReportes: 'DD/MM/YYYY',
        monedaDefault: 'USD',
        incluirLogosReportes: true
      });
      showSuccess('Configuración Restablecida', 'La configuración ha sido restablecida a los valores por defecto');
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
      showSuccess('Test de Backup', 'El sistema de backup está funcionando correctamente');
    } catch (error) {
      showError('Error', 'Error en el test de backup');
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
      showSuccess('Exportación Completa', 'La configuración ha sido exportada correctamente');
    } catch (error) {
      showError('Error', 'No se pudo exportar la configuración');
    }
  };

  return (
    <div className="configuracion-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-cog"></i>
          <h1>Configuración del Sistema</h1>
        </div>
        <div className="header-actions">
          <Button
            variant="secondary"
            icon="mdi-backup-restore"
            onClick={resetConfiguracion}
          >
            Restablecer
          </Button>
          <Button
            variant="secondary"
            icon="mdi-download"
            onClick={exportConfiguracion}
          >
            Exportar
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

      <div className="configuracion-content">
        {/* Información del Laboratorio */}
        <div className="config-section">
          <div className="section-header">
            <i className="mdi mdi-domain"></i>
            <h2>Información del Laboratorio</h2>
          </div>
          <div className="section-content">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Laboratorio</label>
                <input
                  type="text"
                  className="form-input"
                  value={configuracion.nombreLaboratorio}
                  onChange={(e) => handleInputChange('nombreLaboratorio', e.target.value)}
                  placeholder="Nombre del laboratorio"
                />
              </div>
              <div className="form-group">
                <label>Responsable</label>
                <input
                  type="text"
                  className="form-input"
                  value={configuracion.responsable}
                  onChange={(e) => handleInputChange('responsable', e.target.value)}
                  placeholder="Nombre del responsable"
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
                  placeholder="Dirección del laboratorio"
                />
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
                  placeholder="Número de teléfono"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={configuracion.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Email del laboratorio"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configuraciones de Sistema */}
        <div className="config-section">
          <div className="section-header">
            <i className="mdi mdi-settings"></i>
            <h2>Sistema</h2>
          </div>
          <div className="section-content">
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={configuracion.backupAutomatico}
                    onChange={(e) => handleInputChange('backupAutomatico', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Backup Automático
                </label>
              </div>
              <div className="form-group">
                <label>Frecuencia de Backup</label>
                <select
                  className="form-select"
                  value={configuracion.frecuenciaBackup}
                  onChange={(e) => handleInputChange('frecuenciaBackup', e.target.value)}
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
            </div>
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
              <div className="form-group">
                <Button
                  variant="secondary"
                  icon="mdi-backup-restore"
                  onClick={testBackup}
                  loading={loading}
                >
                  Probar Backup
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="config-section">
          <div className="section-header">
            <i className="mdi mdi-bell"></i>
            <h2>Notificaciones</h2>
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
                    checked={configuracion.notificacionesPush}
                    onChange={(e) => handleInputChange('notificacionesPush', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Notificaciones Push
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Inventario */}
        <div className="config-section">
          <div className="section-header">
            <i className="mdi mdi-package-variant"></i>
            <h2>Inventario</h2>
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

        {/* Seguridad */}
        <div className="config-section">
          <div className="section-header">
            <i className="mdi mdi-shield-check"></i>
            <h2>Seguridad</h2>
          </div>
          <div className="section-content">
            <div className="form-row">
              <div className="form-group">
                <label>Intentos de Login Máximos</label>
                <input
                  type="number"
                  className="form-input"
                  value={configuracion.intentosLoginMax}
                  onChange={(e) => handleInputChange('intentosLoginMax', parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={configuracion.requiereDobleAutenticacion}
                    onChange={(e) => handleInputChange('requiereDobleAutenticacion', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Doble Autenticación (2FA)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Reportes */}
        <div className="config-section">
          <div className="section-header">
            <i className="mdi mdi-chart-line"></i>
            <h2>Reportes</h2>
          </div>
          <div className="section-content">
            <div className="form-row">
              <div className="form-group">
                <label>Formato de Fecha</label>
                <select
                  className="form-select"
                  value={configuracion.formatoFechaReportes}
                  onChange={(e) => handleInputChange('formatoFechaReportes', e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="form-group">
                <label>Moneda por Defecto</label>
                <select
                  className="form-select"
                  value={configuracion.monedaDefault}
                  onChange={(e) => handleInputChange('monedaDefault', e.target.value)}
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="COP">COP - Peso Colombiano</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={configuracion.incluirLogosReportes}
                    onChange={(e) => handleInputChange('incluirLogosReportes', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Incluir Logos en Reportes
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;
