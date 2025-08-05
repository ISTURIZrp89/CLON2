import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import UserDebugInfo from '../../components/UI/UserDebugInfo';
import useOfflineData from '../../hooks/useOfflineData';
import '../../utils/adminFix'; // Activa función de emergencia
import './Dashboard.css';

const Dashboard = () => {
  const { showSuccess, showError } = useNotification();

  // Usar múltiples hooks de persistencia offline para cada colección
  const insumosData = useOfflineData('insumos', { enableRealTime: false, refreshInterval: 60000 });
  const lotesData = useOfflineData('lotes', { enableRealTime: false, refreshInterval: 60000 });
  const productosData = useOfflineData('productos', { enableRealTime: false, refreshInterval: 60000 });
  const pedidosData = useOfflineData('pedidos', { enableRealTime: false, refreshInterval: 60000 });
  const usuariosData = useOfflineData('usuarios', { enableRealTime: false, refreshInterval: 60000 });
  const equiposData = useOfflineData('equipos', { enableRealTime: false, refreshInterval: 60000 });
  const ventasData = useOfflineData('ventas', { enableRealTime: false, refreshInterval: 60000 });
  const pedidosFinalizadosData = useOfflineData('pedidos_finalizados', { enableRealTime: false, refreshInterval: 60000 });
  const ajustesData = useOfflineData('ajustes', { enableRealTime: false, refreshInterval: 60000 });

  // Estado consolidado para compatibilidad - memoized to prevent infinite re-renders
  const data = useMemo(() => ({
    insumos: insumosData.data,
    lotes: lotesData.data,
    productos: productosData.data,
    pedidos: pedidosData.data,
    usuarios: usuariosData.data,
    equipos: equiposData.data,
    ventas: ventasData.data,
    pedidosFinalizados: pedidosFinalizadosData.data,
    ajustes: ajustesData.data
  }), [
    insumosData.data,
    lotesData.data,
    productosData.data,
    pedidosData.data,
    usuariosData.data,
    equiposData.data,
    ventasData.data,
    pedidosFinalizadosData.data,
    ajustesData.data
  ]);

  // Loading global: true si alguno está cargando
  const loading = insumosData.loading || lotesData.loading || productosData.loading ||
                  pedidosData.loading || usuariosData.loading || equiposData.loading ||
                  ventasData.loading || pedidosFinalizadosData.loading || ajustesData.loading;

  // Estado offline: true si alguno está offline
  const isOffline = insumosData.isOffline || lotesData.isOffline || productosData.isOffline ||
                    pedidosData.isOffline || usuariosData.isOffline || equiposData.isOffline ||
                    ventasData.isOffline || pedidosFinalizadosData.isOffline || ajustesData.isOffline;
  const [stats, setStats] = useState({
    totalInsumos: 0,
    totalLotes: 0,
    totalEquipos: 0,
    stockBajo: 0,
    porVencer: 0,
    ventasHoy: 0,
    pedidosPendientes: 0,
    equiposMantenimiento: 0
  });
  const inventoryChartRef = useRef(null);
  const ordersChartRef = useRef(null);
  const salesChartRef = useRef(null);

  // Función para refrescar todos los datos usando los hooks
  const handleRefresh = () => {
    console.log('🔄 Refrescando datos del dashboard...');
    insumosData.refresh();
    lotesData.refresh();
    productosData.refresh();
    pedidosData.refresh();
    usuariosData.refresh();
    equiposData.refresh();
    ventasData.refresh();
    pedidosFinalizadosData.refresh();
    ajustesData.refresh();
    showSuccess('Dashboard Actualizado', `Datos actualizados ${isOffline ? '(modo offline)' : ''}`);
  };

  // Manejar errores de los hooks
  useEffect(() => {
    const errors = [
      insumosData.error,
      lotesData.error,
      productosData.error,
      pedidosData.error,
      usuariosData.error,
      equiposData.error,
      ventasData.error,
      pedidosFinalizadosData.error,
      ajustesData.error
    ].filter(Boolean);

    if (errors.length > 0) {
      showError('Error', `Error cargando datos: ${errors[0]}`);
    }
  }, [insumosData.error, lotesData.error, productosData.error, pedidosData.error,
      usuariosData.error, equiposData.error, ventasData.error, pedidosFinalizadosData.error,
      ajustesData.error, showError]);

  useEffect(() => {
    if (data.insumos.length > 0 || data.pedidos.length > 0) {
      updateKPIs();
      renderCharts();
      loadAlerts();
      loadRecentActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const updateKPIs = () => {
    // Total Insumos
    const totalInsumos = data.insumos.length;

    // Total Lotes
    const totalLotes = data.lotes.length;

    // Total Equipos
    const totalEquipos = data.equipos.length;

    // Stock Bajo - using your actual data structure
    let stockBajo = 0;
    data.insumos.forEach(insumo => {
      const existenciaTotal = insumo.existencia_total || 0;
      const stockMinimo = insumo.stock_minimo || 0;
      if (existenciaTotal <= stockMinimo) {
        stockBajo++;
      }
    });

    // Por Vencer (próximos 30 días) - using your lotes structure
    const today = new Date();
    const warningDays = data.ajustes?.inventory?.expiryWarningDays || 30;
    const warningDate = new Date(today.getTime() + warningDays * 24 * 60 * 60 * 1000);
    
    const porVencer = data.lotes.filter(lote => {
      if (!lote.fecha_caducidad) return false;
      const expiryDate = new Date(lote.fecha_caducidad);
      return expiryDate >= today && expiryDate <= warningDate;
    }).length;

    // Ventas de hoy
    const ventasHoy = data.ventas.filter(venta => {
      if (!venta.sale_date) return false;
      const saleDate = new Date(venta.sale_date);
      return saleDate.toDateString() === today.toDateString();
    }).length;

    // Pedidos pendientes
    const pedidosPendientes = data.pedidos.filter(pedido => 
      pedido.estado && pedido.estado.toLowerCase() !== 'completado' && pedido.estado.toLowerCase() !== 'cancelado'
    ).length;

    // Equipos que necesitan mantenimiento
    const equiposMantenimiento = data.equipos.filter(equipo => {
      if (!equipo.proximoMantenimiento) return false;
      const mantenimientoDate = new Date(equipo.proximoMantenimiento);
      const advanceDays = data.ajustes?.equipment?.maintenanceAdvanceDays || 7;
      const alertDate = new Date(today.getTime() + advanceDays * 24 * 60 * 60 * 1000);
      return mantenimientoDate <= alertDate;
    }).length;

    setStats({
      totalInsumos,
      totalLotes,
      totalEquipos,
      stockBajo,
      porVencer,
      ventasHoy,
      pedidosPendientes,
      equiposMantenimiento
    });
  };

  const renderCharts = () => {
    renderInventoryChart();
    renderOrdersChart();
    renderSalesChart();
  };

  const renderInventoryChart = () => {
    const canvas = inventoryChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Group products by location (ubicacion_almacen)
    const locations = {};
    data.productos.forEach(producto => {
      const location = producto.ubicacion_almacen || 'Sin ubicación';
      locations[location] = (locations[location] || 0) + (producto.existencia_actual || 0);
    });
    
    const locationNames = Object.keys(locations);
    const locationValues = Object.values(locations);
    
    if (locationNames.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No hay datos de inventario disponibles', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const maxValue = Math.max(...locationValues);
    const barWidth = Math.max(canvas.width / locationNames.length - 20, 40);
    const barMaxHeight = canvas.height - 80;
    
    locationNames.forEach((location, index) => {
      const barHeight = maxValue > 0 ? (locationValues[index] / maxValue) * barMaxHeight : 0;
      const x = index * (barWidth + 20) + 20;
      const y = canvas.height - barHeight - 40;
      
      // Draw bar
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, `hsl(${(index * 60) % 360}, 70%, 60%)`);
      gradient.addColorStop(1, `hsl(${(index * 60) % 360}, 70%, 40%)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw value
      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(locationValues[index], x + barWidth / 2, y - 5);
      
      // Draw label
      ctx.save();
      ctx.translate(x + barWidth / 2, canvas.height - 15);
      ctx.font = '11px Inter';
      ctx.fillText(location.substring(0, 12), 0, 0);
      ctx.restore();
    });
  };

  const renderOrdersChart = () => {
    const canvas = ordersChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Count orders by status using your actual data structure
    const statusCount = {};
    data.pedidos.forEach(pedido => {
      const status = pedido.estado || 'Sin estado';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    const total = Object.values(statusCount).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No hay pedidos registrados', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    // Draw pie chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    
    let currentAngle = 0;
    const colors = {
      'Pendiente': '#f59e0b',
      'En proceso': '#3b82f6',
      'Aprobado': '#10b981',
      'Completado': '#10b981',
      'Cancelado': '#ef4444'
    };
    
    Object.entries(statusCount).forEach(([status, count]) => {
      if (count > 0) {
        const sliceAngle = (count / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = colors[status] || '#6b7280';
        ctx.fill();
        
        // Draw label if slice is big enough
        if (sliceAngle > 0.3) {
          const labelAngle = currentAngle + sliceAngle / 2;
          const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
          const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(count, labelX, labelY);
        }
        
        currentAngle += sliceAngle;
      }
    });
    
    // Draw legend
    let legendY = 20;
    Object.entries(statusCount).forEach(([status, count]) => {
      if (count > 0) {
        ctx.fillStyle = colors[status] || '#6b7280';
        ctx.fillRect(20, legendY, 15, 15);
        
        ctx.fillStyle = '#374151';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`${status}: ${count}`, 40, legendY + 12);
        
        legendY += 25;
      }
    });
  };

  const renderSalesChart = () => {
    const canvas = salesChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Sales by payment method
    const paymentMethods = {};
    data.ventas.forEach(venta => {
      const method = venta.payment_method || 'Sin especificar';
      const total = venta.total || 0;
      paymentMethods[method] = (paymentMethods[method] || 0) + total;
    });
    
    const methods = Object.keys(paymentMethods);
    const values = Object.values(paymentMethods);
    
    if (methods.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No hay datos de ventas disponibles', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const maxValue = Math.max(...values);
    const barWidth = Math.max(canvas.width / methods.length - 20, 40);
    const barMaxHeight = canvas.height - 80;
    
    methods.forEach((method, index) => {
      const barHeight = maxValue > 0 ? (values[index] / maxValue) * barMaxHeight : 0;
      const x = index * (barWidth + 20) + 20;
      const y = canvas.height - barHeight - 40;
      
      // Draw bar
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw value
      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      const currency = data.ajustes?.general?.currency || 'MXN';
      ctx.fillText(`$${values[index].toFixed(2)} ${currency}`, x + barWidth / 2, y - 5);
      
      // Draw label
      ctx.save();
      ctx.translate(x + barWidth / 2, canvas.height - 15);
      ctx.font = '11px Inter';
      ctx.fillText(method, 0, 0);
      ctx.restore();
    });
  };

  const loadAlerts = () => {
    // Implementation for alerts based on your settings
  };

  const loadRecentActivity = () => {
    // Implementation for recent activity
  };



  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <UserDebugInfo />
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-view-dashboard"></i>
          <h1>Dashboard - {data.ajustes?.general?.companyName || 'LabFlow Manager'}</h1>

          {/* Connection Status */}
          <div className="connection-status">
            {!navigator.onLine && (
              <span className="offline-badge">
                <i className="mdi mdi-cloud-off"></i>
                Modo Offline
              </span>
            )}
            {navigator.onLine && (
              <span className="online-badge">
                <i className="mdi mdi-cloud-check"></i>
                En línea
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleRefresh}>
            <i className="mdi mdi-refresh"></i>
            Actualizar
          </button>
        </div>
      </div>

      {/* Enhanced KPIs Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <i className="mdi mdi-flask-empty-outline"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalInsumos}</h3>
            <p>Total Insumos</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon warning">
            <i className="mdi mdi-alert-outline"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.stockBajo}</h3>
            <p>Stock Bajo</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon danger">
            <i className="mdi mdi-clock-alert-outline"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.porVencer}</h3>
            <p>Por Vencer</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active">
            <i className="mdi mdi-cog"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalEquipos}</h3>
            <p>Total Equipos</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon info">
            <i className="mdi mdi-cart"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.pedidosPendientes}</h3>
            <p>Pedidos Pendientes</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon active">
            <i className="mdi mdi-cash"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.ventasHoy}</h3>
            <p>Ventas Hoy</p>
          </div>
        </div>
      </div>

      {/* Estado de Conexión y Persistencia Offline */}
      <ConnectionStatus />

      <div className="dashboard-grid">
        <div className="main-dashboard">
          {/* Gráfico de Inventario por Ubicación */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Inventario por Ubicación</h3>
              <span className="chart-period">Actual</span>
            </div>
            <div className="chart-container">
              <canvas ref={inventoryChartRef} width="400" height="300"></canvas>
            </div>
          </div>

          {/* Gráfico de Estado de Pedidos */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Estado de Pedidos</h3>
              <span className="chart-period">Actual</span>
            </div>
            <div className="chart-container">
              <canvas ref={ordersChartRef} width="400" height="300"></canvas>
            </div>
          </div>

          {/* Gráfico de Ventas por Método de Pago */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Ventas por Método de Pago</h3>
              <span className="chart-period">Actual</span>
            </div>
            <div className="chart-container">
              <canvas ref={salesChartRef} width="400" height="300"></canvas>
            </div>
          </div>
        </div>

        <div className="sidebar-dashboard">
          {/* Acciones Rápidas */}
          <div className="quick-actions">
            <h3 className="section-title">
              <i className="mdi mdi-lightning-bolt"></i>
              Acciones Rápidas
            </h3>
            <div className="actions-grid">
              <Link to="/insumos" className="action-btn">
                <i className="mdi mdi-flask-plus action-icon"></i>
                <span>Gestionar Insumos</span>
              </Link>
              <Link to="/productos" className="action-btn">
                <i className="mdi mdi-package-variant action-icon"></i>
                <span>Gestionar Productos</span>
              </Link>
              <Link to="/equipos" className="action-btn">
                <i className="mdi mdi-cog action-icon"></i>
                <span>Gestionar Equipos</span>
              </Link>
              <Link to="/pedidos" className="action-btn">
                <i className="mdi mdi-cart-plus action-icon"></i>
                <span>Nuevo Pedido</span>
              </Link>
            </div>
          </div>

          {/* Alertas del Sistema */}
          <div className="alerts-section">
            <h3 className="section-title">
              <i className="mdi mdi-bell-alert"></i>
              Alertas del Sistema
            </h3>
            <div className="alerts-container">
              {stats.stockBajo > 0 && (
                <div className="alert-item">
                  <i className="mdi mdi-alert-outline alert-icon alert-warning"></i>
                  <span className="alert-text">{stats.stockBajo} insumos con stock bajo</span>
                </div>
              )}
              {stats.porVencer > 0 && (
                <div className="alert-item">
                  <i className="mdi mdi-clock-alert-outline alert-icon alert-error"></i>
                  <span className="alert-text">{stats.porVencer} lotes próximos a vencer</span>
                </div>
              )}
              {stats.equiposMantenimiento > 0 && (
                <div className="alert-item">
                  <i className="mdi mdi-wrench alert-icon alert-warning"></i>
                  <span className="alert-text">{stats.equiposMantenimiento} equipos requieren mantenimiento</span>
                </div>
              )}
              {stats.stockBajo === 0 && stats.porVencer === 0 && stats.equiposMantenimiento === 0 && (
                <div className="alert-item">
                  <i className="mdi mdi-check-circle alert-icon alert-success"></i>
                  <span className="alert-text">No hay alertas activas</span>
                </div>
              )}
            </div>
          </div>

          {/* Resumen del Sistema */}
          <div className="system-summary">
            <h3 className="section-title">
              <i className="mdi mdi-information"></i>
              Resumen del Sistema
            </h3>
            <div className="summary-items">
              <div className="summary-item">
                <span className="summary-label">Productos Registrados:</span>
                <span className="summary-value">{data.productos.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Lotes Activos:</span>
                <span className="summary-value">{data.lotes.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Ventas Totales:</span>
                <span className="summary-value">{data.ventas.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Usuarios Activos:</span>
                <span className="summary-value">{data.usuarios.filter(u => u.estado === 'activo').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
