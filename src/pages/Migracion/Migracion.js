import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import migrationService from '../../services/MigrationService';
import './Migracion.css';

const Migracion = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [activeTab, setActiveTab] = useState('export');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [targetConfig, setTargetConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [targetConnected, setTargetConnected] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [migrationOptions, setMigrationOptions] = useState({
    overwrite: false,
    deleteSource: false,
    batchSize: 100
  });
  const [importFile, setImportFile] = useState(null);
  const [migrationProgress, setMigrationProgress] = useState(null);

  const collections = [
    'usuarios',
    'insumos', 
    'lotes',
    'productos',
    'equipos',
    'pedidos',
    'pedidos_finalizados',
    'ventas',
    'movimientos',
    'envios',
    'ajustes',
    'configuracion'
  ];

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);
      const result = await migrationService.getDatabaseStats();
      if (result.success) {
        setStats(result.stats);
      } else {
        showError('Error', 'No se pudieron cargar las estadísticas de la base de datos');
      }
    } catch (error) {
      showError('Error', `Error cargando estadísticas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      setMigrationProgress({ stage: 'Exportando datos...', progress: 0 });
      
      const result = await migrationService.exportAllData();
      
      if (result.success) {
        showSuccess(
          'Exportación Exitosa', 
          `${result.totalDocuments} documentos exportados en ${result.collections} colecciones`
        );
      } else {
        showError('Error', `Error en exportación: ${result.error}`);
      }
    } catch (error) {
      showError('Error', `Error exportando datos: ${error.message}`);
    } finally {
      setLoading(false);
      setMigrationProgress(null);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      showWarning('Archivo Requerido', 'Por favor selecciona un archivo para importar');
      return;
    }

    try {
      setLoading(true);
      setMigrationProgress({ stage: 'Importando datos...', progress: 0 });
      
      const result = await migrationService.importData(importFile, {
        overwrite: migrationOptions.overwrite,
        selectedCollections: selectedCollections.length > 0 ? selectedCollections : null
      });
      
      if (result.success) {
        showSuccess(
          'Importación Exitosa', 
          `${result.totalImported} documentos importados, ${result.totalErrors} errores`
        );
        loadDatabaseStats(); // Actualizar estadísticas
      } else {
        showError('Error', `Error en importación: ${result.error}`);
      }
    } catch (error) {
      showError('Error', `Error importando datos: ${error.message}`);
    } finally {
      setLoading(false);
      setMigrationProgress(null);
    }
  };

  const handleConnectTarget = async () => {
    try {
      setLoading(true);
      const result = await migrationService.initializeTargetDatabase(targetConfig);
      
      if (result.success) {
        setTargetConnected(true);
        showSuccess('Conexión Exitosa', 'Conectado a la base de datos objetivo');
        
        // Probar conexión
        const testResult = await migrationService.testTargetConnection();
        if (!testResult.success) {
          showWarning('Advertencia', `Conexión establecida pero hay problemas: ${testResult.error}`);
        }
      } else {
        showError('Error', `Error conectando: ${result.error}`);
      }
    } catch (error) {
      showError('Error', `Error en conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateToTarget = async () => {
    if (!targetConnected) {
      showWarning('Conexión Requerida', 'Primero conecta a la base de datos objetivo');
      return;
    }

    const confirmMessage = migrationOptions.deleteSource 
      ? '⚠️ ADVERTENCIA: Esto eliminará los datos de la base actual después de migrarlos. ¿Continuar?'
      : '¿Migrar datos a la base de datos objetivo?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      setMigrationProgress({ stage: 'Migrando datos...', progress: 0 });
      
      const result = await migrationService.migrateToTarget({
        deleteSource: migrationOptions.deleteSource,
        selectedCollections: selectedCollections.length > 0 ? selectedCollections : null,
        batchSize: migrationOptions.batchSize
      });
      
      if (result.success) {
        showSuccess(
          'Migración Exitosa', 
          `${result.totalMigrated} documentos migrados, ${result.totalErrors} errores`
        );
        if (migrationOptions.deleteSource) {
          loadDatabaseStats(); // Actualizar estadísticas si se eliminaron datos
        }
      } else {
        showError('Error', `Error en migración: ${result.error}`);
      }
    } catch (error) {
      showError('Error', `Error migrando datos: ${error.message}`);
    } finally {
      setLoading(false);
      setMigrationProgress(null);
    }
  };

  const toggleCollection = (collection) => {
    setSelectedCollections(prev => 
      prev.includes(collection)
        ? prev.filter(c => c !== collection)
        : [...prev, collection]
    );
  };

  const toggleAllCollections = () => {
    setSelectedCollections(
      selectedCollections.length === collections.length ? [] : [...collections]
    );
  };

  return (
    <div className="migracion-page">
      <ConnectionStatus />
      
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-database-sync"></i>
          <h1>Migración de Base de Datos</h1>
        </div>
        <div className="header-actions">
          <Button
            variant="secondary"
            icon="mdi-refresh"
            onClick={loadDatabaseStats}
            loading={loading}
          >
            Actualizar Stats
          </Button>
        </div>
      </div>

      {/* Estadísticas de la Base de Datos */}
      <div className="stats-section">
        <div className="stats-header">
          <h3>📊 Estadísticas de la Base de Datos Actual</h3>
          {stats && <span className="stats-timestamp">Actualizado: {new Date(stats.timestamp).toLocaleString()}</span>}
        </div>
        {stats && (
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-number">{stats.totalDocuments}</div>
              <div className="stat-label">Total Documentos</div>
            </div>
            {Object.entries(stats.collections).map(([collection, count]) => (
              <div key={collection} className="stat-card">
                <div className="stat-number">{count}</div>
                <div className="stat-label">{collection}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {migrationProgress && (
        <div className="progress-section">
          <div className="progress-info">
            <i className="mdi mdi-loading mdi-spin"></i>
            <span>{migrationProgress.stage}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${migrationProgress.progress}%` }}></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-header">
          <button 
            className={`tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <i className="mdi mdi-export"></i>
            Exportar
          </button>
          <button 
            className={`tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <i className="mdi mdi-import"></i>
            Importar
          </button>
          <button 
            className={`tab ${activeTab === 'migrate' ? 'active' : ''}`}
            onClick={() => setActiveTab('migrate')}
          >
            <i className="mdi mdi-database-sync"></i>
            Migrar
          </button>
        </div>

        <div className="tab-content">
          {/* EXPORTAR */}
          {activeTab === 'export' && (
            <div className="export-section">
              <div className="section-header">
                <h3>📦 Exportar Datos</h3>
                <p>Descarga todas las colecciones en un archivo JSON para respaldo o migración</p>
              </div>
              
              <div className="export-actions">
                <Button
                  variant="primary"
                  icon="mdi-download"
                  onClick={handleExportData}
                  loading={loading}
                  size="large"
                >
                  Exportar Todas las Colecciones
                </Button>
              </div>
              
              <div className="export-info">
                <div className="info-card">
                  <i className="mdi mdi-information"></i>
                  <div>
                    <h4>Información de Exportación</h4>
                    <ul>
                      <li>Se exportarán todas las colecciones disponibles</li>
                      <li>Los datos se guardarán en formato JSON</li>
                      <li>Los timestamps se convertirán a formato ISO</li>
                      <li>El archivo se descargará automáticamente</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IMPORTAR */}
          {activeTab === 'import' && (
            <div className="import-section">
              <div className="section-header">
                <h3>📥 Importar Datos</h3>
                <p>Importa datos desde un archivo JSON exportado previamente</p>
              </div>

              <div className="import-form">
                <div className="form-group">
                  <label>Archivo de Importación</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    className="file-input"
                  />
                  {importFile && (
                    <div className="file-info">
                      <i className="mdi mdi-file-check"></i>
                      <span>{importFile.name} ({Math.round(importFile.size / 1024)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="collections-selector">
                  <div className="selector-header">
                    <label>Colecciones a Importar</label>
                    <Button
                      variant="text"
                      size="small"
                      onClick={toggleAllCollections}
                    >
                      {selectedCollections.length === collections.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                    </Button>
                  </div>
                  <div className="collections-grid">
                    {collections.map(collection => (
                      <label key={collection} className="collection-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCollections.includes(collection)}
                          onChange={() => toggleCollection(collection)}
                        />
                        <span>{collection}</span>
                        {stats && <span className="collection-count">({stats.collections[collection] || 0})</span>}
                      </label>
                    ))}
                  </div>
                  {selectedCollections.length === 0 && (
                    <div className="selection-note">
                      <i className="mdi mdi-information"></i>
                      <span>Si no seleccionas colecciones, se importarán todas las disponibles en el archivo</span>
                    </div>
                  )}
                </div>

                <div className="import-options">
                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={migrationOptions.overwrite}
                      onChange={(e) => setMigrationOptions(prev => ({
                        ...prev,
                        overwrite: e.target.checked
                      }))}
                    />
                    <span>Sobrescribir datos existentes</span>
                  </label>
                </div>

                <div className="import-actions">
                  <Button
                    variant="primary"
                    icon="mdi-upload"
                    onClick={handleImportData}
                    loading={loading}
                    disabled={!importFile}
                  >
                    Importar Datos
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* MIGRAR */}
          {activeTab === 'migrate' && (
            <div className="migrate-section">
              <div className="section-header">
                <h3>🚀 Migrar a Otra Base de Datos</h3>
                <p>Migra datos directamente a otra instancia de Firebase</p>
              </div>

              {!targetConnected ? (
                <div className="target-config">
                  <h4>Configuración de Base de Datos Objetivo</h4>
                  <div className="config-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>API Key</label>
                        <input
                          type="text"
                          value={targetConfig.apiKey}
                          onChange={(e) => setTargetConfig(prev => ({
                            ...prev,
                            apiKey: e.target.value
                          }))}
                          placeholder="AIzaSy..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Auth Domain</label>
                        <input
                          type="text"
                          value={targetConfig.authDomain}
                          onChange={(e) => setTargetConfig(prev => ({
                            ...prev,
                            authDomain: e.target.value
                          }))}
                          placeholder="project.firebaseapp.com"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Project ID</label>
                        <input
                          type="text"
                          value={targetConfig.projectId}
                          onChange={(e) => setTargetConfig(prev => ({
                            ...prev,
                            projectId: e.target.value
                          }))}
                          placeholder="project-id"
                        />
                      </div>
                      <div className="form-group">
                        <label>Storage Bucket</label>
                        <input
                          type="text"
                          value={targetConfig.storageBucket}
                          onChange={(e) => setTargetConfig(prev => ({
                            ...prev,
                            storageBucket: e.target.value
                          }))}
                          placeholder="project.appspot.com"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Messaging Sender ID</label>
                        <input
                          type="text"
                          value={targetConfig.messagingSenderId}
                          onChange={(e) => setTargetConfig(prev => ({
                            ...prev,
                            messagingSenderId: e.target.value
                          }))}
                          placeholder="123456789"
                        />
                      </div>
                      <div className="form-group">
                        <label>App ID</label>
                        <input
                          type="text"
                          value={targetConfig.appId}
                          onChange={(e) => setTargetConfig(prev => ({
                            ...prev,
                            appId: e.target.value
                          }))}
                          placeholder="1:123:web:abc123"
                        />
                      </div>
                    </div>
                    <div className="config-actions">
                      <Button
                        variant="primary"
                        icon="mdi-connection"
                        onClick={handleConnectTarget}
                        loading={loading}
                      >
                        Conectar a Base de Datos Objetivo
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="migration-controls">
                  <div className="connection-status-success">
                    <i className="mdi mdi-check-circle"></i>
                    <span>Conectado a la base de datos objetivo</span>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setTargetConnected(false)}
                    >
                      Cambiar
                    </Button>
                  </div>

                  <div className="collections-selector">
                    <div className="selector-header">
                      <label>Colecciones a Migrar</label>
                      <Button
                        variant="text"
                        size="small"
                        onClick={toggleAllCollections}
                      >
                        {selectedCollections.length === collections.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                      </Button>
                    </div>
                    <div className="collections-grid">
                      {collections.map(collection => (
                        <label key={collection} className="collection-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedCollections.includes(collection)}
                            onChange={() => toggleCollection(collection)}
                          />
                          <span>{collection}</span>
                          {stats && <span className="collection-count">({stats.collections[collection] || 0})</span>}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="migration-options">
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={migrationOptions.deleteSource}
                        onChange={(e) => setMigrationOptions(prev => ({
                          ...prev,
                          deleteSource: e.target.checked
                        }))}
                      />
                      <span className="danger-option">Eliminar datos de origen después de migrar</span>
                    </label>
                    
                    <div className="form-group">
                      <label>Tamaño de Batch</label>
                      <input
                        type="number"
                        min="50"
                        max="500"
                        value={migrationOptions.batchSize}
                        onChange={(e) => setMigrationOptions(prev => ({
                          ...prev,
                          batchSize: parseInt(e.target.value) || 100
                        }))}
                      />
                    </div>
                  </div>

                  <div className="migration-actions">
                    <Button
                      variant="primary"
                      icon="mdi-database-sync"
                      onClick={handleMigrateToTarget}
                      loading={loading}
                      className={migrationOptions.deleteSource ? 'danger' : ''}
                    >
                      {migrationOptions.deleteSource ? 'Migrar y Eliminar Origen' : 'Migrar Datos'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Migracion;
