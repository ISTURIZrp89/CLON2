import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import syncService from '../../services/SyncService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import './Movimientos.css';

const Movimientos = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const { userData, hasRole } = useAuth();
  const [movimientos, setMovimientos] = useState([]);
  const [filteredMovimientos, setFilteredMovimientos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [selectedMovimiento, setSelectedMovimiento] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [showSystemMovements, setShowSystemMovements] = useState(false);
  const [selectedMovements, setSelectedMovements] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [formData, setFormData] = useState({
    tipo_movimiento: 'entrada',
    insumo_id: '',
    cantidad: '',
    motivo: '',
    numero_lote: '',
    fecha_caducidad: '',
    proveedor: '',
    numero_factura: '',
    observaciones: ''
  });

  // Estado para formulario rápido
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickMovements, setQuickMovements] = useState([{
    id: 1,
    tipo_movimiento: 'entrada',
    insumo_id: '',
    cantidad: '',
    motivo: '',
    numero_lote: '',
    fecha_caducidad: ''
  }]);

  useEffect(() => {
    loadMovimientos();
    loadInsumos();

    // Check URL parameters for quick form
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('quick') === 'true') {
      setShowQuickForm(true);
    }

    // Keyboard shortcuts
    const handleKeyDown = (event) => {
      // Ctrl + Q para formulario rápido
      if (event.ctrlKey && event.key === 'q') {
        event.preventDefault();
        setShowQuickForm(true);
      }
      // Ctrl + N para nuevo movimiento
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        setShowModal(true);
      }
      // Escape para cerrar modales
      if (event.key === 'Escape') {
        setShowModal(false);
        setShowQuickForm(false);
        setShowDetailsModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter movements based on search and filters
  useEffect(() => {
    let filtered = movimientos;

    // System movements filter
    if (!showSystemMovements) {
      filtered = filtered.filter(movimiento => !isSystemMovement(movimiento));
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(movimiento =>
        getInsumoName(movimiento.insumo_id).toLowerCase().includes(searchLower) ||
        movimiento.motivo?.toLowerCase().includes(searchLower) ||
        movimiento.usuario?.toLowerCase().includes(searchLower) ||
        movimiento.numero_lote?.toLowerCase().includes(searchLower) ||
        movimiento.observaciones?.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filterTipo) {
      filtered = filtered.filter(movimiento => movimiento.tipo_movimiento === filterTipo);
    }

    // Date filter
    if (filterFecha) {
      const filterDate = new Date(filterFecha);
      filtered = filtered.filter(movimiento => {
        if (movimiento.fecha_movimiento?.seconds) {
          const movDate = new Date(movimiento.fecha_movimiento.seconds * 1000);
          return movDate.toDateString() === filterDate.toDateString();
        }
        return false;
      });
    }

    setFilteredMovimientos(filtered);
  }, [movimientos, searchTerm, filterTipo, filterFecha, showSystemMovements]);

  const loadMovimientos = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('movimientos');
      if (result.success) {
        setMovimientos(result.data || []);
      } else {
        showError('Error', 'No se pudieron cargar los movimientos');
      }
    } catch (error) {
      console.error('Error loading movimientos:', error);
      showError('Error', 'Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const loadInsumos = async () => {
    try {
      const result = await firebaseService.getAll('insumos');
      if (result.success) {
        setInsumos(result.data || []);
      }
    } catch (error) {
      console.error('Error loading insumos:', error);
    }
  };

  const updateInsumoStock = async (insumoId, cantidad, tipoMovimiento, isReversal = false) => {
    try {
      const insumo = insumos.find(i => i.id === insumoId);
      if (!insumo) return;

      const existenciaActual = insumo.existencia_total || 0;
      let nuevaExistencia;

      // If this is a reversal (from edit/delete), invert the movement type
      const effectiveType = isReversal ?
        (tipoMovimiento === 'entrada' ? 'salida' : 'entrada') :
        tipoMovimiento;

      if (effectiveType === 'entrada') {
        nuevaExistencia = existenciaActual + cantidad;
      } else {
        nuevaExistencia = Math.max(0, existenciaActual - cantidad);
      }

      await firebaseService.update('insumos', insumoId, {
        existencia_total: nuevaExistencia,
        updated_at: new Date()
      });

      // Use sync service to keep everything in sync
      await syncService.syncStockWithLotes(insumoId);

      // Reload insumos to update local state
      await loadInsumos();
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.insumo_id || !formData.cantidad || !formData.motivo) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    const cantidad = parseInt(formData.cantidad);
    if (cantidad <= 0) {
      showError('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    // Validate stock for salidas using sync service
    if (formData.tipo_movimiento === 'salida') {
      const validation = await syncService.validateMovement(
        formData.insumo_id,
        cantidad,
        formData.tipo_movimiento
      );

      if (!validation.valid) {
        showError('Error', validation.error);
        return;
      }

      // Additional warning for movements that might affect lotes
      if (validation.currentStock - cantidad <= 10) {
        const confirmLowStock = window.confirm(
          `⚠️ ADVERTENCIA: Este movimiento dejará muy poco stock (${validation.currentStock - cantidad} unidades).\n\n` +
          `¿Deseas continuar?`
        );
        if (!confirmLowStock) return;
      }
    }

    try {
      setLoading(true);
      const movimientoData = {
        ...formData,
        cantidad: cantidad,
        usuario: userData?.nombre || 'Usuario',
        usuario_id: userData?.id || 'unknown',
        fecha_movimiento: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      if (editingMovimiento) {
        // When editing, first reverse the old movement, then apply the new one
        await updateInsumoStock(
          editingMovimiento.insumo_id,
          editingMovimiento.cantidad,
          editingMovimiento.tipo_movimiento,
          true // isReversal
        );

        const result = await firebaseService.update('movimientos', editingMovimiento.id, movimientoData);
        if (result.success) {
          // Apply the new movement
          await updateInsumoStock(formData.insumo_id, cantidad, formData.tipo_movimiento);

          showSuccess('Éxito', 'Movimiento actualizado correctamente');
          await loadMovimientos();
          handleCloseModal();
        } else {
          showError('Error', 'No se pudo actualizar el movimiento');
        }
      } else {
        const result = await firebaseService.create('movimientos', movimientoData);
        if (result.success) {
          // Update stock in insumo
          await updateInsumoStock(formData.insumo_id, cantidad, formData.tipo_movimiento);

          showSuccess('Éxito', 'Movimiento registrado correctamente');
          await loadMovimientos();
          handleCloseModal();
        } else {
          showError('Error', 'No se pudo registrar el movimiento');
        }
      }
    } catch (error) {
      console.error('Error saving movimiento:', error);
      showError('Error', 'Error al guardar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (movimiento) => {
    const isAdmin = hasRole('administrador') || userData?.rol === 'administrador';
    if (!isAdmin) {
      showError('Error', 'Solo los administradores pueden editar movimientos');
      return;
    }

    // Show confirmation for editing movements
    const warningMessage =
      '⚠️ ADVERTENCIA: Editar movimientos afecta la auditoría del inventario.\n\n' +
      'Esta acción:\n' +
      '• Revertirá el movimiento original\n' +
      '• Aplicará el nuevo movimiento\n' +
      '• Actualizará automáticamente las existencias\n' +
      '• Sincronizará con los lotes\n\n' +
      '¿Estás seguro de continuar?';

    if (window.confirm(warningMessage)) {
      setEditingMovimiento(movimiento);
      setFormData({
        tipo_movimiento: movimiento.tipo_movimiento || 'entrada',
        insumo_id: movimiento.insumo_id || '',
        cantidad: movimiento.cantidad || '',
        motivo: movimiento.motivo || '',
        numero_lote: movimiento.numero_lote || '',
        fecha_caducidad: movimiento.fecha_caducidad || '',
        proveedor: movimiento.proveedor || '',
        numero_factura: movimiento.numero_factura || '',
        costo_unitario: movimiento.costo_unitario || '',
        observaciones: movimiento.observaciones || ''
      });
      setShowModal(true);
    }
  };

  const isSystemMovement = (movimiento) => {
    // Un movimiento es del sistema SOLO si tiene sync_type específico Y usuario del sistema
    return (movimiento.sync_type &&
            (movimiento.usuario === 'Sistema' || movimiento.usuario_id === 'system'));
  };

  const handleDelete = async (movimiento) => {
    const isAdmin = hasRole('administrador') || userData?.rol === 'administrador';
    if (!isAdmin) {
      showError('Error', 'Solo los administradores pueden eliminar movimientos');
      return;
    }

    // Check if it's a system movement (more precise logic)
    if (isSystemMovement(movimiento)) {
      showError('Error', 'No se pueden eliminar movimientos generados automáticamente por el sistema. Use la opción "Limpiar Movimientos del Sistema" si es necesario.');
      return;
    }

    const confirmMessage = `⚠️ ADVERTENCIA: Esta acción afectará la auditoría del inventario.\n\n` +
      `Movimiento: ${movimiento.tipo_movimiento.toUpperCase()}\n` +
      `Insumo: ${getInsumoName(movimiento.insumo_id)}\n` +
      `Cantidad: ${movimiento.cantidad}\n` +
      `Motivo: ${movimiento.motivo}\n\n` +
      `��Estás seguro de eliminar este movimiento?`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);

        // Delete the movement from Firebase first
        const result = await firebaseService.delete('movimientos', movimiento.id);
        if (result.success) {
          // Only reverse stock for manual movements (not system ones)
          if (!movimiento.sync_type) {
            await updateInsumoStock(
              movimiento.insumo_id,
              movimiento.cantidad,
              movimiento.tipo_movimiento,
              true // isReversal
            );
          }

          // Update local state immediately
          setMovimientos(prevMovimientos =>
            prevMovimientos.filter(m => m.id !== movimiento.id)
          );

          showSuccess('Éxito', 'Movimiento eliminado correctamente');

          // Reload to ensure consistency
          await loadMovimientos();
          await loadInsumos();
        } else {
          showError('Error', 'No se pudo eliminar el movimiento');
        }
      } catch (error) {
        console.error('Error deleting movement:', error);
        showError('Error', 'Error al eliminar el movimiento');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMovimiento(null);
    setFormData({
      tipo_movimiento: 'entrada',
      insumo_id: '',
      cantidad: '',
      motivo: '',
      numero_lote: '',
      fecha_caducidad: '',
      proveedor: '',
      numero_factura: '',
      observaciones: ''
    });
  };

  // Funciones para formulario rápido
  const handleQuickMovementChange = (index, field, value) => {
    const updated = [...quickMovements];
    updated[index][field] = value;
    setQuickMovements(updated);
  };

  const addQuickMovement = () => {
    const newId = Math.max(...quickMovements.map(m => m.id)) + 1;
    setQuickMovements([...quickMovements, {
      id: newId,
      tipo_movimiento: 'entrada',
      insumo_id: '',
      cantidad: '',
      motivo: '',
      numero_lote: '',
      fecha_caducidad: ''
    }]);
  };

  const removeQuickMovement = (id) => {
    if (quickMovements.length > 1) {
      setQuickMovements(quickMovements.filter(m => m.id !== id));
    }
  };

  const handleQuickSubmit = async () => {
    // Validar que todos los movimientos estén completos
    const incompleteMovements = quickMovements.filter(m => {
      const basicFieldsIncomplete = !m.insumo_id || !m.cantidad || !m.motivo;

      // Para entradas, el lote es requerido
      if (m.tipo_movimiento === 'entrada' && !m.numero_lote) {
        return true;
      }

      return basicFieldsIncomplete;
    });

    if (incompleteMovements.length > 0) {
      const missingFields = [];
      incompleteMovements.forEach((m, index) => {
        const movementNum = quickMovements.findIndex(qm => qm.id === m.id) + 1;
        const missing = [];
        if (!m.insumo_id) missing.push('Insumo');
        if (!m.cantidad) missing.push('Cantidad');
        if (!m.motivo) missing.push('Motivo');
        if (m.tipo_movimiento === 'entrada' && !m.numero_lote) missing.push('Número de Lote');

        if (missing.length > 0) {
          missingFields.push(`Movimiento #${movementNum}: ${missing.join(', ')}`);
        }
      });

      showError('Campos Faltantes', `Por favor completa los siguientes campos:\n\n${missingFields.join('\n')}`);
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const movement of quickMovements) {
        const cantidad = parseInt(movement.cantidad);
        if (cantidad <= 0) {
          errorCount++;
          continue;
        }

        // Validar stock para salidas
        if (movement.tipo_movimiento === 'salida') {
          const validation = await syncService.validateMovement(
            movement.insumo_id,
            cantidad,
            movement.tipo_movimiento
          );

          if (!validation.valid) {
            showError('Error', `${getInsumoName(movement.insumo_id)}: ${validation.error}`);
            errorCount++;
            continue;
          }
        }

        const movimientoData = {
          tipo_movimiento: movement.tipo_movimiento,
          insumo_id: movement.insumo_id,
          cantidad: cantidad,
          motivo: movement.motivo,
          numero_lote: movement.numero_lote || '',
          fecha_caducidad: movement.fecha_caducidad || '',
          usuario: userData?.nombre || 'Usuario',
          usuario_id: userData?.id || 'unknown',
          fecha_movimiento: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          observaciones: `Movimiento rápido creado en lote`
        };

        const result = await firebaseService.create('movimientos', movimientoData);
        if (result.success) {
          // Update stock
          await updateInsumoStock(movement.insumo_id, cantidad, movement.tipo_movimiento);
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        showSuccess('Éxito', `${successCount} movimiento(s) registrado(s) correctamente`);
        await loadMovimientos();
        setShowQuickForm(false);
        setQuickMovements([{
          id: 1,
          tipo_movimiento: 'entrada',
          insumo_id: '',
          cantidad: '',
          motivo: '',
          numero_lote: '',
          fecha_caducidad: ''
        }]);
      }

      if (errorCount > 0) {
        showWarning('Advertencia', `${errorCount} movimiento(s) no se pudieron procesar`);
      }

    } catch (error) {
      console.error('Error saving quick movements:', error);
      showError('Error', 'Error al guardar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (movimiento) => {
    setSelectedMovimiento(movimiento);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedMovimiento(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipo('');
    setFilterFecha('');
  };

  const getMovementStats = () => {
    const systemMovements = movimientos.filter(m => isSystemMovement(m));
    const manualMovements = movimientos.filter(m => !isSystemMovement(m));

    const stats = {
      total: movimientos.length,
      manual: manualMovements.length,
      system: systemMovements.length,
      entradas: movimientos.filter(m => m.tipo_movimiento === 'entrada').length,
      salidas: movimientos.filter(m => m.tipo_movimiento === 'salida').length,
      ajustes: movimientos.filter(m => m.tipo_movimiento === 'ajuste').length,
      today: movimientos.filter(m => {
        if (m.fecha_movimiento?.seconds) {
          const movDate = new Date(m.fecha_movimiento.seconds * 1000);
          const today = new Date();
          return movDate.toDateString() === today.toDateString();
        }
        return false;
      }).length
    };
    return stats;
  };

  const getInsumoName = (insumoId) => {
    if (!insumoId) return 'N/A';
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo ? `${insumo.codigo} - ${insumo.nombre}` : `ID: ${insumoId} (Insumo no encontrado)`;
  };

  const clearSystemMovements = async () => {
    const isAdmin = hasRole('administrador') || userData?.rol === 'administrador';
    if (!isAdmin) {
      showError('Error', 'Solo los administradores pueden limpiar movimientos del sistema');
      return;
    }

    const systemMovements = movimientos.filter(m => isSystemMovement(m));

    if (systemMovements.length === 0) {
      showWarning('Info', 'No hay movimientos del sistema para limpiar');
      return;
    }

    const confirmMessage = `⚠️ ADVERTENCIA: Esta acción eliminará ${systemMovements.length} movimientos generados automáticamente por el sistema.\n\n` +
      `Esto incluye movimientos de sincronización, ajustes automáticos, etc.\n\n` +
      `¿Estás seguro de continuar?`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        let deletedCount = 0;
        let errorCount = 0;

        for (const movement of systemMovements) {
          try {
            const result = await firebaseService.delete('movimientos', movement.id);
            if (result.success) {
              deletedCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error('Error deleting system movement:', error);
            errorCount++;
          }
        }

        if (deletedCount > 0) {
          showSuccess('Éxito', `${deletedCount} movimientos del sistema eliminados`);
          await loadMovimientos();
          await loadInsumos();
        }

        if (errorCount > 0) {
          showError('Advertencia', `${errorCount} movimientos no se pudieron eliminar`);
        }
      } catch (error) {
        console.error('Error clearing system movements:', error);
        showError('Error', 'Error al limpiar movimientos del sistema');
      } finally {
        setLoading(false);
      }
    }
  };

  const getMovementOrigin = (movimiento) => {
    if (movimiento.sync_type) {
      const syncTypes = {
        'insumo_edit': 'Edición de Insumo',
        'lote_sync': 'Sincronización de Lotes',
        'lote_change': 'Cambio de Lote',
        'lote_deletion': 'Eliminación de Lote',
        'full_sync': 'Sincronización Completa',
        'insumo_data_change': 'Cambio de Datos'
      };
      return syncTypes[movimiento.sync_type] || 'Sistema';
    }
    return 'Manual';
  };

  // Bulk selection functions
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedMovements([]);
  };

  const toggleMovementSelection = (movementId) => {
    if (selectedMovements.includes(movementId)) {
      setSelectedMovements(selectedMovements.filter(id => id !== movementId));
    } else {
      setSelectedMovements([...selectedMovements, movementId]);
    }
  };

  const selectAllMovements = () => {
    const selectableMovements = filteredMovimientos
      .filter(m => !isSystemMovement(m))
      .map(m => m.id);
    setSelectedMovements(selectableMovements);
  };

  const clearSelection = () => {
    setSelectedMovements([]);
  };

  const handleBulkDelete = async () => {
    const isAdmin = hasRole('administrador') || userData?.rol === 'administrador';
    if (!isAdmin) {
      showError('Error', 'Solo los administradores pueden eliminar movimientos');
      return;
    }

    if (selectedMovements.length === 0) {
      showWarning('Advertencia', 'No hay movimientos seleccionados para eliminar');
      return;
    }

    const movementsToDelete = movimientos.filter(m => selectedMovements.includes(m.id));
    const systemMovementsSelected = movementsToDelete.filter(m => isSystemMovement(m));

    if (systemMovementsSelected.length > 0) {
      showError('Error', `${systemMovementsSelected.length} de los movimientos seleccionados son del sistema y no se pueden eliminar`);
      return;
    }

    const confirmMessage = `⚠️ ADVERTENCIA: Esta acción eliminará ${selectedMovements.length} movimientos y afectará la auditoría del inventario.\n\n` +
      `¿Estás seguro de eliminar estos ${selectedMovements.length} movimientos?`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        let deletedCount = 0;
        let errorCount = 0;

        for (const movement of movementsToDelete) {
          try {
            const result = await firebaseService.delete('movimientos', movement.id);
            if (result.success) {
              // Only reverse stock for manual movements
              if (!isSystemMovement(movement)) {
                await updateInsumoStock(
                  movement.insumo_id,
                  movement.cantidad,
                  movement.tipo_movimiento,
                  true // isReversal
                );
              }
              deletedCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error('Error deleting movement:', error);
            errorCount++;
          }
        }

        if (deletedCount > 0) {
          showSuccess('Éxito', `${deletedCount} movimientos eliminados correctamente`);
          setSelectedMovements([]);
          setBulkMode(false);
          await loadMovimientos();
          await loadInsumos();
        }

        if (errorCount > 0) {
          showError('Advertencia', `${errorCount} movimientos no se pudieron eliminar`);
        }
      } catch (error) {
        console.error('Error in bulk delete:', error);
        showError('Error', 'Error al eliminar los movimientos seleccionados');
      } finally {
        setLoading(false);
      }
    }
  };

  const columns = [
    ...(bulkMode ? [{
      key: 'select',
      label: (
        <div className="bulk-header">
          <input
            type="checkbox"
            checked={selectedMovements.length === filteredMovimientos.filter(m => !isSystemMovement(m)).length && filteredMovimientos.filter(m => !isSystemMovement(m)).length > 0}
            onChange={(e) => e.target.checked ? selectAllMovements() : clearSelection()}
            className="bulk-checkbox"
          />
          <span>Sel.</span>
        </div>
      ),
      width: '60px',
      render: (value, row) => {
        const canSelect = !isSystemMovement(row);
        return (
          <input
            type="checkbox"
            checked={selectedMovements.includes(row.id)}
            onChange={() => canSelect && toggleMovementSelection(row.id)}
            disabled={!canSelect}
            className="row-checkbox"
          />
        );
      }
    }] : []),
    {
      key: 'fecha_movimiento',
      label: 'Fecha',
      width: '120px',
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value.seconds * 1000);
        return (
          <div className="fecha-column">
            <div className="fecha-date">{date.toLocaleDateString()}</div>
            <div className="fecha-time">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
        );
      }
    },
    {
      key: 'tipo_movimiento',
      label: 'Tipo',
      width: '100px',
      render: (value) => {
        const types = {
          entrada: { label: 'Entrada', color: 'success', icon: 'mdi-arrow-down' },
          salida: { label: 'Salida', color: 'danger', icon: 'mdi-arrow-up' },
          ajuste: { label: 'Ajuste', color: 'warning', icon: 'mdi-tune' },
          transferencia: { label: 'Transferencia', color: 'info', icon: 'mdi-swap-horizontal' }
        };
        const type = types[value] || { label: value, color: 'secondary', icon: 'mdi-help' };
        return (
          <span className={`status-badge ${type.color}`}>
            <i className={`mdi ${type.icon}`}></i>
            {type.label}
          </span>
        );
      }
    },
    {
      key: 'insumo_id',
      label: 'Insumo',
      width: '200px',
      render: (value) => {
        const insumo = insumos.find(i => i.id === value);
        if (!insumo) return value;
        return (
          <div className="insumo-column">
            <div className="insumo-code">{insumo.codigo}</div>
            <div className="insumo-name">{insumo.nombre}</div>
            <div className="insumo-stock">Stock: {insumo.existencia_total || 0}</div>
          </div>
        );
      }
    },
    {
      key: 'cantidad',
      label: 'Cantidad',
      width: '80px',
      render: (value, row) => {
        const isPositive = row.tipo_movimiento === 'entrada' || row.tipo_movimiento === 'ajuste';
        return (
          <span className={`cantidad-value ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : '-'}{Math.abs(value || 0)}
          </span>
        );
      }
    },
    {
      key: 'motivo',
      label: 'Motivo',
      width: '150px',
      render: (value) => (
        <span className="motivo-text" title={value}>
          {value || '-'}
        </span>
      )
    },
    {
      key: 'usuario',
      label: 'Usuario/Origen',
      width: '130px',
      render: (value, row) => {
        const isSystem = isSystemMovement(row);
        return (
          <div className="usuario-column">
            <i className={`mdi ${isSystem ? 'mdi-cog' : 'mdi-account'}`}></i>
            <div className="user-info">
              <span className="user-name">{value || 'Sistema'}</span>
              {isSystem && (
                <span className="origin-badge">{getMovementOrigin(row)}</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'numero_lote',
      label: 'Lote',
      width: '100px',
      render: (value) => value ? (
        <span className="lote-badge">{value}</span>
      ) : (
        <span className="text-muted">-</span>
      )
    },
    {
      key: 'observaciones',
      label: 'Observaciones',
      width: '150px',
      render: (value) => value ? (
        <span className="observaciones-text" title={value}>
          {value.length > 30 ? `${value.substring(0, 30)}...` : value}
        </span>
      ) : (
        <span className="text-muted">-</span>
      )
    },
    {
      key: 'sync_status',
      label: 'Sincronización',
      width: '120px',
      render: (value, row) => {
        const isSystem = isSystemMovement(row);
        const isSynced = row.synced || row.sync_status === 'completed';

        if (isSystem) {
          return (
            <div className="sync-status-system">
              <i className="mdi mdi-check-circle sync-icon success"></i>
              <span className="sync-text">Sincronizado</span>
            </div>
          );
        } else {
          return (
            <div className="sync-status-manual">
              {isSynced ? (
                <>
                  <i className="mdi mdi-check-circle sync-icon success"></i>
                  <span className="sync-text">Aplicado</span>
                </>
              ) : (
                <>
                  <i className="mdi mdi-clock-outline sync-icon pending"></i>
                  <span className="sync-text">Pendiente</span>
                </>
              )}
            </div>
          );
        }
      }
    }
  ];

  const isAdmin = hasRole('administrador') || userData?.rol === 'administrador';

  const actions = [
    {
      label: 'Ver Detalles',
      icon: 'mdi-eye',
      onClick: handleShowDetails,
      className: 'btn-secondary'
    },
    ...(isAdmin ? [
      {
        label: 'Editar',
        icon: 'mdi-pencil',
        onClick: handleEdit,
        className: 'btn-warning',
        condition: (row) => !isSystemMovement(row)
      },
      {
        label: 'Eliminar',
        icon: 'mdi-delete',
        onClick: handleDelete,
        className: 'btn-danger',
        condition: (row) => !isSystemMovement(row)
      }
    ] : [])
  ];

  const stats = getMovementStats();

  return (
    <div className="movimientos-page">
      {/* Estado de Conexión y Persistencia Offline */}
      <ConnectionStatus />

      <div className="page-header">
        <div className="page-title">
          <div className="title-icon">
            <i className="mdi mdi-transfer"></i>
          </div>
          <div className="title-content">
            <h1>Movimientos de Inventario</h1>
            <p className="page-subtitle">Gestiona y supervisa todos los movimientos del inventario</p>
          </div>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <div className="admin-indicator">
              <i className="mdi mdi-shield-check"></i>
              <span>Modo Administrador</span>
            </div>
          )}
          <Button
            variant="secondary"
            icon="mdi-refresh"
            onClick={() => {
              loadMovimientos();
              loadInsumos();
              showSuccess('Actualizado', 'Lista de movimientos actualizada');
            }}
          >
            Actualizar
          </Button>
          {isAdmin && (
            <Button
              variant="warning"
              icon="mdi-broom"
              onClick={clearSystemMovements}
              title="Limpiar movimientos generados automáticamente por el sistema"
            >
              Limpiar Sistema
            </Button>
          )}
          {isAdmin && (
            <Button
              variant={bulkMode ? "danger" : "info"}
              icon={bulkMode ? "mdi-close" : "mdi-checkbox-multiple-marked"}
              onClick={toggleBulkMode}
              title={bulkMode ? "Salir del modo selección" : "Activar selección múltiple"}
            >
              {bulkMode ? "Cancelar" : "Selección Múltiple"}
            </Button>
          )}
          <Button
            onClick={() => setShowQuickForm(true)}
            className="btn-success"
            icon="mdi-lightning-bolt"
            title="Movimiento Rápido (Ctrl+Q)"
          >
            Movimiento Rápido
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
            title="Nuevo Movimiento (Ctrl+N)"
          >
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-card primary">
          <div className="stat-icon">
            <i className="mdi mdi-transfer"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Movimientos</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <i className="mdi mdi-account"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.manual}</h3>
            <p>Manuales</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="mdi mdi-cog"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.system}</h3>
            <p>Del Sistema</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <i className="mdi mdi-arrow-down-bold"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.entradas}</h3>
            <p>Entradas</p>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <i className="mdi mdi-calendar-today"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.today}</h3>
            <p>Hoy</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Filters Section */}
        <div className="filters-section">
          <div className="search-container">
            <i className="mdi mdi-magnify search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por insumo, motivo, usuario, lote u observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="search-clear"
                onClick={() => setSearchTerm('')}
                title="Limpiar búsqueda"
              >
                <i className="mdi mdi-close"></i>
              </button>
            )}
          </div>

          <div className="filter-controls">
            <div className="filter-group">
              <label>Tipo:</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="salida">Salidas</option>
                <option value="ajuste">Ajustes</option>
                <option value="transferencia">Transferencias</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Fecha:</label>
              <input
                type="date"
                value={filterFecha}
                onChange={(e) => setFilterFecha(e.target.value)}
                className="filter-date"
              />
            </div>

            <div className="filter-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showSystemMovements}
                  onChange={(e) => setShowSystemMovements(e.target.checked)}
                  className="system-filter-checkbox"
                />
                <span className="checkbox-text">Mostrar movimientos de sincronización del sistema</span>
              </label>
            </div>

            {(searchTerm || filterTipo || filterFecha) && (
              <Button
                variant="secondary"
                size="small"
                icon="mdi-filter-remove"
                onClick={clearFilters}
              >
                Limpiar Filtros
              </Button>
            )}
          </div>

          {/* Results info */}
          {(searchTerm || filterTipo || filterFecha || !showSystemMovements) && (
            <div className="filter-results">
              <span>
                Mostrando {filteredMovimientos.length} de {movimientos.length} movimientos
                {!showSystemMovements && ` (${stats.system} movimientos del sistema ocultos)`}
              </span>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {bulkMode && selectedMovements.length > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-info">
              <i className="mdi mdi-checkbox-multiple-marked"></i>
              <span>{selectedMovements.length} movimiento{selectedMovements.length !== 1 ? 's' : ''} seleccionado{selectedMovements.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="bulk-buttons">
              <Button
                variant="secondary"
                size="small"
                icon="mdi-select-off"
                onClick={clearSelection}
              >
                Deseleccionar Todo
              </Button>
              <Button
                variant="danger"
                size="small"
                icon="mdi-delete-multiple"
                onClick={handleBulkDelete}
                loading={loading}
              >
                Eliminar Seleccionados
              </Button>
            </div>
          </div>
        )}

        <DataTable
          data={filteredMovimientos}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyMessage="No se encontraron movimientos"
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-transfer"></i>
                {editingMovimiento ? 'Editar Movimiento' : 'Nuevo Movimiento'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="tipo_movimiento">Tipo de Movimiento *</label>
                  <select
                    id="tipo_movimiento"
                    value={formData.tipo_movimiento}
                    onChange={(e) => setFormData({...formData, tipo_movimiento: e.target.value})}
                    required
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste de Inventario</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="insumo_id">Insumo *</label>
                  <select
                    id="insumo_id"
                    value={formData.insumo_id}
                    onChange={(e) => setFormData({...formData, insumo_id: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar insumo</option>
                    {insumos.map(insumo => (
                      <option key={insumo.id} value={insumo.id}>
                        {insumo.codigo} - {insumo.nombre} (Stock: {insumo.existencia_total || 0})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="cantidad">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    id="cantidad"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="motivo">Motivo *</label>
                  <select
                    id="motivo"
                    value={formData.motivo}
                    onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar motivo</option>
                    {formData.tipo_movimiento === 'entrada' && (
                      <>
                        <option value="compra">Compra</option>
                        <option value="donacion">Donación</option>
                        <option value="devolucion">Devolución</option>
                        <option value="transferencia_entrada">Transferencia de Entrada</option>
                      </>
                    )}
                    {formData.tipo_movimiento === 'salida' && (
                      <>
                        <option value="uso_laboratorio">Uso en Laboratorio</option>
                        <option value="venta">Venta</option>
                        <option value="prestamo">Préstamo</option>
                        <option value="caducidad">Por Caducidad</option>
                        <option value="transferencia_salida">Transferencia de Salida</option>
                        <option value="deterioro">Deterioro/Daño</option>
                      </>
                    )}
                    {formData.tipo_movimiento === 'ajuste' && (
                      <>
                        <option value="conteo_fisico">Conteo Físico</option>
                        <option value="correccion">Corrección de Error</option>
                        <option value="merma">Merma</option>
                      </>
                    )}
                    {formData.tipo_movimiento === 'transferencia' && (
                      <>
                        <option value="cambio_ubicacion">Cambio de Ubicación</option>
                        <option value="laboratorio_otro">Entre Laboratorios</option>
                      </>
                    )}
                  </select>
                </div>
                
                {(formData.tipo_movimiento === 'entrada' || formData.tipo_movimiento === 'ajuste') && (
                  <>
                    <div className="form-group">
                      <label htmlFor="numero_lote">Número de Lote</label>
                      <input
                        type="text"
                        id="numero_lote"
                        value={formData.numero_lote}
                        onChange={(e) => setFormData({...formData, numero_lote: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="fecha_caducidad">Fecha de Caducidad</label>
                      <input
                        type="date"
                        id="fecha_caducidad"
                        value={formData.fecha_caducidad}
                        onChange={(e) => setFormData({...formData, fecha_caducidad: e.target.value})}
                      />
                    </div>
                  </>
                )}
                
                {formData.tipo_movimiento === 'entrada' && (
                  <>
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
                      <label htmlFor="numero_factura">Número de Factura</label>
                      <input
                        type="text"
                        id="numero_factura"
                        value={formData.numero_factura}
                        onChange={(e) => setFormData({...formData, numero_factura: e.target.value})}
                      />
                    </div>
                    

                  </>
                )}
                
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
                  {editingMovimiento ? 'Actualizar Movimiento' : 'Registrar Movimiento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedMovimiento && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-information"></i>
                Detalles del Movimiento
              </h2>
              <button className="modal-close" onClick={handleCloseDetailsModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-section">
                  <h3>Información General</h3>
                  <div className="detail-row">
                    <span className="detail-label">Tipo de Movimiento:</span>
                    <span className={`status-badge ${
                      selectedMovimiento.tipo_movimiento === 'entrada' ? 'success' :
                      selectedMovimiento.tipo_movimiento === 'salida' ? 'danger' :
                      selectedMovimiento.tipo_movimiento === 'ajuste' ? 'warning' : 'info'
                    }`}>
                      {selectedMovimiento.tipo_movimiento?.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Fecha:</span>
                    <span>{selectedMovimiento.fecha_movimiento ?
                      new Date(selectedMovimiento.fecha_movimiento.seconds * 1000).toLocaleString() : '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Usuario:</span>
                    <span>{selectedMovimiento.usuario || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Motivo:</span>
                    <span>{selectedMovimiento.motivo || '-'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Insumo y Cantidad</h3>
                  <div className="detail-row">
                    <span className="detail-label">Insumo:</span>
                    <span>{getInsumoName(selectedMovimiento.insumo_id)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Cantidad:</span>
                    <span className="detail-quantity">{selectedMovimiento.cantidad || 0}</span>
                  </div>
                  {selectedMovimiento.numero_lote && (
                    <div className="detail-row">
                      <span className="detail-label">Número de Lote:</span>
                      <span>{selectedMovimiento.numero_lote}</span>
                    </div>
                  )}
                  {selectedMovimiento.fecha_caducidad && (
                    <div className="detail-row">
                      <span className="detail-label">Fecha de Caducidad:</span>
                      <span>{selectedMovimiento.fecha_caducidad}</span>
                    </div>
                  )}
                </div>

                {(selectedMovimiento.proveedor || selectedMovimiento.numero_factura || selectedMovimiento.costo_unitario) && (
                  <div className="detail-section">
                    <h3>Información Comercial</h3>
                    {selectedMovimiento.proveedor && (
                      <div className="detail-row">
                        <span className="detail-label">Proveedor:</span>
                        <span>{selectedMovimiento.proveedor}</span>
                      </div>
                    )}
                    {selectedMovimiento.numero_factura && (
                      <div className="detail-row">
                        <span className="detail-label">Número de Factura:</span>
                        <span>{selectedMovimiento.numero_factura}</span>
                      </div>
                    )}
                    {selectedMovimiento.costo_unitario && (
                      <div className="detail-row">
                        <span className="detail-label">Costo Unitario:</span>
                        <span>${selectedMovimiento.costo_unitario.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedMovimiento.observaciones && (
                  <div className="detail-section full-width">
                    <h3>Observaciones</h3>
                    <div className="detail-observation">
                      {selectedMovimiento.observaciones}
                    </div>
                  </div>
                )}

                {/* Sync Information */}
                {selectedMovimiento.sync_type && (
                  <div className="detail-section full-width">
                    <h3>Información de Sincronización</h3>
                    <div className="detail-row">
                      <span className="detail-label">Tipo de Sincronización:</span>
                      <span className="status-badge info">{selectedMovimiento.sync_type}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <Button onClick={handleCloseDetailsModal} className="btn-secondary">
                  Cerrar
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      onClick={() => {
                        handleCloseDetailsModal();
                        handleEdit(selectedMovimiento);
                      }}
                      className="btn-warning"
                      icon="mdi-pencil"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => {
                        handleCloseDetailsModal();
                        handleDelete(selectedMovimiento);
                      }}
                      className="btn-danger"
                      icon="mdi-delete"
                    >
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Form Modal */}
      {showQuickForm && (
        <div className="modal-overlay" onClick={() => setShowQuickForm(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-lightning-bolt"></i>
                Movimientos Rápidos
              </h2>
              <button className="modal-close" onClick={() => setShowQuickForm(false)}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="quick-form-header">
                <div>
                  <p>Crea múltiples movimientos de manera rápida y eficiente</p>
                  <small className="keyboard-shortcuts">
                    💡 <strong>Atajos:</strong> Ctrl+Q (Rápido) | Ctrl+N (Nuevo) | Esc (Cerrar)
                  </small>
                </div>
                <Button
                  onClick={addQuickMovement}
                  className="btn-success"
                  icon="mdi-plus"
                  size="small"
                >
                  Agregar Movimiento
                </Button>
              </div>

              <div className="quick-movements-container">
                {quickMovements.map((movement, index) => (
                  <div key={movement.id} className="quick-movement-row">
                    <div className="row-header">
                      <span className="row-number">#{index + 1}</span>
                      {quickMovements.length > 1 && (
                        <button
                          className="remove-row-btn"
                          onClick={() => removeQuickMovement(movement.id)}
                          title="Eliminar movimiento"
                        >
                          <i className="mdi mdi-close"></i>
                        </button>
                      )}
                    </div>

                    <div className="quick-form-grid">
                      <div className="form-group">
                        <label>Tipo *</label>
                        <select
                          value={movement.tipo_movimiento}
                          onChange={(e) => handleQuickMovementChange(index, 'tipo_movimiento', e.target.value)}
                          required
                        >
                          <option value="entrada">Entrada</option>
                          <option value="salida">Salida</option>
                          <option value="ajuste">Ajuste</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Insumo *</label>
                        <select
                          value={movement.insumo_id}
                          onChange={(e) => handleQuickMovementChange(index, 'insumo_id', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar insumo</option>
                          {insumos.map(insumo => (
                            <option key={insumo.id} value={insumo.id}>
                              {insumo.codigo} - {insumo.nombre} (Stock: {insumo.existencia_total || 0})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          value={movement.cantidad}
                          onChange={(e) => handleQuickMovementChange(index, 'cantidad', e.target.value)}
                          placeholder="0"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Motivo *</label>
                        <select
                          value={movement.motivo}
                          onChange={(e) => handleQuickMovementChange(index, 'motivo', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar motivo</option>
                          {movement.tipo_movimiento === 'entrada' && (
                            <>
                              <option value="compra">Compra</option>
                              <option value="donacion">Donación</option>
                              <option value="devolucion">Devolución</option>
                            </>
                          )}
                          {movement.tipo_movimiento === 'salida' && (
                            <>
                              <option value="uso_laboratorio">Uso en Laboratorio</option>
                              <option value="venta">Venta</option>
                              <option value="prestamo">Préstamo</option>
                              <option value="caducidad">Por Caducidad</option>
                            </>
                          )}
                          {movement.tipo_movimiento === 'ajuste' && (
                            <>
                              <option value="conteo_fisico">Conteo Físico</option>
                              <option value="correccion">Corrección de Error</option>
                              <option value="merma">Merma</option>
                            </>
                          )}
                        </select>
                      </div>

                      {movement.tipo_movimiento === 'entrada' && (
                        <>
                          <div className="form-group">
                            <label>Número de Lote *</label>
                            <input
                              type="text"
                              value={movement.numero_lote}
                              onChange={(e) => handleQuickMovementChange(index, 'numero_lote', e.target.value)}
                              placeholder="Ej: L2024001"
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label>Fecha de Caducidad</label>
                            <input
                              type="date"
                              value={movement.fecha_caducidad}
                              onChange={(e) => handleQuickMovementChange(index, 'fecha_caducidad', e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <Button
                  type="button"
                  onClick={() => setShowQuickForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleQuickSubmit}
                  className="btn-primary"
                  loading={loading}
                  icon="mdi-check-all"
                >
                  Crear {quickMovements.length} Movimiento{quickMovements.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Movimientos;
