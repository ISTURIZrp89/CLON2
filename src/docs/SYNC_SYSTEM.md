# Sistema de Sincronización de Inventario LabFlow

## Descripción General

El sistema de sincronización asegura que todos los cambios en **Insumos**, **Lotes**, y **Movimientos** estén coordinados y mantengan la consistencia de datos en todo el inventario.

## Componentes del Sistema

### 1. SyncService (`src/services/SyncService.js`)

Servicio central que coordina todas las operaciones de sincronización:

- **createMovementFromInsumoChange**: Crea movimientos automáticamente cuando se editan insumos
- **syncStockWithLotes**: Sincroniza las existencias de insumos con sus lotes
- **handleLoteChange**: Maneja cambios en lotes y actualiza el insumo padre
- **handleLoteDeletion**: Maneja eliminación de lotes
- **performFullSync**: Ejecuta sincronización completa de todo el inventario
- **validateMovement**: Valida que un movimiento no cause stock negativo

### 2. Integración en Componentes

#### Insumos (`src/pages/Insumos/Insumos.js`)
- Al crear/editar insumos se generan movimientos automáticamente
- Al cambiar existencias se registra el movimiento correspondiente
- Botón de sincronización manual para verificar consistencia
- Los lotes se sincronizan automáticamente con el insumo padre

#### Movimientos (`src/pages/Movimientos/Movimientos.js`)
- Validación mejorada usando el servicio de sincronización
- Actualización automática de stock en insumos
- Sincronización con lotes después de movimientos

## Flujos de Sincronización

### 1. Edición de Insumos
```
Usuario edita insumo → 
SyncService detecta cambios → 
Crea movimientos automáticos → 
Actualiza base de datos → 
Notifica resultado
```

### 2. Gestión de Lotes
```
Usuario crea/edita/elimina lote → 
SyncService calcula impacto → 
Actualiza existencias del insumo padre → 
Crea movimiento de registro → 
Sincroniza datos
```

### 3. Sincronización Completa
```
Usuario ejecuta sincronización → 
SyncService revisa todos los insumos → 
Compara existencias con lotes → 
Corrige discrepancias → 
Genera reporte de resultados
```

## Tipos de Movimientos Automáticos

### Generados por Edición de Insumos:
- `ajuste_entrada_manual`: Cuando aumenta el stock
- `ajuste_salida_manual`: Cuando disminuye el stock
- `modificacion_datos`: Cuando se cambian otros campos

### Generados por Gestión de Lotes:
- `creacion_lote`: Al crear un nuevo lote
- `edicion_lote`: Al modificar un lote existente
- `eliminacion_lote`: Al eliminar un lote
- `sincronizacion_lotes`: Al sincronizar existencias con lotes

### Generados por Sincronización:
- `sincronizacion_completa`: Registro de sincronización general
- `lote_sync`: Corrección de discrepancias

## Funcionalidades de Seguridad

1. **Validación de Stock**: Previene stock negativo
2. **Transacciones Atómicas**: Los cambios se aplican completamente o fallan
3. **Registro de Auditoría**: Todos los cambios quedan registrados
4. **Manejo de Errores**: Notificaciones claras al usuario

## Uso del Sistema

### Para Administradores:
- Acceso completo a funciones de sincronización
- Botón de "Sincronizar" en la página de Insumos
- Notificaciones detalladas sobre el estado de sincronización

### Para Usuarios:
- Sincronización automática transparente
- Notificaciones cuando hay problemas
- Validaciones en tiempo real

## Mensajes del Sistema

### Éxito Completo:
- ✅ "Insumo actualizado y sincronizado correctamente"
- ✅ "Lote creado y sincronizado correctamente"
- ✅ "Sincronización completa: Procesados X, Actualizados Y"

### Éxito Parcial:
- ⚠️ "Éxito parcial: [Operación] completada pero hubo problemas en la sincronización"

### Errores:
- ❌ "Stock insuficiente. Disponible: X, Solicitado: Y"
- ❌ "Error en la sincronización: [detalle del error]"

## Mantenimiento

### Monitoreo:
- Revisar los movimientos con `sync_type` para auditoría
- Verificar discrepancias entre insumos y lotes
- Ejecutar sincronización completa periódicamente

### Resolución de Problemas:
1. Usar el botón "Sincronizar" para correcciones automáticas
2. Revisar la consola del navegador para errores detallados
3. Verificar conexión a Firebase
4. Validar permisos de usuario

## Consideraciones Técnicas

- **Performance**: Las sincronizaciones son asíncronas y no bloquean la UI
- **Offline**: El sistema funciona con el modo offline de FirebaseService
- **Escalabilidad**: Diseñado para manejar cientos de insumos y miles de movimientos
- **Extensibilidad**: Fácil agregar nuevos tipos de sincronización

## Próximas Mejoras

1. Sincronización automática en segundo plano
2. Notificaciones push para discrepancias críticas
3. Dashboard de salud del inventario
4. Exportación de reportes de sincronización
5. API endpoints para sincronización externa
