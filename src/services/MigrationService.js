import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseService from './FirebaseService';

/**
 * Servicio para migración, exportación e importación de datos de Firebase
 */
class MigrationService {
  constructor() {
    this.currentDb = null;
    this.targetDb = null;
    this.collections = [
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
  }

  /**
   * Inicializar conexión a base de datos objetivo
   */
  async initializeTargetDatabase(targetConfig) {
    try {
      console.log('🔄 Inicializando conexión a base de datos objetivo...');
      
      const targetApp = initializeApp(targetConfig, 'target-db');
      this.targetDb = getFirestore(targetApp);
      this.currentDb = firebaseService.db;
      
      console.log('✅ Conexión a base de datos objetivo establecida');
      return { success: true };
    } catch (error) {
      console.error('❌ Error inicializando base de datos objetivo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exportar todas las colecciones a un archivo JSON
   */
  async exportAllData() {
    try {
      console.log('📦 Iniciando exportación de todas las colecciones...');
      
      if (!this.currentDb) {
        throw new Error('Base de datos actual no disponible');
      }

      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'LabFlow Manager',
        collections: {}
      };

      let totalDocuments = 0;

      for (const collectionName of this.collections) {
        try {
          console.log(`📄 Exportando colección: ${collectionName}...`);
          
          const collectionRef = collection(this.currentDb, collectionName);
          const q = query(collectionRef, orderBy('created_at', 'desc'));
          const querySnapshot = await getDocs(q);
          
          const documents = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Convertir timestamps a strings para JSON
            const cleanData = this.cleanDataForExport(data);
            documents.push({
              id: doc.id,
              ...cleanData
            });
          });

          exportData.collections[collectionName] = documents;
          totalDocuments += documents.length;
          
          console.log(`✅ ${collectionName}: ${documents.length} documentos exportados`);
          
        } catch (error) {
          console.warn(`⚠️ Error exportando ${collectionName}:`, error.message);
          exportData.collections[collectionName] = [];
        }
      }

      // Crear archivo descargable
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `labflow-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`🎉 Exportación completada: ${totalDocuments} documentos en ${this.collections.length} colecciones`);
      
      return { 
        success: true, 
        totalDocuments,
        collections: this.collections.length,
        data: exportData
      };

    } catch (error) {
      console.error('❌ Error en exportación:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Importar datos desde un archivo JSON
   */
  async importData(file, options = {}) {
    try {
      const {
        overwrite = false,
        selectedCollections = null,
        targetDatabase = 'current'
      } = options;

      console.log('📥 Iniciando importación de datos...');

      // Leer archivo
      const fileContent = await this.readFile(file);
      const importData = JSON.parse(fileContent);

      if (!importData.collections) {
        throw new Error('Formato de archivo inválido: no se encontraron colecciones');
      }

      const targetDb = targetDatabase === 'target' ? this.targetDb : this.currentDb;
      if (!targetDb) {
        throw new Error(`Base de datos ${targetDatabase} no disponible`);
      }

      const collectionsToImport = selectedCollections || Object.keys(importData.collections);
      let totalImported = 0;
      let totalErrors = 0;

      const results = {};

      for (const collectionName of collectionsToImport) {
        try {
          if (!importData.collections[collectionName]) {
            console.warn(`⚠️ Colección ${collectionName} no encontrada en archivo`);
            continue;
          }

          console.log(`📄 Importando ${collectionName}...`);
          
          const documents = importData.collections[collectionName];
          const result = await this.importCollection(
            targetDb, 
            collectionName, 
            documents, 
            overwrite
          );

          results[collectionName] = result;
          totalImported += result.imported;
          totalErrors += result.errors;

          console.log(`✅ ${collectionName}: ${result.imported} documentos importados, ${result.errors} errores`);

        } catch (error) {
          console.error(`❌ Error importando ${collectionName}:`, error);
          results[collectionName] = { imported: 0, errors: 1, error: error.message };
          totalErrors++;
        }
      }

      console.log(`🎉 Importación completada: ${totalImported} documentos importados, ${totalErrors} errores`);

      return {
        success: true,
        totalImported,
        totalErrors,
        results
      };

    } catch (error) {
      console.error('❌ Error en importación:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Migrar todas las colecciones a otra base de datos
   */
  async migrateToTarget(options = {}) {
    try {
      const {
        deleteSource = false,
        selectedCollections = null,
        batchSize = 100
      } = options;

      console.log('🚀 Iniciando migración a base de datos objetivo...');

      if (!this.currentDb || !this.targetDb) {
        throw new Error('Bases de datos no configuradas correctamente');
      }

      const collectionsToMigrate = selectedCollections || this.collections;
      let totalMigrated = 0;
      let totalErrors = 0;

      const results = {};

      for (const collectionName of collectionsToMigrate) {
        try {
          console.log(`🔄 Migrando ${collectionName}...`);

          const result = await this.migrateCollection(
            collectionName,
            batchSize,
            deleteSource
          );

          results[collectionName] = result;
          totalMigrated += result.migrated;
          totalErrors += result.errors;

          console.log(`✅ ${collectionName}: ${result.migrated} documentos migrados`);

        } catch (error) {
          console.error(`❌ Error migrando ${collectionName}:`, error);
          results[collectionName] = { migrated: 0, errors: 1, error: error.message };
          totalErrors++;
        }
      }

      console.log(`🎉 Migración completada: ${totalMigrated} documentos migrados, ${totalErrors} errores`);

      return {
        success: true,
        totalMigrated,
        totalErrors,
        results
      };

    } catch (error) {
      console.error('❌ Error en migración:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Importar una colección específica
   */
  async importCollection(targetDb, collectionName, documents, overwrite = false) {
    const batch = writeBatch(targetDb);
    let imported = 0;
    let errors = 0;
    let batchCount = 0;

    for (const docData of documents) {
      try {
        const { id, ...data } = docData;
        const cleanData = this.cleanDataForImport(data);
        
        const docRef = doc(targetDb, collectionName, id);
        
        if (overwrite) {
          batch.set(docRef, cleanData);
        } else {
          batch.set(docRef, cleanData, { merge: true });
        }
        
        batchCount++;
        
        // Ejecutar batch cada 500 operaciones (límite de Firestore)
        if (batchCount >= 500) {
          await batch.commit();
          imported += batchCount;
          batchCount = 0;
        }
        
      } catch (error) {
        console.error(`Error procesando documento ${docData.id}:`, error);
        errors++;
      }
    }

    // Ejecutar batch final
    if (batchCount > 0) {
      await batch.commit();
      imported += batchCount;
    }

    return { imported, errors };
  }

  /**
   * Migrar una colección específica
   */
  async migrateCollection(collectionName, batchSize = 100, deleteSource = false) {
    const sourceRef = collection(this.currentDb, collectionName);
    const querySnapshot = await getDocs(sourceRef);
    
    const batch = writeBatch(this.targetDb);
    const deleteBatch = deleteSource ? writeBatch(this.currentDb) : null;
    
    let migrated = 0;
    let errors = 0;
    let batchCount = 0;

    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        const cleanData = this.cleanDataForImport(data);
        
        // Crear en base objetivo
        const targetDocRef = doc(this.targetDb, collectionName, doc.id);
        batch.set(targetDocRef, cleanData);
        
        // Marcar para eliminar de origen si se solicita
        if (deleteSource && deleteBatch) {
          deleteBatch.delete(doc.ref);
        }
        
        batchCount++;
        migrated++;
        
      } catch (error) {
        console.error(`Error migrando documento ${doc.id}:`, error);
        errors++;
      }
    });

    // Ejecutar batches
    await batch.commit();
    if (deleteSource && deleteBatch) {
      await deleteBatch.commit();
    }

    return { migrated, errors };
  }

  /**
   * Limpiar datos para exportación (convertir timestamps, etc.)
   */
  cleanDataForExport(data) {
    const cleaned = { ...data };
    
    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      
      // Convertir Timestamps de Firestore a strings
      if (value && typeof value === 'object' && value.seconds) {
        cleaned[key] = new Date(value.seconds * 1000).toISOString();
      }
      
      // Convertir Dates a strings
      if (value instanceof Date) {
        cleaned[key] = value.toISOString();
      }
      
      // Limpiar objetos anidados recursivamente
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = this.cleanDataForExport(value);
      }
      
      // Limpiar arrays
      if (Array.isArray(value)) {
        cleaned[key] = value.map(item => 
          typeof item === 'object' ? this.cleanDataForExport(item) : item
        );
      }
    });
    
    return cleaned;
  }

  /**
   * Limpiar datos para importación (convertir strings a dates, etc.)
   */
  cleanDataForImport(data) {
    const cleaned = { ...data };
    
    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      
      // Convertir strings ISO a Dates para campos de fecha
      if (typeof value === 'string' && this.isDateField(key)) {
        try {
          cleaned[key] = new Date(value);
        } catch {
          // Mantener valor original si no se puede convertir
        }
      }
      
      // Limpiar objetos anidados recursivamente
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = this.cleanDataForImport(value);
      }
      
      // Limpiar arrays
      if (Array.isArray(value)) {
        cleaned[key] = value.map(item => 
          typeof item === 'object' ? this.cleanDataForImport(item) : item
        );
      }
    });
    
    return cleaned;
  }

  /**
   * Verificar si un campo es un campo de fecha
   */
  isDateField(fieldName) {
    const dateFields = [
      'created_at',
      'updated_at',
      'fecha_solicitud',
      'fecha_necesaria',
      'fecha_caducidad',
      'fecha_ingreso',
      'fecha_adquisicion',
      'ultimo_mantenimiento',
      'proximo_mantenimiento',
      'garantia_hasta'
    ];
    
    return dateFields.includes(fieldName) || fieldName.includes('fecha');
  }

  /**
   * Leer archivo como texto
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * Obtener estadísticas de la base de datos actual
   */
  async getDatabaseStats() {
    try {
      const stats = {
        collections: {},
        totalDocuments: 0,
        timestamp: new Date().toISOString()
      };

      for (const collectionName of this.collections) {
        try {
          const collectionRef = collection(this.currentDb, collectionName);
          const snapshot = await getDocs(collectionRef);
          const count = snapshot.size;
          
          stats.collections[collectionName] = count;
          stats.totalDocuments += count;
          
        } catch (error) {
          console.warn(`Error obteniendo stats de ${collectionName}:`, error);
          stats.collections[collectionName] = 0;
        }
      }

      return { success: true, stats };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar conectividad con base de datos objetivo
   */
  async testTargetConnection() {
    try {
      if (!this.targetDb) {
        throw new Error('Base de datos objetivo no configurada');
      }

      // Intentar leer una colección simple
      const testRef = collection(this.targetDb, 'usuarios');
      await getDocs(query(testRef, limit(1)));
      
      return { success: true, message: 'Conexión exitosa' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Crear instancia
const migrationService = new MigrationService();

export default migrationService;
