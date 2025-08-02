import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import firebaseService from '../../services/FirebaseService';
import Button from '../../components/UI/Button';
import './Ajustes.css';

const Ajustes = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const { userData, hasRole } = useAuth();
  const { config, updateConfig } = useConfig();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [generalSettings, setGeneralSettings] = useState({
    companyName: config?.companyName || '',
    companyAddress: config?.companyAddress || '',
    companyPhone: config?.companyPhone || '',
    companyEmail: config?.companyEmail || '',
    currency: config?.currency || 'MXN',
    taxRate: config?.taxRate || '16',
    timezone: config?.timezone || 'America/Mexico_City',
    dateFormat: config?.dateFormat || 'dd/mm/yyyy',
    language: config?.language || 'es',
    logoIcon: config?.logoIcon || 'mdi-beaker-outline',
    logoType: config?.logoType || 'laboratorio'
  });
  const [inventorySettings, setInventorySettings] = useState({
    autoGenerateCodes: true,
    codePrefix: 'INS',
    lowStockWarning: true,
    expiryWarningDays: '30',
    autoDeductStock: true,
    allowNegativeStock: false,
    defaultLocation: 'Almacén Principal',
    requireLotNumbers: false
  });
  const [equipmentSettings, setEquipmentSettings] = useState({
    autoGenerateCodes: true,
    codePrefix: 'EQP',
    maintenanceWarning: true,
    maintenanceAdvanceDays: '7',
    requireCalibration: false,
    calibrationFrequency: '365',
    maintenanceFrequency: '30',
    equipmentResponsible: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    stockAlerts: true,
    maintenanceAlerts: true,
    orderAlerts: true,
    systemAlerts: true,
    weeklyReports: false,
    monthlyReports: true
  });
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: '60',
    maxLoginAttempts: '3',
    passwordMinLength: '6',
    requireUppercase: false,
    requireNumbers: true,
    requireSymbols: false,
    twoFactorAuth: false,
    auditLog: true
  });
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retentionDays: '30',
    emailBackupReports: true,
    lastBackup: null
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (config) {
      setGeneralSettings({
        companyName: config.companyName || '',
        companyAddress: config.companyAddress || '',
        companyPhone: config.companyPhone || '',
        companyEmail: config.companyEmail || '',
        currency: config.currency || 'MXN',
        taxRate: config.taxRate || '16',
        timezone: config.timezone || 'America/Mexico_City',
        dateFormat: config.dateFormat || 'dd/mm/yyyy',
        language: config.language || 'es',
        logoIcon: config.logoIcon || 'mdi-beaker-outline',
        logoType: config.logoType || 'laboratorio'
      });
    }
  }, [config]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('ajustes');
      
      if (result.success && result.data && result.data.length > 0) {
        const settings = result.data[0];
        
        if (settings.general) setGeneralSettings({ ...generalSettings, ...settings.general });
        if (settings.inventory) setInventorySettings({ ...inventorySettings, ...settings.inventory });
        if (settings.equipment) setEquipmentSettings({ ...equipmentSettings, ...settings.equipment });
        if (settings.notifications) setNotificationSettings({ ...notificationSettings, ...settings.notifications });
        if (settings.security) setSecuritySettings({ ...securitySettings, ...settings.security });
        if (settings.backup) setBackupSettings({ ...backupSettings, ...settings.backup });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showError('Error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (category, settings) => {
    if (!hasRole('administrador')) {
      showError('Error', 'Solo los administradores pueden modificar la configuración');
      return;
    }

    try {
      setLoading(true);
      
      // Get existing settings
      const result = await firebaseService.getAll('ajustes');
      let settingsDoc = {};
      let docId = null;

      if (result.success && result.data && result.data.length > 0) {
        settingsDoc = result.data[0];
        docId = settingsDoc.id;
      }

      // Update specific category
      settingsDoc[category] = settings;
      settingsDoc.updated_at = new Date();
      settingsDoc.updated_by = userData?.nombre || 'Usuario';

      if (docId) {
        await firebaseService.update('ajustes', docId, settingsDoc);
      } else {
        settingsDoc.created_at = new Date();
        await firebaseService.create('ajustes', settingsDoc);
      }

      // If saving general settings, also update the ConfigContext
      if (category === 'general') {
        await updateConfig(settings);
      }

      showSuccess('Éxito', `Configuración de ${category} guardada correctamente`);
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Error', 'Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = (category) => {
    if (!hasRole('administrador')) {
      showError('Error', 'Solo los administradores pueden restaurar configuración');
      return;
    }

    if (window.confirm('¿Estás seguro de restaurar la configuración por defecto? Se perderán los cambios actuales.')) {
      switch (category) {
        case 'general':
          setGeneralSettings({
            companyName: '',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            currency: 'MXN',
            taxRate: '16',
            timezone: 'America/Mexico_City',
            dateFormat: 'dd/mm/yyyy',
            language: 'es'
          });
          break;
        case 'inventory':
          setInventorySettings({
            autoGenerateCodes: true,
            codePrefix: 'INS',
            lowStockWarning: true,
            expiryWarningDays: '30',
            autoDeductStock: true,
            allowNegativeStock: false,
            defaultLocation: 'Almacén Principal',
            requireLotNumbers: false
          });
          break;
        case 'equipment':
          setEquipmentSettings({
            autoGenerateCodes: true,
            codePrefix: 'EQP',
            maintenanceWarning: true,
            maintenanceAdvanceDays: '7',
            requireCalibration: false,
            calibrationFrequency: '365',
            maintenanceFrequency: '30',
            equipmentResponsible: ''
          });
          break;
        case 'notifications':
          setNotificationSettings({
            emailNotifications: true,
            pushNotifications: true,
            stockAlerts: true,
            maintenanceAlerts: true,
            orderAlerts: true,
            systemAlerts: true,
            weeklyReports: false,
            monthlyReports: true
          });
          break;
        case 'security':
          setSecuritySettings({
            sessionTimeout: '60',
            maxLoginAttempts: '3',
            passwordMinLength: '6',
            requireUppercase: false,
            requireNumbers: true,
            requireSymbols: false,
            twoFactorAuth: false,
            auditLog: true
          });
          break;
        case 'backup':
          setBackupSettings({
            autoBackup: true,
            backupFrequency: 'daily',
            backupTime: '02:00',
            retentionDays: '30',
            emailBackupReports: true,
            lastBackup: null
          });
          break;
      }
      showSuccess('Éxito', 'Configuración restaurada a valores por defecto');
    }
  };

  const performBackup = async () => {
    if (!hasRole('administrador')) {
      showError('Error', 'Solo los administradores pueden realizar respaldos');
      return;
    }

    try {
      setLoading(true);
      showWarning('Respaldo', 'Iniciando respaldo de datos...');
      
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const backupData = {
        timestamp: new Date().toISOString(),
        status: 'completed',
        size: '2.5 MB',
        tables: ['insumos', 'equipos', 'movimientos', 'pedidos', 'usuarios']
      };

      // Update last backup time
      setBackupSettings(prev => ({
        ...prev,
        lastBackup: new Date()
      }));

      showSuccess('Éxito', 'Respaldo completado correctamente');
    } catch (error) {
      console.error('Error during backup:', error);
      showError('Error', 'Error durante el respaldo');
    } finally {
      setLoading(false);
    }
  };

  const exportSettings = () => {
    const allSettings = {
      general: generalSettings,
      inventory: inventorySettings,
      equipment: equipmentSettings,
      notifications: notificationSettings,
      security: securitySettings,
      backup: backupSettings,
      exportDate: new Date().toISOString(),
      exportedBy: userData?.nombre
    };

    const dataStr = JSON.stringify(allSettings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `labflow_settings_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showSuccess('Éxito', 'Configuración exportada correctamente');
  };

  // CSV Import/Export Functions
  const exportToCSV = async (collection) => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll(collection);

      if (!result.success || !result.data || result.data.length === 0) {
        showError('Error', `No hay datos para exportar de ${collection}`);
        return;
      }

      const data = result.data;

      // Generate CSV headers from first object keys
      const headers = Object.keys(data[0]).filter(key => key !== 'id');

      // Convert data to CSV format
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            let value = row[header];
            // Handle dates
            if (value && typeof value === 'object' && value.seconds) {
              value = new Date(value.seconds * 1000).toISOString().split('T')[0];
            }
            // Handle arrays and objects
            if (typeof value === 'object' && value !== null) {
              value = JSON.stringify(value);
            }
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${collection}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showSuccess('Éxito', `Datos de ${collection} exportados correctamente`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError('Error', 'Error al exportar los datos');
    } finally {
      setLoading(false);
    }
  };

  const importFromCSV = async (collection, file) => {
    try {
      setLoading(true);

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        showError('Error', 'El archivo CSV debe tener al menos una cabecera y una fila de datos');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj = {};

          headers.forEach((header, index) => {
            let value = values[index] || '';

            // Try to parse JSON for objects/arrays
            if (value.startsWith('{') || value.startsWith('[')) {
              try {
                value = JSON.parse(value);
              } catch (e) {
                // Keep as string if JSON parsing fails
              }
            }

            // Convert numbers
            if (!isNaN(value) && value !== '') {
              value = Number(value);
            }

            obj[header] = value;
          });

          // Add metadata
          obj.created_at = new Date();
          obj.updated_at = new Date();
          obj.imported_by = userData?.nombre || 'Sistema';

          const result = await firebaseService.create(collection, obj);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error importing row:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showSuccess('Éxito', `Importados ${successCount} registros correctamente`);
      }
      if (errorCount > 0) {
        showError('Advertencia', `${errorCount} registros no pudieron ser importados`);
      }

    } catch (error) {
      console.error('Error importing CSV:', error);
      showError('Error', 'Error al importar el archivo CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (collection, event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      if (window.confirm(`¿Estás seguro de importar datos a ${collection}? Esto agregará nuevos registros.`)) {
        importFromCSV(collection, file);
      }
    } else {
      showError('Error', 'Por favor selecciona un archivo CSV válido');
    }
    // Reset input
    event.target.value = '';
  };

  if (!hasRole('administrador')) {
    return (
      <div className="ajustes-page">
        <div className="page-header">
          <div className="page-title">
            <i className="mdi mdi-cog"></i>
            <h1>Configuración del Sistema</h1>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <i className="mdi mdi-lock" style={{ fontSize: '4rem', color: 'var(--warning-color)', marginBottom: '1rem' }}></i>
          <h3>Acceso Restringido</h3>
          <p>Solo los administradores pueden acceder a la configuración del sistema.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: 'mdi-cog' },
    { id: 'inventory', label: 'Inventario', icon: 'mdi-flask' },
    { id: 'equipment', label: 'Equipos', icon: 'mdi-wrench' },
    { id: 'notifications', label: 'Notificaciones', icon: 'mdi-bell' },
    { id: 'security', label: 'Seguridad', icon: 'mdi-lock' },
    { id: 'backup', label: 'Respaldos', icon: 'mdi-database' },
    { id: 'csv', label: 'Import/Export CSV', icon: 'mdi-file-table' }
  ];

  return (
    <div className="ajustes-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-cog"></i>
          <h1>Configuración del Sistema</h1>
        </div>
        <div className="header-actions">
          <Button onClick={exportSettings} className="btn-secondary" icon="mdi-export">
            Exportar Configuración
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs" style={{ marginBottom: '2rem' }}>
        <div className="tab-buttons" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content" style={{
        padding: '2rem',
        background: 'var(--background-primary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)'
      }}>
        {activeTab === 'general' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Configuración General</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={() => resetToDefaults('general')} className="btn-secondary btn-small">
                  Restaurar
                </Button>
                <Button onClick={() => saveSettings('general', generalSettings)} className="btn-primary" loading={loading}>
                  Guardar
                </Button>
              </div>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre de la Empresa</label>
                <input
                  type="text"
                  value={generalSettings.companyName}
                  onChange={(e) => setGeneralSettings({...generalSettings, companyName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Tipo de Organización</label>
                <select
                  value={generalSettings.logoType}
                  onChange={(e) => {
                    const type = e.target.value;
                    let icon = 'mdi-beaker-outline';
                    switch(type) {
                      case 'hospital':
                        icon = 'mdi-hospital-building';
                        break;
                      case 'clinica':
                        icon = 'mdi-medical-bag';
                        break;
                      case 'laboratorio':
                        icon = 'mdi-beaker-outline';
                        break;
                      case 'farmacia':
                        icon = 'mdi-pill';
                        break;
                      case 'veterinaria':
                        icon = 'mdi-paw';
                        break;
                      case 'dentista':
                        icon = 'mdi-tooth-outline';
                        break;
                      case 'investigacion':
                        icon = 'mdi-microscope';
                        break;
                      default:
                        icon = 'mdi-beaker-outline';
                    }
                    setGeneralSettings({
                      ...generalSettings,
                      logoType: type,
                      logoIcon: icon
                    });
                  }}
                >
                  <option value="laboratorio">Laboratorio</option>
                  <option value="hospital">Hospital</option>
                  <option value="clinica">Clínica</option>
                  <option value="farmacia">Farmacia</option>
                  <option value="veterinaria">Veterinaria</option>
                  <option value="dentista">Consultorio Dental</option>
                  <option value="investigacion">Centro de Investigación</option>
                </select>
              </div>

              <div className="form-group">
                <label>Vista Previa del Logo</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--background-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)'
                }}>
                  <i
                    className={`mdi ${generalSettings.logoIcon}`}
                    style={{
                      fontSize: '2rem',
                      color: 'var(--primary-color)',
                      filter: 'brightness(0.8)'
                    }}
                  ></i>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {generalSettings.companyName || 'LabFlow'}
                    </div>
                    {generalSettings.companyName && generalSettings.companyName !== 'LabFlow' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        by LabFlow
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Moneda</label>
                <select
                  value={generalSettings.currency}
                  onChange={(e) => setGeneralSettings({...generalSettings, currency: e.target.value})}
                >
                  <option value="MXN">Peso Mexicano (MXN)</option>
                  <option value="USD">Dólar Estadounidense (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Tasa de Impuesto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={generalSettings.taxRate}
                  onChange={(e) => setGeneralSettings({...generalSettings, taxRate: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Zona Horaria</label>
                <select
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                >
                  <option value="America/Mexico_City">México</option>
                  <option value="America/New_York">Estados Unidos (Este)</option>
                  <option value="America/Los_Angeles">Estados Unidos (Oeste)</option>
                </select>
              </div>
              
              <div className="form-group full-width">
                <label>Dirección de la Empresa</label>
                <textarea
                  value={generalSettings.companyAddress}
                  onChange={(e) => setGeneralSettings({...generalSettings, companyAddress: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={generalSettings.companyPhone}
                  onChange={(e) => setGeneralSettings({...generalSettings, companyPhone: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={generalSettings.companyEmail}
                  onChange={(e) => setGeneralSettings({...generalSettings, companyEmail: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Configuración de Inventario</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={() => resetToDefaults('inventory')} className="btn-secondary btn-small">
                  Restaurar
                </Button>
                <Button onClick={() => saveSettings('inventory', inventorySettings)} className="btn-primary" loading={loading}>
                  Guardar
                </Button>
              </div>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={inventorySettings.autoGenerateCodes}
                    onChange={(e) => setInventorySettings({...inventorySettings, autoGenerateCodes: e.target.checked})}
                  />
                  Generar códigos automáticamente
                </label>
              </div>
              
              <div className="form-group">
                <label>Prefijo para códigos</label>
                <input
                  type="text"
                  value={inventorySettings.codePrefix}
                  onChange={(e) => setInventorySettings({...inventorySettings, codePrefix: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Días de alerta antes de vencimiento</label>
                <input
                  type="number"
                  value={inventorySettings.expiryWarningDays}
                  onChange={(e) => setInventorySettings({...inventorySettings, expiryWarningDays: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Ubicación por defecto</label>
                <input
                  type="text"
                  value={inventorySettings.defaultLocation}
                  onChange={(e) => setInventorySettings({...inventorySettings, defaultLocation: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={inventorySettings.lowStockWarning}
                    onChange={(e) => setInventorySettings({...inventorySettings, lowStockWarning: e.target.checked})}
                  />
                  Alertas de stock bajo
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={inventorySettings.autoDeductStock}
                    onChange={(e) => setInventorySettings({...inventorySettings, autoDeductStock: e.target.checked})}
                  />
                  Descontar stock automáticamente
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={inventorySettings.allowNegativeStock}
                    onChange={(e) => setInventorySettings({...inventorySettings, allowNegativeStock: e.target.checked})}
                  />
                  Permitir stock negativo
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={inventorySettings.requireLotNumbers}
                    onChange={(e) => setInventorySettings({...inventorySettings, requireLotNumbers: e.target.checked})}
                  />
                  Requerir números de lote
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Configuración de Equipos</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={() => resetToDefaults('equipment')} className="btn-secondary btn-small">
                  Restaurar
                </Button>
                <Button onClick={() => saveSettings('equipment', equipmentSettings)} className="btn-primary" loading={loading}>
                  Guardar
                </Button>
              </div>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={equipmentSettings.autoGenerateCodes}
                    onChange={(e) => setEquipmentSettings({...equipmentSettings, autoGenerateCodes: e.target.checked})}
                  />
                  Generar códigos automáticamente
                </label>
              </div>
              
              <div className="form-group">
                <label>Prefijo para códigos</label>
                <input
                  type="text"
                  value={equipmentSettings.codePrefix}
                  onChange={(e) => setEquipmentSettings({...equipmentSettings, codePrefix: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Días de aviso antes del mantenimiento</label>
                <input
                  type="number"
                  value={equipmentSettings.maintenanceAdvanceDays}
                  onChange={(e) => setEquipmentSettings({...equipmentSettings, maintenanceAdvanceDays: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Frecuencia de mantenimiento (d��as)</label>
                <input
                  type="number"
                  value={equipmentSettings.maintenanceFrequency}
                  onChange={(e) => setEquipmentSettings({...equipmentSettings, maintenanceFrequency: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Frecuencia de calibración (días)</label>
                <input
                  type="number"
                  value={equipmentSettings.calibrationFrequency}
                  onChange={(e) => setEquipmentSettings({...equipmentSettings, calibrationFrequency: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Responsable por defecto</label>
                <input
                  type="text"
                  value={equipmentSettings.equipmentResponsible}
                  onChange={(e) => setEquipmentSettings({...equipmentSettings, equipmentResponsible: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={equipmentSettings.maintenanceWarning}
                    onChange={(e) => setEquipmentSettings({...equipmentSettings, maintenanceWarning: e.target.checked})}
                  />
                  Alertas de mantenimiento
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={equipmentSettings.requireCalibration}
                    onChange={(e) => setEquipmentSettings({...equipmentSettings, requireCalibration: e.target.checked})}
                  />
                  Requerir calibración
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Configuración de Notificaciones</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={() => resetToDefaults('notifications')} className="btn-secondary btn-small">
                  Restaurar
                </Button>
                <Button onClick={() => saveSettings('notifications', notificationSettings)} className="btn-primary" loading={loading}>
                  Guardar
                </Button>
              </div>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) => setNotificationSettings({...notificationSettings, emailNotifications: e.target.checked})}
                  />
                  Notificaciones por email
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={(e) => setNotificationSettings({...notificationSettings, pushNotifications: e.target.checked})}
                  />
                  Notificaciones push
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.stockAlerts}
                    onChange={(e) => setNotificationSettings({...notificationSettings, stockAlerts: e.target.checked})}
                  />
                  Alertas de stock
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.maintenanceAlerts}
                    onChange={(e) => setNotificationSettings({...notificationSettings, maintenanceAlerts: e.target.checked})}
                  />
                  Alertas de mantenimiento
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.orderAlerts}
                    onChange={(e) => setNotificationSettings({...notificationSettings, orderAlerts: e.target.checked})}
                  />
                  Alertas de pedidos
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.systemAlerts}
                    onChange={(e) => setNotificationSettings({...notificationSettings, systemAlerts: e.target.checked})}
                  />
                  Alertas del sistema
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklyReports}
                    onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReports: e.target.checked})}
                  />
                  Reportes semanales
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={notificationSettings.monthlyReports}
                    onChange={(e) => setNotificationSettings({...notificationSettings, monthlyReports: e.target.checked})}
                  />
                  Reportes mensuales
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Configuración de Seguridad</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={() => resetToDefaults('security')} className="btn-secondary btn-small">
                  Restaurar
                </Button>
                <Button onClick={() => saveSettings('security', securitySettings)} className="btn-primary" loading={loading}>
                  Guardar
                </Button>
              </div>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Tiempo límite de sesión (minutos)</label>
                <input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Máximo intentos de login</label>
                <input
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Longitud mínima de contraseña</label>
                <input
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={securitySettings.requireUppercase}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireUppercase: e.target.checked})}
                  />
                  Requerir mayúsculas
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={securitySettings.requireNumbers}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireNumbers: e.target.checked})}
                  />
                  Requerir números
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={securitySettings.requireSymbols}
                    onChange={(e) => setSecuritySettings({...securitySettings, requireSymbols: e.target.checked})}
                  />
                  Requerir símbolos
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorAuth}
                    onChange={(e) => setSecuritySettings({...securitySettings, twoFactorAuth: e.target.checked})}
                  />
                  Autenticación de dos factores
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={securitySettings.auditLog}
                    onChange={(e) => setSecuritySettings({...securitySettings, auditLog: e.target.checked})}
                  />
                  Registro de auditoría
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Configuración de Respaldos</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={performBackup} className="btn-warning" loading={loading} icon="mdi-backup-restore">
                  Respaldar Ahora
                </Button>
                <Button onClick={() => resetToDefaults('backup')} className="btn-secondary btn-small">
                  Restaurar
                </Button>
                <Button onClick={() => saveSettings('backup', backupSettings)} className="btn-primary" loading={loading}>
                  Guardar
                </Button>
              </div>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={backupSettings.autoBackup}
                    onChange={(e) => setBackupSettings({...backupSettings, autoBackup: e.target.checked})}
                  />
                  Respaldo automático
                </label>
              </div>
              
              <div className="form-group">
                <label>Frecuencia de respaldo</label>
                <select
                  value={backupSettings.backupFrequency}
                  onChange={(e) => setBackupSettings({...backupSettings, backupFrequency: e.target.value})}
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Hora de respaldo</label>
                <input
                  type="time"
                  value={backupSettings.backupTime}
                  onChange={(e) => setBackupSettings({...backupSettings, backupTime: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Días de retención</label>
                <input
                  type="number"
                  value={backupSettings.retentionDays}
                  onChange={(e) => setBackupSettings({...backupSettings, retentionDays: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={backupSettings.emailBackupReports}
                    onChange={(e) => setBackupSettings({...backupSettings, emailBackupReports: e.target.checked})}
                  />
                  Reportes por email
                </label>
              </div>
              
              {backupSettings.lastBackup && (
                <div className="form-group">
                  <label>Último respaldo</label>
                  <input
                    type="text"
                    value={new Date(backupSettings.lastBackup).toLocaleString()}
                    readOnly
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'csv' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Importar y Exportar Datos CSV</h3>
            </div>

            <div className="csv-section">
              <div className="csv-info">
                <p><strong>Nota:</strong> Esta herramienta permite importar y exportar datos en formato CSV para respaldo o migración.</p>
                <ul>
                  <li>Al exportar se descargarán todos los datos de la sección seleccionada</li>
                  <li>Al importar se agregarán nuevos registros (no reemplaza los existentes)</li>
                  <li>El archivo CSV debe tener la estructura correcta según la sección</li>
                  <li>Solo archivos .csv son soportados</li>
                </ul>
              </div>

              <div className="csv-actions">
                {/* Productos */}
                <div className="csv-action-group">
                  <h4><i className="mdi mdi-package-variant"></i> Productos</h4>
                  <div className="csv-example">
                    <p><strong>Formato esperado del CSV:</strong></p>
                    <code className="csv-example-code">
                      nombre,codigo,categoria,precio,stock,descripcion<br/>
                      "Reactivo Químico A","PRD001","Reactivos",150.50,100,"Descripción del producto"
                    </code>
                  </div>
                  <div className="csv-buttons">
                    <Button
                      onClick={() => exportToCSV('productos')}
                      className="btn-primary"
                      icon="mdi-download"
                      loading={loading}
                    >
                      Exportar Productos
                    </Button>
                    <div className="csv-import">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload('productos', e)}
                        style={{ display: 'none' }}
                        id="productos-import"
                      />
                      <Button
                        onClick={() => document.getElementById('productos-import').click()}
                        className="btn-secondary"
                        icon="mdi-upload"
                      >
                        Importar Productos
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Insumos */}
                <div className="csv-action-group">
                  <h4><i className="mdi mdi-flask"></i> Insumos</h4>
                  <div className="csv-example">
                    <p><strong>Formato esperado del CSV:</strong></p>
                    <code className="csv-example-code">
                      nombre,codigo,categoria,unidad_medida,existencia_total,stock_minimo,precio_venta,ubicacion_almacen,proveedor,estado<br/>
                      "Ácido Clorhídrico 37%","HCL001","acidos","ml",2500,500,25.00,"A-1-B","Química Industrial SA","activo"
                    </code>
                  </div>
                  <div className="csv-buttons">
                    <Button
                      onClick={() => exportToCSV('insumos')}
                      className="btn-primary"
                      icon="mdi-download"
                      loading={loading}
                    >
                      Exportar Insumos
                    </Button>
                    <div className="csv-import">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload('insumos', e)}
                        style={{ display: 'none' }}
                        id="insumos-import"
                      />
                      <Button
                        onClick={() => document.getElementById('insumos-import').click()}
                        className="btn-secondary"
                        icon="mdi-upload"
                      >
                        Importar Insumos
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Equipos */}
                <div className="csv-action-group">
                  <h4><i className="mdi mdi-wrench"></i> Equipos</h4>
                  <div className="csv-example">
                    <p><strong>Formato esperado del CSV:</strong></p>
                    <code className="csv-example-code">
                      nombre,codigo,tipo,marca,modelo,numero_serie,ubicacion,estado,fecha_adquisicion,valor<br/>
                      "Microscopio Digital","EQP001","microscopio","Olympus","CX23","MS123456","Lab A","activo","2024-01-15",15000.00
                    </code>
                  </div>
                  <div className="csv-buttons">
                    <Button
                      onClick={() => exportToCSV('equipos')}
                      className="btn-primary"
                      icon="mdi-download"
                      loading={loading}
                    >
                      Exportar Equipos
                    </Button>
                    <div className="csv-import">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload('equipos', e)}
                        style={{ display: 'none' }}
                        id="equipos-import"
                      />
                      <Button
                        onClick={() => document.getElementById('equipos-import').click()}
                        className="btn-secondary"
                        icon="mdi-upload"
                      >
                        Importar Equipos
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Pedidos */}
                <div className="csv-action-group">
                  <h4><i className="mdi mdi-cart"></i> Pedidos</h4>
                  <div className="csv-example">
                    <p><strong>Formato esperado del CSV:</strong></p>
                    <code className="csv-example-code">
                      numero_pedido,fecha_pedido,proveedor,estado,total,fecha_entrega_esperada,observaciones<br/>
                      "PED001","2024-01-15","Proveedor ABC","pendiente",1250.75,"2024-01-25","Pedido urgente"
                    </code>
                  </div>
                  <div className="csv-buttons">
                    <Button
                      onClick={() => exportToCSV('pedidos')}
                      className="btn-primary"
                      icon="mdi-download"
                      loading={loading}
                    >
                      Exportar Pedidos
                    </Button>
                    <div className="csv-import">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload('pedidos', e)}
                        style={{ display: 'none' }}
                        id="pedidos-import"
                      />
                      <Button
                        onClick={() => document.getElementById('pedidos-import').click()}
                        className="btn-secondary"
                        icon="mdi-upload"
                      >
                        Importar Pedidos
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Usuarios */}
                <div className="csv-action-group">
                  <h4><i className="mdi mdi-account-group"></i> Usuarios</h4>
                  <div className="csv-example">
                    <p><strong>Formato esperado del CSV:</strong></p>
                    <code className="csv-example-code">
                      nombre,email,rol,telefono,departamento,estado,fecha_ingreso<br/>
                      "Juan Pérez","juan.perez@lab.com","tecnico","555-0123","Laboratorio","activo","2024-01-15"
                    </code>
                  </div>
                  <div className="csv-buttons">
                    <Button
                      onClick={() => exportToCSV('usuarios')}
                      className="btn-primary"
                      icon="mdi-download"
                      loading={loading}
                    >
                      Exportar Usuarios
                    </Button>
                    <div className="csv-import">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload('usuarios', e)}
                        style={{ display: 'none' }}
                        id="usuarios-import"
                      />
                      <Button
                        onClick={() => document.getElementById('usuarios-import').click()}
                        className="btn-secondary"
                        icon="mdi-upload"
                      >
                        Importar Usuarios
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ajustes;
