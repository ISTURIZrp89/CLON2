import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import firebaseService from '../../services/FirebaseService';
import Button from '../../components/UI/Button';

const Reportes = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [data, setData] = useState({
    insumos: [],
    movimientos: [],
    pedidos: [],
    equipos: [],
    ventas: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    categoria: '',
    estado: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [insumos, movimientos, pedidos, equipos, ventas] = await Promise.all([
        firebaseService.getAll('insumos'),
        firebaseService.getAll('movimientos'),
        firebaseService.getAll('pedidos'),
        firebaseService.getAll('equipos'),
        firebaseService.getAll('ventas')
      ]);

      setData({
        insumos: insumos.success ? insumos.data || [] : [],
        movimientos: movimientos.success ? movimientos.data || [] : [],
        pedidos: pedidos.success ? pedidos.data || [] : [],
        equipos: equipos.success ? equipos.data || [] : [],
        ventas: ventas.success ? ventas.data || [] : []
      });
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error', 'Error al cargar datos para reportes');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = (reportType) => {
    setLoading(true);
    setSelectedReport(reportType);

    try {
      let report = null;

      switch (reportType) {
        case 'inventario_general':
          report = generateInventoryReport();
          break;
        case 'stock_bajo':
          report = generateLowStockReport();
          break;
        case 'movimientos_periodo':
          report = generateMovementsReport();
          break;
        case 'pedidos_estado':
          report = generateOrdersReport();
          break;
        case 'equipos_mantenimiento':
          report = generateMaintenanceReport();
          break;
        case 'ventas_resumen':
          report = generateSalesReport();
          break;
        case 'productos_mas_vendidos':
          report = generateTopProductsReport();
          break;
        default:
          showError('Error', 'Tipo de reporte no válido');
          return;
      }

      setReportData(report);
      showSuccess('Éxito', 'Reporte generado correctamente');
    } catch (error) {
      console.error('Error generating report:', error);
      showError('Error', 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const generateInventoryReport = () => {
    const filteredInsumos = data.insumos.filter(insumo => {
      if (filters.categoria && insumo.categoria !== filters.categoria) return false;
      if (filters.estado && insumo.estado !== filters.estado) return false;
      return true;
    });

    const totalValue = filteredInsumos.reduce((sum, insumo) => {
      return sum + ((insumo.existencia_total || 0) * (insumo.costo_unitario || 0));
    }, 0);

    return {
      title: 'Reporte de Inventario General',
      summary: {
        totalItems: filteredInsumos.length,
        totalValue: totalValue,
        categories: [...new Set(filteredInsumos.map(i => i.categoria))].length
      },
      data: filteredInsumos.map(insumo => ({
        codigo: insumo.codigo,
        nombre: insumo.nombre,
        categoria: insumo.categoria,
        existencia: insumo.existencia_total || 0,
        stockMinimo: insumo.stock_minimo || 0,
        costoUnitario: insumo.costo_unitario || 0,
        valorTotal: (insumo.existencia_total || 0) * (insumo.costo_unitario || 0),
        ubicacion: insumo.ubicacion_almacen || 'Sin ubicación'
      }))
    };
  };

  const generateLowStockReport = () => {
    const lowStockItems = data.insumos.filter(insumo => {
      const existencia = insumo.existencia_total || 0;
      const minimo = insumo.stock_minimo || 0;
      return existencia <= minimo;
    });

    return {
      title: 'Reporte de Stock Bajo',
      summary: {
        itemsBajoStock: lowStockItems.length,
        itemsAgotados: lowStockItems.filter(i => (i.existencia_total || 0) === 0).length
      },
      data: lowStockItems.map(insumo => ({
        codigo: insumo.codigo,
        nombre: insumo.nombre,
        categoria: insumo.categoria,
        existencia: insumo.existencia_total || 0,
        stockMinimo: insumo.stock_minimo || 0,
        diferencia: (insumo.stock_minimo || 0) - (insumo.existencia_total || 0),
        estado: (insumo.existencia_total || 0) === 0 ? 'Agotado' : 'Stock Bajo'
      }))
    };
  };

  const generateMovementsReport = () => {
    let filteredMovements = data.movimientos;

    if (filters.fechaInicio) {
      const startDate = new Date(filters.fechaInicio);
      filteredMovements = filteredMovements.filter(mov => {
        const movDate = new Date(mov.fecha_movimiento?.seconds * 1000);
        return movDate >= startDate;
      });
    }

    if (filters.fechaFin) {
      const endDate = new Date(filters.fechaFin);
      filteredMovements = filteredMovements.filter(mov => {
        const movDate = new Date(mov.fecha_movimiento?.seconds * 1000);
        return movDate <= endDate;
      });
    }

    const entradas = filteredMovements.filter(m => m.tipo_movimiento === 'entrada');
    const salidas = filteredMovements.filter(m => m.tipo_movimiento === 'salida');

    return {
      title: 'Reporte de Movimientos',
      summary: {
        totalMovimientos: filteredMovements.length,
        entradas: entradas.length,
        salidas: salidas.length,
        cantidadEntradas: entradas.reduce((sum, m) => sum + (m.cantidad || 0), 0),
        cantidadSalidas: salidas.reduce((sum, m) => sum + (m.cantidad || 0), 0)
      },
      data: filteredMovements.map(mov => ({
        fecha: new Date(mov.fecha_movimiento?.seconds * 1000).toLocaleDateString(),
        tipo: mov.tipo_movimiento,
        insumo: mov.insumo_id,
        cantidad: mov.cantidad || 0,
        motivo: mov.motivo,
        usuario: mov.usuario
      }))
    };
  };

  const generateOrdersReport = () => {
    const filteredOrders = data.pedidos.filter(pedido => {
      if (filters.estado && pedido.estado !== filters.estado) return false;
      return true;
    });

    const ordersByStatus = filteredOrders.reduce((acc, pedido) => {
      const status = pedido.estado || 'sin_estado';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      title: 'Reporte de Pedidos por Estado',
      summary: {
        totalPedidos: filteredOrders.length,
        valorTotal: filteredOrders.reduce((sum, p) => sum + (p.total || 0), 0),
        estadisticas: ordersByStatus
      },
      data: filteredOrders.map(pedido => ({
        numero: pedido.numero || pedido.id,
        cliente: pedido.cliente,
        fechaPedido: pedido.fecha_pedido ? new Date(pedido.fecha_pedido.seconds * 1000).toLocaleDateString() : '',
        estado: pedido.estado,
        total: pedido.total || 0,
        productos: pedido.productos?.length || 0
      }))
    };
  };

  const generateMaintenanceReport = () => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const equiposMantenimiento = data.equipos.filter(equipo => {
      if (!equipo.proximo_mantenimiento) return false;
      const mantenimientoDate = new Date(equipo.proximo_mantenimiento.seconds * 1000);
      return mantenimientoDate <= nextMonth;
    });

    return {
      title: 'Reporte de Mantenimiento de Equipos',
      summary: {
        equiposTotal: data.equipos.length,
        requierenMantenimiento: equiposMantenimiento.length,
        mantenimientoVencido: equiposMantenimiento.filter(e => {
          const mantenimientoDate = new Date(e.proximo_mantenimiento.seconds * 1000);
          return mantenimientoDate < today;
        }).length
      },
      data: equiposMantenimiento.map(equipo => ({
        codigo: equipo.codigo,
        nombre: equipo.nombre,
        categoria: equipo.categoria,
        ubicacion: equipo.ubicacion,
        ultimoMantenimiento: equipo.ultimo_mantenimiento ? 
          new Date(equipo.ultimo_mantenimiento.seconds * 1000).toLocaleDateString() : 'Nunca',
        proximoMantenimiento: new Date(equipo.proximo_mantenimiento.seconds * 1000).toLocaleDateString(),
        estado: equipo.estado,
        responsable: equipo.responsable
      }))
    };
  };

  const generateSalesReport = () => {
    let filteredSales = data.ventas;

    if (filters.fechaInicio) {
      const startDate = new Date(filters.fechaInicio);
      filteredSales = filteredSales.filter(venta => {
        const saleDate = new Date(venta.sale_date);
        return saleDate >= startDate;
      });
    }

    if (filters.fechaFin) {
      const endDate = new Date(filters.fechaFin);
      filteredSales = filteredSales.filter(venta => {
        const saleDate = new Date(venta.sale_date);
        return saleDate <= endDate;
      });
    }

    const totalVentas = filteredSales.reduce((sum, v) => sum + (v.total || 0), 0);

    return {
      title: 'Reporte de Ventas',
      summary: {
        totalVentas: filteredSales.length,
        montoTotal: totalVentas,
        promedioVenta: filteredSales.length > 0 ? totalVentas / filteredSales.length : 0
      },
      data: filteredSales.map(venta => ({
        fecha: new Date(venta.sale_date).toLocaleDateString(),
        cliente: venta.customer_name || 'Cliente',
        total: venta.total || 0,
        metodoPago: venta.payment_method,
        productos: venta.items?.length || 0
      }))
    };
  };

  const generateTopProductsReport = () => {
    // This would need actual sales data with product details
    return {
      title: 'Productos Más Vendidos',
      summary: {
        totalProductos: data.ventas.length,
        mensaje: 'Reporte en desarrollo - requiere datos detallados de ventas'
      },
      data: []
    };
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.data) {
      showError('Error', 'No hay datos para exportar');
      return;
    }

    const headers = Object.keys(reportData.data[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('Éxito', 'Reporte exportado a CSV');
  };

  return (
    <div className="reportes-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-chart-line"></i>
          <h1>Reportes y Análisis</h1>
        </div>
      </div>

      <div className="reports-container" style={{ display: 'grid', gap: '2rem' }}>
        {/* Filters Section */}
        <div className="filters-section" style={{ 
          padding: '1.5rem', 
          background: 'var(--background-primary)', 
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>Filtros</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label>Fecha Inicio:</label>
              <input
                type="date"
                value={filters.fechaInicio}
                onChange={(e) => setFilters({...filters, fechaInicio: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>
            <div>
              <label>Fecha Fin:</label>
              <input
                type="date"
                value={filters.fechaFin}
                onChange={(e) => setFilters({...filters, fechaFin: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>
            <div>
              <label>Categoría:</label>
              <select
                value={filters.categoria}
                onChange={(e) => setFilters({...filters, categoria: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              >
                <option value="">Todas las categorías</option>
                <option value="reactivos">Reactivos</option>
                <option value="solventes">Solventes</option>
                <option value="equipos">Equipos</option>
                <option value="consumibles">Consumibles</option>
              </select>
            </div>
            <div>
              <label>Estado:</label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters({...filters, estado: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="pendiente">Pendiente</option>
                <option value="completado">Completado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Report Types */}
        <div className="report-types" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1rem' 
        }}>
          {[
            { id: 'inventario_general', title: 'Inventario General', desc: 'Reporte completo del inventario actual', icon: 'mdi-flask' },
            { id: 'stock_bajo', title: 'Stock Bajo', desc: 'Insumos con stock por debajo del mínimo', icon: 'mdi-alert' },
            { id: 'movimientos_periodo', title: 'Movimientos por Período', desc: 'Entradas y salidas en un período específico', icon: 'mdi-transfer' },
            { id: 'pedidos_estado', title: 'Pedidos por Estado', desc: 'Análisis de pedidos según su estado actual', icon: 'mdi-cart' },
            { id: 'equipos_mantenimiento', title: 'Mantenimiento de Equipos', desc: 'Equipos que requieren mantenimiento', icon: 'mdi-wrench' },
            { id: 'ventas_resumen', title: 'Resumen de Ventas', desc: 'Análisis de ventas por período', icon: 'mdi-chart-bar' },
          ].map(report => (
            <div 
              key={report.id} 
              className="report-card" 
              style={{ 
                padding: '1.5rem', 
                background: 'var(--background-primary)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => generateReport(report.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <i className={report.icon} style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{report.title}</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {report.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Report Results */}
        {reportData && (
          <div className="report-results" style={{ 
            padding: '1.5rem', 
            background: 'var(--background-primary)', 
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{reportData.title}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={exportToCSV} className="btn-secondary" icon="mdi-download">
                  Exportar CSV
                </Button>
                <Button onClick={() => window.print()} className="btn-secondary" icon="mdi-printer">
                  Imprimir
                </Button>
              </div>
            </div>

            {/* Summary */}
            {reportData.summary && (
              <div className="report-summary" style={{ 
                marginBottom: '2rem',
                padding: '1rem',
                background: 'var(--background-secondary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <h4>Resumen</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            {reportData.data && reportData.data.length > 0 && (
              <div className="report-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--background-secondary)' }}>
                      {Object.keys(reportData.data[0]).map(header => (
                        <th key={header} style={{ 
                          padding: '0.75rem', 
                          textAlign: 'left', 
                          borderBottom: '1px solid var(--border-color)',
                          fontWeight: '600'
                        }}>
                          {header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color-light)' }}>
                        {Object.values(row).map((cell, cellIndex) => (
                          <td key={cellIndex} style={{ padding: '0.75rem' }}>
                            {typeof cell === 'number' ? cell.toLocaleString() : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reportes;
