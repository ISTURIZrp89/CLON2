# 🚀 Sistema de Migración de Base de Datos - LabFlow Manager

## 📋 **DESCRIPCIÓN GENERAL**

Sistema completo para migración, exportación e importación de datos entre bases de datos Firebase de manera rápida y segura. Permite cambiar de proyecto Firebase o realizar respaldos completos de todos los datos.

## 🎯 **FUNCIONALIDADES PRINCIPALES**

### **1. 📦 EXPORTACIÓN DE DATOS**
- **Exportación completa** de todas las colecciones a archivo JSON
- **Conversión automática** de timestamps y fechas
- **Descarga directa** del archivo de respaldo
- **Formato compatible** para importación posterior

### **2. 📥 IMPORTACIÓN DE DATOS**
- **Importación desde archivo JSON** exportado previamente
- **Selección granular** de colecciones específicas
- **Modo sobrescritura** o fusión de datos
- **Validación automática** del formato de archivo

### **3. 🔄 MIGRACIÓN DIRECTA**
- **Migración en tiempo real** entre bases de datos Firebase
- **Conexión simultánea** a base origen y destino
- **Opción de eliminar datos origen** después de migración
- **Control de tamaño de batch** para optimización

### **4. 📊 MONITOREO Y ESTADÍSTICAS**
- **Estadísticas detalladas** de la base actual
- **Conteo por colección** en tiempo real
- **Progreso visual** durante operaciones
- **Logs detallados** de todas las operaciones

## 🔧 **COLECCIONES SOPORTADAS**

El sistema maneja automáticamente todas las colecciones de LabFlow Manager:

```javascript
[
  'usuarios',           // Gestión de usuarios
  'insumos',           // Inventario de insumos
  'lotes',             // Lotes de productos
  'productos',         // Catálogo de productos
  'equipos',           // Equipos de laboratorio
  'pedidos',           // Pedidos activos
  'pedidos_finalizados', // Historial de pedidos
  'ventas',            // Registro de ventas
  'movimientos',       // Movimientos de inventario
  'envios',            // Gestión de envíos
  'ajustes',           // Configuraciones
  'configuracion'      // Configuración del sistema
]
```

## 🛠️ **GUÍA DE USO**

### **📦 Exportar Datos**

1. **Acceder al módulo**: Menú → Administración → Migración de Datos
2. **Pestaña "Exportar"**: Revisar estadísticas actuales
3. **Iniciar exportación**: Clic en "Exportar Todas las Colecciones"
4. **Descarga automática**: El archivo se descarga como `labflow-export-YYYY-MM-DD.json`

**Formato del archivo exportado:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0",
  "source": "LabFlow Manager",
  "collections": {
    "usuarios": [
      {
        "id": "doc_id",
        "nombre": "Usuario",
        "created_at": "2024-01-01T00:00:00.000Z",
        ...
      }
    ],
    "insumos": [...],
    ...
  }
}
```

### **📥 Importar Datos**

1. **Pestaña "Importar"**: Seleccionar archivo JSON exportado
2. **Seleccionar colecciones**: Elegir qué colecciones importar (opcional)
3. **Configurar opciones**:
   - ✅ **Sobrescribir datos existentes**: Reemplaza completamente
   - ❌ **Fusionar datos**: Combina con datos existentes
4. **Ejecutar importación**: Los datos se procesan en batches
5. **Verificar resultados**: Revisar estadísticas actualizadas

### **🔄 Migrar a Otra Base de Datos**

#### **Paso 1: Configurar Base de Datos Objetivo**
```javascript
// Configuración Firebase objetivo
{
  apiKey: "AIzaSy...",
  authDomain: "nuevo-proyecto.firebaseapp.com",
  projectId: "nuevo-proyecto",
  storageBucket: "nuevo-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
}
```

#### **Paso 2: Establecer Conexión**
1. **Completar formulario** con datos del proyecto Firebase destino
2. **Hacer clic en "Conectar"**: Se valida la conexión
3. **Verificar estado**: Debe mostrar "Conectado" en verde

#### **Paso 3: Configurar Migración**
1. **Seleccionar colecciones**: Elegir qué migrar
2. **Configurar opciones**:
   - **Tamaño de batch**: 50-500 documentos por operación
   - ⚠️ **Eliminar origen**: CUIDADO, elimina datos después de migrar
3. **Ejecutar migración**: Proceso automático con progreso

## ⚠️ **CONSIDERACIONES DE SEGURIDAD**

### **🔒 Permisos Requeridos**
- **Solo administradores** pueden acceder al módulo
- **Verificación de credenciales** Firebase para conexión
- **Validación de configuración** antes de cada operación

### **🛡️ Precauciones Importantes**
1. **SIEMPRE hacer backup** antes de migrar con eliminación de origen
2. **Probar conexión** a base destino antes de migración masiva
3. **Verificar permisos** de escritura en base de datos objetivo
4. **Revisar cuotas** Firebase para evitar límites durante migración

### **📋 Validaciones Automáticas**
- ✅ Formato válido de archivo JSON
- ✅ Estructura correcta de colecciones
- ✅ Conexión activa a bases de datos
- ✅ Permisos de lectura/escritura
- ✅ Límites de batch de Firestore (500 ops/batch)

## 🔄 **CASOS DE USO COMUNES**

### **1. 🏢 Cambio de Proyecto Firebase**
```bash
# Escenario: Migrar de proyecto de prueba a producción
1. Exportar datos desde desarrollo
2. Configurar conexión a producción
3. Migrar directamente (sin eliminar origen inicialmente)
4. Verificar datos en producción
5. Repetir migración con eliminación de origen si todo está correcto
```

### **2. 💾 Respaldo Periódico**
```bash
# Escenario: Backup semanal de datos
1. Exportar datos cada semana
2. Almacenar archivos JSON en almacenamiento seguro
3. Mantener histórico de respaldos
4. Probar restauración periódicamente
```

### **3. 🔄 Sincronización Ambiente Desarrollo/Producción**
```bash
# Escenario: Actualizar desarrollo con datos de producción
1. Exportar datos de producción (sin datos sensibles)
2. Importar en ambiente de desarrollo
3. Usar modo sobrescritura para datos de prueba actualizados
```

### **4. 🏗️ Migración por Mantenimiento**
```bash
# Escenario: Cambio de región o proyecto por políticas
1. Crear nuevo proyecto Firebase en región deseada
2. Configurar todas las reglas y índices
3. Migrar datos usando el sistema
4. Actualizar configuración de aplicación
5. Eliminar proyecto anterior
```

## 📈 **MÉTRICAS Y MONITOREO**

### **📊 Estadísticas Disponibles**
- **Total de documentos** por colección
- **Tamaño estimado** de datos
- **Última actualización** de estadísticas
- **Progreso en tiempo real** durante operaciones

### **🔍 Logs y Debugging**
```javascript
// Logs típicos durante migración
✅ Conectando a base de datos objetivo...
✅ Conexión establecida exitosamente
📄 Migrando usuarios: 150 documentos
📄 Migrando insumos: 1,200 documentos
📄 Migrando productos: 85 documentos
🎉 Migración completada: 2,435 documentos migrados, 0 errores
```

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **❌ Error de Conexión**
```bash
Problema: "Error conectando a base de datos objetivo"
Solución:
1. Verificar credenciales Firebase
2. Confirmar permisos de lectura/escritura
3. Revisar reglas de seguridad Firestore
4. Verificar conectividad de red
```

### **⏱️ Timeout en Migración**
```bash
Problema: "Timeout durante migración de colección grande"
Solución:
1. Reducir tamaño de batch (50-100 documentos)
2. Migrar colecciones individualmente
3. Verificar límites de Firebase del proyecto destino
```

### **📁 Error de Formato en Importación**
```bash
Problema: "Formato de archivo inválido"
Solución:
1. Verificar que el archivo sea JSON válido
2. Confirmar estructura con campo "collections"
3. Revisar que el archivo no esté corrupto
4. Usar solo archivos exportados por el sistema
```

## 🎯 **MEJORES PRÁCTICAS**

### **✅ Recomendaciones Generales**
1. **Siempre exportar antes de migrar** para tener respaldo
2. **Probar en ambiente de desarrollo** antes de producción
3. **Migrar en horarios de menor uso** para evitar conflictos
4. **Verificar datos después de migración** antes de eliminar origen
5. **Mantener logs de todas las operaciones** para auditoria

### **⚡ Optimización de Performance**
1. **Usar batch size óptimo**: 100-200 documentos para colecciones normales
2. **Migrar colecciones grandes individualmente** para mejor control
3. **Ejecutar durante horas de menor tráfico** para mejor rendimiento
4. **Monitorear cuotas Firebase** durante operaciones grandes

---

## 🎉 **SISTEMA COMPLETAMENTE IMPLEMENTADO**

El sistema de migración está **100% funcional** y listo para usar. Incluye todas las funcionalidades necesarias para:

- ✅ **Migrar** entre proyectos Firebase
- ✅ **Exportar/Importar** respaldos completos
- ✅ **Monitorear** operaciones en tiempo real
- ✅ **Garantizar** integridad de datos
- ✅ **Acceso seguro** solo para administradores

**🔐 Acceso**: Menú → Administración → Migración de Datos (Solo Administradores)
