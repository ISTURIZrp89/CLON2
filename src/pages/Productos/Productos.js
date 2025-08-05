import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import firebaseService from '../../services/FirebaseService';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import useOfflineData from '../../hooks/useOfflineData';
import './Productos.css';

const Productos = () => {
  const { showSuccess, showError } = useNotification();

  // Hook de persistencia offline
  const {
    data: productos,
    loading,
    error,
    fromCache,
    refresh,
    createDocument,
    updateDocument,
    deleteDocument,
    isOffline
  } = useOfflineData('productos', {
    orderBy: 'nombre',
    orderDirection: 'asc',
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTime: true
  });

  const [filteredProductos, setFilteredProductos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('management'); // 'management' o 'pos'
  const [cart, setCart] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderData, setOrderData] = useState({
    destinatario: '',
    departamento: '',
    ubicacion_entrega: '',
    telefono: '',
    prioridad: 'normal',
    fecha_necesaria: '',
    observaciones: ''
  });
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    categoria: '',
    descripcion: '',
    precio_costo: '',
    precio_venta: '',
    existencia_actual: '',
    existencia_minima: '',
    existencia_maxima: '',
    ubicacion_almacen: '',
    proveedor: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    fecha_adquisicion: '',
    fecha_garantia: '',
    estado: 'activo',
    observaciones: ''
  });

  // Manejar errores del hook
  useEffect(() => {
    if (error) {
      showError('Error', `Error cargando productos: ${error}`);
    }
  }, [error, showError]);

  // Función de refresh
  const handleRefresh = () => {
    refresh();
    showSuccess('Actualizado', `Productos actualizados ${isOffline ? '(modo offline)' : ''}`);
  };

  // Search filtering effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProductos(productos);
    } else {
      const filtered = productos.filter(producto => {
        const searchLower = searchTerm.toLowerCase();
        return (
          producto.nombre?.toLowerCase().includes(searchLower) ||
          producto.codigo?.toLowerCase().includes(searchLower) ||
          producto.categoria?.toLowerCase().includes(searchLower) ||
          producto.proveedor?.toLowerCase().includes(searchLower) ||
          producto.marca?.toLowerCase().includes(searchLower) ||
          producto.ubicacion_almacen?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredProductos(filtered);
    }
  }, [searchTerm, productos]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Los productos se cargan automáticamente a través del hook useOfflineData

  const generateProductCode = async () => {
    const prefix = 'PROD';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get existing products to generate next sequential number
    const result = await firebaseService.getAll('productos');
    const count = result.success ? result.data.length + 1 : 1;
    const sequence = String(count).padStart(4, '0');

    return `${prefix}-${year}${month}-${sequence}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.categoria) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    // Auto-generate code if not provided
    let codigo = formData.codigo;
    if (!codigo) {
      codigo = await generateProductCode();
    }

    try {
      const productoData = {
        ...formData,
        codigo: codigo,
        precio_costo: parseFloat(formData.precio_costo) || 0,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        existencia_actual: parseInt(formData.existencia_actual) || 0,
        existencia_minima: parseInt(formData.existencia_minima) || 0,
        existencia_maxima: parseInt(formData.existencia_maxima) || 0,
        fecha_adquisicion: formData.fecha_adquisicion || null,
        fecha_garantia: formData.fecha_garantia || null,
        updated_at: new Date()
      };

      if (editingProducto) {
        const result = await firebaseService.update('productos', editingProducto.id, productoData);
        if (result.success) {
          showSuccess('Éxito', 'Producto actualizado correctamente');
        } else {
          showError('Error', 'No se pudo actualizar el producto');
        }
      } else {
        productoData.created_at = new Date();
        const result = await firebaseService.create('productos', productoData);
        if (result.success) {
          showSuccess('Éxito', 'Producto creado correctamente');
        } else {
          showError('Error', 'No se pudo crear el producto');
        }
      }

      await refresh();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving producto:', error);
      showError('Error', 'Error al guardar el producto');
    }
  };

  const handleEdit = (producto) => {
    setEditingProducto(producto);
    setFormData({
      nombre: producto.nombre || '',
      codigo: producto.codigo || '',
      categoria: producto.categoria || '',
      descripcion: producto.descripcion || '',
      precio_costo: producto.precio_costo || '',
      precio_venta: producto.precio_venta || '',
      existencia_actual: producto.existencia_actual || '',
      existencia_minima: producto.existencia_minima || '',
      existencia_maxima: producto.existencia_maxima || '',
      ubicacion_almacen: producto.ubicacion_almacen || '',
      proveedor: producto.proveedor || '',
      marca: producto.marca || '',
      modelo: producto.modelo || '',
      numero_serie: producto.numero_serie || '',
      fecha_adquisicion: producto.fecha_adquisicion ? (producto.fecha_adquisicion.seconds ? new Date(producto.fecha_adquisicion.seconds * 1000).toISOString().split('T')[0] : producto.fecha_adquisicion) : '',
      fecha_garantia: producto.fecha_garantia ? (producto.fecha_garantia.seconds ? new Date(producto.fecha_garantia.seconds * 1000).toISOString().split('T')[0] : producto.fecha_garantia) : '',
      estado: producto.estado || 'activo',
      observaciones: producto.observaciones || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (producto) => {
    if (window.confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) {
      try {
        const result = await firebaseService.delete('productos', producto.id);
        if (result.success) {
          showSuccess('Éxito', 'Producto eliminado correctamente');
          await refresh();
        } else {
          showError('Error', 'No se pudo eliminar el producto');
        }
      } catch (error) {
        console.error('Error deleting producto:', error);
        showError('Error', 'Error al eliminar el producto');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProducto(null);
    setFormData({
      nombre: '',
      codigo: '',
      categoria: '',
      descripcion: '',
      precio_costo: '',
      precio_venta: '',
      existencia_actual: '',
      existencia_minima: '',
      existencia_maxima: '',
      ubicacion_almacen: '',
      proveedor: '',
      marca: '',
      modelo: '',
      numero_serie: '',
      fecha_adquisicion: '',
      fecha_garantia: '',
      estado: 'activo',
      observaciones: ''
    });
  };

  const checkStockStatus = (producto) => {
    const existencia = producto.existencia_actual || 0;
    const minimo = producto.existencia_minima || 0;

    if (existencia === 0) return 'agotado';
    if (existencia <= minimo) return 'bajo';
    return 'normal';
  };

  // POS Functionality
  const addToCart = (producto) => {
    const existingItem = cart.find(item => item.id === producto.id);

    if (existingItem) {
      if (existingItem.cantidad >= producto.existencia_actual) {
        showError('Sin stock', 'No hay suficiente existencia disponible');
        return;
      }
      setCart(cart.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
      showSuccess('Agregado', `Cantidad de ${producto.nombre} aumentada`);
    } else {
      if (producto.existencia_actual <= 0) {
        showError('Sin stock', 'No hay existencia disponible');
        return;
      }
      const cartItem = {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        cantidad: 1,
        disponible: producto.existencia_actual,
        ubicacion: producto.ubicacion_almacen
      };
      setCart([...cart, cartItem]);
      showSuccess('Agregado', `${producto.nombre} agregado al pedido`);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, cantidad: quantity }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const generateOrderNumber = () => {
    const prefix = 'ORD';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}-${year}${month}-${timestamp}-${random}`;
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      showError('Error', 'El pedido debe tener al menos un producto');
      return;
    }

    if (!orderData.destinatario || !orderData.ubicacion_entrega) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const pedidoData = {
        numero: generateOrderNumber(),
        tipo: 'productos',
        destinatario: orderData.destinatario,
        departamento: orderData.departamento,
        ubicacion_entrega: orderData.ubicacion_entrega,
        telefono: orderData.telefono,
        prioridad: orderData.prioridad,
        fecha_solicitud: new Date(),
        fecha_necesaria: orderData.fecha_necesaria ? new Date(orderData.fecha_necesaria) : null,
        estado: 'pendiente',
        observaciones: orderData.observaciones,
        productos: cart.map(item => ({
          id: item.id,
          codigo: item.codigo,
          nombre: item.nombre,
          categoria: item.categoria,
          cantidad_solicitada: item.cantidad,
          cantidad_disponible: item.disponible,
          ubicacion: item.ubicacion
        })),
        total_productos: cart.reduce((sum, item) => sum + item.cantidad, 0),
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await firebaseService.create('pedidos_productos', pedidoData);

      if (result.success) {
        showSuccess('¡Éxito!', `Pedido ${pedidoData.numero} creado correctamente`);
        clearCart();
        setShowOrderModal(false);
        setOrderData({
          destinatario: '',
          departamento: '',
          ubicacion_entrega: '',
          telefono: '',
          prioridad: 'normal',
          fecha_necesaria: '',
          observaciones: ''
        });
      } else {
        showError('Error', 'No se pudo crear el pedido');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      showError('Error', 'Error al crear el pedido');
    }
  };

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="productos-page">
      <div className="page-header">
        <div className="page-title">
          <div className="title-icon">
            <i className="mdi mdi-package-variant"></i>
          </div>
          <div className="title-content">
            <h1>Gestión de Productos</h1>
            <p className="page-subtitle">Administra el inventario de equipos y productos del laboratorio</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="view-mode-toggle">
            <Button
              variant={viewMode === 'management' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('management')}
              icon="mdi-cog"
              size="small"
            >
              Gestión
            </Button>
            <Button
              variant={viewMode === 'pos' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('pos')}
              icon="mdi-cart"
              size="small"
            >
              Punto de Venta
            </Button>
          </div>

          {viewMode === 'management' && (
            <>
              <Button
                variant="secondary"
                icon="mdi-refresh"
                onClick={() => {
                  loadProductos();
                  showSuccess('Actualizado', 'Lista de productos actualizada');
                }}
              >
                Actualizar
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowModal(true)}
                icon="mdi-plus"
              >
                Nuevo Producto
              </Button>
            </>
          )}

          {viewMode === 'pos' && (
            <div className="pos-header-info">
              <div className="cart-summary">
                <i className="mdi mdi-cart"></i>
                <span>{getTotalItems()} productos</span>
              </div>
              <Button
                onClick={() => setShowOrderModal(true)}
                className="btn-primary"
                icon="mdi-check"
                disabled={cart.length === 0}
              >
                Generar Pedido
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stat-card primary">
          <div className="stat-icon">
            <i className="mdi mdi-package-variant-closed"></i>
          </div>
          <div className="stat-content">
            <h3>{productos.length}</h3>
            <p>Total Productos</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <i className="mdi mdi-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{productos.filter(p => checkStockStatus(p) === 'normal').length}</h3>
            <p>Stock Normal</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="mdi mdi-alert-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{productos.filter(p => checkStockStatus(p) === 'bajo').length}</h3>
            <p>Stock Bajo</p>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <i className="mdi mdi-close-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{productos.filter(p => checkStockStatus(p) === 'agotado').length}</h3>
            <p>Agotados</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <i className="mdi mdi-currency-usd"></i>
          </div>
          <div className="stat-content">
            <h3>
              ${productos.reduce((sum, p) => sum + ((p.precio_venta || 0) * (p.existencia_actual || 0)), 0).toLocaleString()}
            </h3>
            <p>Valor Inventario</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {viewMode === 'pos' ? (
          <div className="pos-layout">
            {/* Products Section for POS */}
            <div className="pos-products-section">
              <div className="search-container">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar productos para agregar al pedido..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchTerm && (
                  <button
                    className="search-clear"
                    onClick={clearSearch}
                    title="Limpiar búsqueda"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              <div className="pos-products-grid">
                {filteredProductos.map((producto) => (
                  <div key={producto.id} className="pos-product-card">
                    <div className="product-header">
                      <span className="product-code">{producto.codigo}</span>
                      <span className={`stock-badge ${checkStockStatus(producto)}`}>
                        {producto.existencia_actual || 0} disponibles
                      </span>
                    </div>
                    <h3 className="product-name">{producto.nombre}</h3>
                    <p className="product-category">{producto.categoria}</p>
                    <p className="product-brand">{producto.marca} {producto.modelo}</p>
                    {producto.ubicacion_almacen && (
                      <p className="product-location">
                        <i className="mdi mdi-map-marker"></i>
                        {producto.ubicacion_almacen}
                      </p>
                    )}
                    <button
                      className="add-to-cart-btn"
                      onClick={() => addToCart(producto)}
                      disabled={!producto.existencia_actual || producto.existencia_actual === 0}
                    >
                      <i className="mdi mdi-plus"></i>
                      Agregar al Pedido
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Section */}
            <div className="pos-cart-section">
              <div className="cart-header">
                <h3>
                  <i className="mdi mdi-cart"></i>
                  Pedido Actual ({getTotalItems()} productos)
                </h3>
                {cart.length > 0 && (
                  <Button
                    variant="secondary"
                    size="small"
                    icon="mdi-delete-sweep"
                    onClick={clearCart}
                  >
                    Limpiar
                  </Button>
                )}
              </div>

              <div className="cart-items">
                {cart.length === 0 ? (
                  <div className="empty-cart">
                    <i className="mdi mdi-cart-outline"></i>
                    <p>No hay productos en el pedido</p>
                    <small>Selecciona productos para agregar</small>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="item-info">
                        <div className="item-header">
                          <span className="item-code">{item.codigo}</span>
                        </div>
                        <h4 className="item-name">{item.nombre}</h4>
                        <p className="item-details">
                          Disponible: {item.disponible} unidades
                        </p>
                      </div>

                      <div className="quantity-controls">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.cantidad - 1)}
                          className="qty-btn"
                        >
                          <i className="mdi mdi-minus"></i>
                        </button>
                        <span className="quantity">{item.cantidad}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.cantidad + 1)}
                          className="qty-btn"
                          disabled={item.cantidad >= item.disponible}
                        >
                          <i className="mdi mdi-plus"></i>
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="remove-btn"
                      >
                        <i className="mdi mdi-delete"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search Component */}
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="search-input"
                placeholder="Buscar productos por nombre, código, categoría, proveedor, marca o ubicación..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button
                  className="search-clear"
                  onClick={clearSearch}
                  title="Limpiar búsqueda"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </>
        )}

        {viewMode === 'management' && (
          <>
            {/* Search Results Info */}
            {searchTerm && (
              <div className="search-results-info">
                <span className="results-count">
                  {filteredProductos.length} de {productos.length} productos encontrados
                </span>
                <span className="search-term">
                  para "{searchTerm}"
                </span>
              </div>
            )}

            {loading ? (
              <div className="loading-container">
                <div className="loading"></div>
                <p>Cargando productos...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="empty-state">
                <i className="mdi mdi-package-variant empty-icon"></i>
                <h3>No hay productos registrados</h3>
                <p>Los productos aparecerán aquí cuando los agregues</p>
              </div>
            ) : (
              <div className="products-table">
            <div className="table-header">
              <div className="header-cell">Código</div>
              <div className="header-cell">Nombre</div>
              <div className="header-cell">Categoría</div>
              <div className="header-cell">Marca/Modelo</div>
              <div className="header-cell">Existencia</div>
              <div className="header-cell">Stock Mín.</div>
              <div className="header-cell">Precio Venta</div>
              <div className="header-cell">Ubicación</div>
              <div className="header-cell">Estado</div>
              <div className="header-cell">Acciones</div>
            </div>

            {filteredProductos.map((producto) => (
              <div key={producto.id} className="table-row">
                <div className="table-cell">{producto.codigo}</div>
                <div className="table-cell font-medium">{producto.nombre}</div>
                <div className="table-cell">
                  <span className="category-badge">{producto.categoria}</span>
                </div>
                <div className="table-cell">
                  <div className="brand-info">
                    <strong>{producto.marca}</strong>
                    {producto.modelo && <small>{producto.modelo}</small>}
                  </div>
                </div>
                <div className="table-cell">
                  {(() => {
                    const status = checkStockStatus(producto);
                    const statusColors = {
                      agotado: 'danger',
                      bajo: 'warning',
                      normal: 'success'
                    };
                    return (
                      <span className={`status-badge ${statusColors[status]}`}>
                        {producto.existencia_actual || 0} unidades
                      </span>
                    );
                  })()}
                </div>
                <div className="table-cell">{producto.existencia_minima || 0}</div>
                <div className="table-cell">
                  <span className="price">${(producto.precio_venta || 0).toLocaleString()}</span>
                </div>
                <div className="table-cell">{producto.ubicacion_almacen}</div>
                <div className="table-cell">
                  <span className={`status-badge ${producto.estado}`}>
                    {producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="table-cell">
                  <div className="action-buttons">
                    <Button
                      variant="secondary"
                      size="small"
                      icon="mdi-pencil"
                      onClick={() => handleEdit(producto)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      icon="mdi-delete"
                      onClick={() => handleDelete(producto)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-package-variant"></i>
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="codigo">Código (Opcional - Se genera automáticamente)</label>
                  <input
                    type="text"
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    placeholder="Se generará automáticamente si se deja vacío"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    type="text"
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                    placeholder="Nombre del producto"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="categoria">Categoría *</label>
                  <select
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="equipos_opticos">Equipos Ópticos</option>
                    <option value="instrumentos_medicion">Instrumentos de Medición</option>
                    <option value="equipos_separacion">Equipos de Separación</option>
                    <option value="equipos_calentamiento">Equipos de Calentamiento</option>
                    <option value="equipos_refrigeracion">Equipos de Refrigeración</option>
                    <option value="material_vidrio">Material de Vidrio</option>
                    <option value="material_plastico">Material de Plástico</option>
                    <option value="herramientas">Herramientas</option>
                    <option value="mobiliario">Mobiliario</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    rows="2"
                    placeholder="Descripción detallada del producto"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="precio_costo">Precio Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="precio_costo"
                    value={formData.precio_costo}
                    onChange={(e) => setFormData({...formData, precio_costo: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="precio_venta">Precio Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="precio_venta"
                    value={formData.precio_venta}
                    onChange={(e) => setFormData({...formData, precio_venta: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="existencia_actual">Existencia Actual</label>
                  <input
                    type="number"
                    min="0"
                    id="existencia_actual"
                    value={formData.existencia_actual}
                    onChange={(e) => setFormData({...formData, existencia_actual: e.target.value})}
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="existencia_minima">Existencia Mínima</label>
                  <input
                    type="number"
                    min="0"
                    id="existencia_minima"
                    value={formData.existencia_minima}
                    onChange={(e) => setFormData({...formData, existencia_minima: e.target.value})}
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="existencia_maxima">Existencia Máxima</label>
                  <input
                    type="number"
                    min="0"
                    id="existencia_maxima"
                    value={formData.existencia_maxima}
                    onChange={(e) => setFormData({...formData, existencia_maxima: e.target.value})}
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="ubicacion_almacen">Ubicación en Almacén</label>
                  <input
                    type="text"
                    id="ubicacion_almacen"
                    value={formData.ubicacion_almacen}
                    onChange={(e) => setFormData({...formData, ubicacion_almacen: e.target.value})}
                    placeholder="Ej: ALM-A1-001"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="proveedor">Proveedor</label>
                  <input
                    type="text"
                    id="proveedor"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="marca">Marca</label>
                  <input
                    type="text"
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({...formData, marca: e.target.value})}
                    placeholder="Marca del producto"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="modelo">Modelo</label>
                  <input
                    type="text"
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                    placeholder="Modelo del producto"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="numero_serie">Número de Serie</label>
                  <input
                    type="text"
                    id="numero_serie"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                    placeholder="Número de serie único"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_adquisicion">Fecha de Adquisición</label>
                  <input
                    type="date"
                    id="fecha_adquisicion"
                    value={formData.fecha_adquisicion}
                    onChange={(e) => setFormData({...formData, fecha_adquisicion: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fecha_garantia">Fecha Vencimiento Garantía</label>
                  <input
                    type="date"
                    id="fecha_garantia"
                    value={formData.fecha_garantia}
                    onChange={(e) => setFormData({...formData, fecha_garantia: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="mantenimiento">En Mantenimiento</option>
                    <option value="reparacion">En Reparación</option>
                    <option value="baja">Dado de Baja</option>
                  </select>
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="observaciones">Observaciones</label>
                  <textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    rows="3"
                    placeholder="Notas adicionales sobre el producto"
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <Button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" loading={loading}>
                  {editingProducto ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Modal for POS */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-clipboard-check"></i>
                Generar Pedido de Productos
              </h2>
              <button className="modal-close" onClick={() => setShowOrderModal(false)}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="order-summary">
                <h3>Resumen del Pedido</h3>
                <div className="summary-items">
                  {cart.map(item => (
                    <div key={item.id} className="summary-item">
                      <span>{item.nombre}</span>
                      <span>{item.cantidad} unidades</span>
                    </div>
                  ))}
                </div>
                <div className="summary-total">
                  <strong>Total: {getTotalItems()} productos</strong>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateOrder(); }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="destinatario">Destinatario *</label>
                    <input
                      type="text"
                      id="destinatario"
                      value={orderData.destinatario}
                      onChange={(e) => setOrderData({...orderData, destinatario: e.target.value})}
                      required
                      placeholder="Nombre del responsable"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="departamento">Departamento</label>
                    <input
                      type="text"
                      id="departamento"
                      value={orderData.departamento}
                      onChange={(e) => setOrderData({...orderData, departamento: e.target.value})}
                      placeholder="Departamento o área"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="ubicacion_entrega">Ubicación de Entrega *</label>
                    <input
                      type="text"
                      id="ubicacion_entrega"
                      value={orderData.ubicacion_entrega}
                      onChange={(e) => setOrderData({...orderData, ubicacion_entrega: e.target.value})}
                      required
                      placeholder="Dirección o ubicación específica"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="telefono">Teléfono</label>
                    <input
                      type="tel"
                      id="telefono"
                      value={orderData.telefono}
                      onChange={(e) => setOrderData({...orderData, telefono: e.target.value})}
                      placeholder="Número de contacto"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prioridad">Prioridad</label>
                    <select
                      id="prioridad"
                      value={orderData.prioridad}
                      onChange={(e) => setOrderData({...orderData, prioridad: e.target.value})}
                    >
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fecha_necesaria">Fecha Necesaria</label>
                    <input
                      type="date"
                      id="fecha_necesaria"
                      value={orderData.fecha_necesaria}
                      onChange={(e) => setOrderData({...orderData, fecha_necesaria: e.target.value})}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="observaciones">Observaciones</label>
                    <textarea
                      id="observaciones"
                      value={orderData.observaciones}
                      onChange={(e) => setOrderData({...orderData, observaciones: e.target.value})}
                      rows="3"
                      placeholder="Instrucciones adicionales..."
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <Button type="button" onClick={() => setShowOrderModal(false)} className="btn-secondary">
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-primary" loading={loading}>
                    Generar Pedido
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Productos;
