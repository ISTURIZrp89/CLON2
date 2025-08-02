import firebaseService from './FirebaseService';

/**
 * SyncService - Synchronization service for coordinating Insumos, Lotes, and Movimientos
 * This service ensures data consistency across all inventory-related operations
 */
class SyncService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Create a movement record when insumos are modified
   */
  async createMovementFromInsumoChange(insumoId, oldData, newData, userId, userName) {
    try {
      const movements = [];
      
      // Check for stock changes
      const oldStock = oldData?.existencia_total || 0;
      const newStock = newData?.existencia_total || 0;
      const stockDifference = newStock - oldStock;

      if (stockDifference !== 0) {
        const movement = {
          tipo_movimiento: stockDifference > 0 ? 'entrada' : 'salida',
          insumo_id: insumoId,
          cantidad: Math.abs(stockDifference),
          motivo: stockDifference > 0 ? 'ajuste_entrada_manual' : 'ajuste_salida_manual',
          observaciones: `Ajuste automático por edición de insumo. Stock anterior: ${oldStock}, nuevo: ${newStock}`,
          usuario: userName || 'Sistema',
          usuario_id: userId || 'system',
          fecha_movimiento: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          sync_type: 'insumo_edit'
        };

        const result = await firebaseService.create('movimientos', movement);
        if (result.success) {
          movements.push({ ...movement, id: result.id });
        }
      }

      // Check for other significant changes
      const changedFields = this.getChangedFields(oldData, newData);
      if (changedFields.length > 0 && !changedFields.includes('existencia_total')) {
        const movement = {
          tipo_movimiento: 'ajuste',
          insumo_id: insumoId,
          cantidad: 0,
          motivo: 'modificacion_datos',
          observaciones: `Campos modificados: ${changedFields.join(', ')}`,
          usuario: userName || 'Sistema',
          usuario_id: userId || 'system',
          fecha_movimiento: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          sync_type: 'insumo_data_change'
        };

        const result = await firebaseService.create('movimientos', movement);
        if (result.success) {
          movements.push({ ...movement, id: result.id });
        }
      }

      return { success: true, movements };
    } catch (error) {
      console.error('Error creating movement from insumo change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchronize stock levels with lotes when insumos are updated
   */
  async syncStockWithLotes(insumoId) {
    try {
      // Get all lotes for this insumo
      const lotesResult = await firebaseService.getAll('lotes');
      if (!lotesResult.success) {
        return { success: false, error: 'Could not load lotes' };
      }

      const insumoLotes = lotesResult.data.filter(lote => lote.insumo_id === insumoId);
      
      // Calculate total stock from lotes
      const totalStockFromLotes = insumoLotes.reduce((total, lote) => {
        return total + (parseInt(lote.existencia) || 0);
      }, 0);

      // Get current insumo data
      const insumoResult = await firebaseService.getById('insumos', insumoId);
      if (!insumoResult.success) {
        return { success: false, error: 'Could not load insumo' };
      }

      const currentStock = insumoResult.data.existencia_total || 0;

      // If there's a discrepancy, update the insumo
      if (currentStock !== totalStockFromLotes) {
        const updateResult = await firebaseService.update('insumos', insumoId, {
          existencia_total: totalStockFromLotes,
          updated_at: new Date(),
          last_sync: new Date()
        });

        if (updateResult.success) {
          // Create a movement to record this sync
          const movement = {
            tipo_movimiento: 'ajuste',
            insumo_id: insumoId,
            cantidad: Math.abs(totalStockFromLotes - currentStock),
            motivo: 'sincronizacion_lotes',
            observaciones: `Sincronización automática con lotes. Stock anterior: ${currentStock}, nuevo: ${totalStockFromLotes}`,
            usuario: 'Sistema',
            usuario_id: 'system',
            fecha_movimiento: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            sync_type: 'lote_sync'
          };

          await firebaseService.create('movimientos', movement);
        }

        return { 
          success: true, 
          updated: true,
          oldStock: currentStock,
          newStock: totalStockFromLotes
        };
      }

      return { success: true, updated: false, stock: currentStock };
    } catch (error) {
      console.error('Error syncing stock with lotes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle lote creation/update and sync with parent insumo
   */
  async handleLoteChange(loteData, isEdit = false, oldLoteData = null, userId, userName) {
    try {
      if (this.isProcessing) {
        return { success: true, message: 'Already processing' };
      }

      this.isProcessing = true;

      // Sync the parent insumo's stock
      const syncResult = await this.syncStockWithLotes(loteData.insumo_id);
      
      // Create movement record for lote change
      let movementType, cantidad, observaciones;
      
      if (isEdit && oldLoteData) {
        const oldQuantity = parseInt(oldLoteData.existencia) || 0;
        const newQuantity = parseInt(loteData.existencia) || 0;
        const difference = newQuantity - oldQuantity;
        
        if (difference !== 0) {
          movementType = difference > 0 ? 'entrada' : 'salida';
          cantidad = Math.abs(difference);
          observaciones = `Lote ${loteData.lote} editado. Cantidad anterior: ${oldQuantity}, nueva: ${newQuantity}`;
        }
      } else {
        // New lote creation
        movementType = 'entrada';
        cantidad = parseInt(loteData.existencia) || 0;
        observaciones = `Nuevo lote ${loteData.lote} creado con ${cantidad} unidades`;
      }

      if (movementType && cantidad > 0) {
        const movement = {
          tipo_movimiento: movementType,
          insumo_id: loteData.insumo_id,
          cantidad: cantidad,
          motivo: isEdit ? 'edicion_lote' : 'creacion_lote',
          numero_lote: loteData.lote,
          fecha_caducidad: loteData.fecha_caducidad || null,
          observaciones: observaciones,
          usuario: userName || 'Sistema',
          usuario_id: userId || 'system',
          fecha_movimiento: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          sync_type: 'lote_change'
        };

        await firebaseService.create('movimientos', movement);
      }

      this.isProcessing = false;
      return { 
        success: true, 
        syncResult,
        movementCreated: !!movementType
      };
    } catch (error) {
      this.isProcessing = false;
      console.error('Error handling lote change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle lote deletion and sync with parent insumo
   */
  async handleLoteDeletion(deletedLoteData, userId, userName) {
    try {
      // Sync the parent insumo's stock after deletion
      const syncResult = await this.syncStockWithLotes(deletedLoteData.insumo_id);
      
      // Create movement record for lote deletion
      const movement = {
        tipo_movimiento: 'salida',
        insumo_id: deletedLoteData.insumo_id,
        cantidad: parseInt(deletedLoteData.existencia) || 0,
        motivo: 'eliminacion_lote',
        numero_lote: deletedLoteData.lote,
        observaciones: `Lote ${deletedLoteData.lote} eliminado con ${deletedLoteData.existencia} unidades`,
        usuario: userName || 'Sistema',
        usuario_id: userId || 'system',
        fecha_movimiento: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        sync_type: 'lote_deletion'
      };

      await firebaseService.create('movimientos', movement);

      return { success: true, syncResult };
    } catch (error) {
      console.error('Error handling lote deletion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform a full synchronization check for all insumos and their lotes
   */
  async performFullSync(userId, userName) {
    try {
      const results = {
        processed: 0,
        updated: 0,
        errors: []
      };

      // Get all insumos
      const insumosResult = await firebaseService.getAll('insumos');
      if (!insumosResult.success) {
        return { success: false, error: 'Could not load insumos' };
      }

      const insumos = insumosResult.data || [];

      for (const insumo of insumos) {
        try {
          const syncResult = await this.syncStockWithLotes(insumo.id);
          results.processed++;
          
          if (syncResult.updated) {
            results.updated++;
          }
        } catch (error) {
          results.errors.push(`Error syncing ${insumo.nombre}: ${error.message}`);
        }
      }

      // Create a general movement record for the full sync
      const movement = {
        tipo_movimiento: 'ajuste',
        insumo_id: null,
        cantidad: 0,
        motivo: 'sincronizacion_completa',
        observaciones: `Sincronización completa ejecutada. Procesados: ${results.processed}, Actualizados: ${results.updated}`,
        usuario: userName || 'Sistema',
        usuario_id: userId || 'system',
        fecha_movimiento: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        sync_type: 'full_sync'
      };

      await firebaseService.create('movimientos', movement);

      return { success: true, results };
    } catch (error) {
      console.error('Error performing full sync:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get fields that changed between old and new data
   */
  getChangedFields(oldData, newData) {
    const changedFields = [];
    const fieldsToCheck = [
      'nombre', 'codigo', 'categoria', 'unidad_medida', 
      'stock_minimo', 'stock_maximo', 'precio_venta', 
      'ubicacion_almacen', 'proveedor', 'estado'
    ];

    fieldsToCheck.forEach(field => {
      if (oldData?.[field] !== newData?.[field]) {
        changedFields.push(field);
      }
    });

    return changedFields;
  }

  /**
   * Validate that a movement won't cause negative stock
   */
  async validateMovement(insumoId, cantidad, tipoMovimiento) {
    try {
      if (tipoMovimiento === 'entrada') {
        return { valid: true }; // Entries are always valid
      }

      const insumoResult = await firebaseService.getById('insumos', insumoId);
      if (!insumoResult.success) {
        return { valid: false, error: 'Could not load insumo data' };
      }

      const currentStock = insumoResult.data.existencia_total || 0;
      
      if (currentStock < cantidad) {
        return { 
          valid: false, 
          error: `Stock insuficiente. Disponible: ${currentStock}, Solicitado: ${cantidad}`,
          currentStock,
          requestedAmount: cantidad
        };
      }

      return { valid: true, currentStock };
    } catch (error) {
      console.error('Error validating movement:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get synchronization status for an insumo
   */
  async getSyncStatus(insumoId) {
    try {
      const [insumoResult, lotesResult] = await Promise.all([
        firebaseService.getById('insumos', insumoId),
        firebaseService.getAll('lotes')
      ]);

      if (!insumoResult.success || !lotesResult.success) {
        return { success: false, error: 'Could not load data' };
      }

      const insumo = insumoResult.data;
      const insumoLotes = lotesResult.data.filter(lote => lote.insumo_id === insumoId);
      
      const stockFromLotes = insumoLotes.reduce((total, lote) => {
        return total + (parseInt(lote.existencia) || 0);
      }, 0);

      const currentStock = insumo.existencia_total || 0;
      const isInSync = currentStock === stockFromLotes;

      return {
        success: true,
        inSync: isInSync,
        insumoStock: currentStock,
        lotesStock: stockFromLotes,
        difference: Math.abs(currentStock - stockFromLotes),
        lotesCount: insumoLotes.length,
        lastSync: insumo.last_sync
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export instance
const syncService = new SyncService();
export default syncService;
