import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import firebaseService from '../../services/FirebaseService';
import DataTable from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';

const Productos = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    categoria: '',
    precio_venta: '',
    precio_costo: '',
    existencia_actual: '',
    stock_minimo: '',
    descripcion: '',
    ubicacion_almacen: '',
    estado: 'activo'
  });

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('productos');
      if (result.success) {
        setProductos(result.data || []);
      } else {
        showError('Error', 'No se pudieron cargar los productos');
      }
    } catch (error) {
      console.error('Error loading productos:', error);
      showError('Error', 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.codigo || !formData.precio_venta) {
      showError('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      const productData = {
        ...formData,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        precio_costo: parseFloat(formData.precio_costo) || 0,
        existencia_actual: parseInt(formData.existencia_actual) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 0,
        updated_at: new Date()
      };

      if (editingProduct) {
        const result = await firebaseService.update('productos', editingProduct.id, productData);
        if (result.success) {
          showSuccess('Éxito', 'Producto actualizado correctamente');
        } else {
          showError('Error', 'No se pudo actualizar el producto');
        }
      } else {
        productData.created_at = new Date();
        const result = await firebaseService.create('productos', productData);
        if (result.success) {
          showSuccess('Éxito', 'Producto creado correctamente');
        } else {
          showError('Error', 'No se pudo crear el producto');
        }
      }

      await loadProductos();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving product:', error);
      showError('Error', 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre || '',
      codigo: product.codigo || '',
      categoria: product.categoria || '',
      precio_venta: product.precio_venta || '',
      precio_costo: product.precio_costo || '',
      existencia_actual: product.existencia_actual || '',
      stock_minimo: product.stock_minimo || '',
      descripcion: product.descripcion || '',
      ubicacion_almacen: product.ubicacion_almacen || '',
      estado: product.estado || 'activo'
    });
    setShowModal(true);
  };

  const handleDelete = async (product) => {
    if (window.confirm(`¿Estás seguro de eliminar el producto "${product.nombre}"?`)) {
      try {
        const result = await firebaseService.delete('productos', product.id);
        if (result.success) {
          showSuccess('Éxito', 'Producto eliminado correctamente');
          await loadProductos();
        } else {
          showError('Error', 'No se pudo eliminar el producto');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        showError('Error', 'Error al eliminar el producto');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      nombre: '',
      codigo: '',
      categoria: '',
      precio_venta: '',
      precio_costo: '',
      existencia_actual: '',
      stock_minimo: '',
      descripcion: '',
      ubicacion_almacen: '',
      estado: 'activo'
    });
  };

  const columns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría' },
    { 
      key: 'precio_venta', 
      label: 'Precio Venta',
      render: (value) => `$${(value || 0).toFixed(2)}`
    },
    { 
      key: 'existencia_actual', 
      label: 'Existencia',
      render: (value) => value || 0
    },
    { 
      key: 'stock_minimo', 
      label: 'Stock Mínimo',
      render: (value) => value || 0
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value) => (
        <span className={`status-badge ${value}`}>
          {value === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      )
    }
  ];

  const actions = [
    {
      label: 'Editar',
      icon: 'mdi-pencil',
      onClick: handleEdit,
      className: 'btn-secondary'
    },
    {
      label: 'Eliminar',
      icon: 'mdi-delete',
      onClick: handleDelete,
      className: 'btn-danger'
    }
  ];

  return (
    <div className="productos-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-package-variant"></i>
          <h1>Gestión de Productos</h1>
        </div>
        <div className="header-actions">
          <Button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            icon="mdi-plus"
          >
            Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="page-content">
        <DataTable
          data={productos}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          searchPlaceholder="Buscar productos..."
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="mdi mdi-package-variant"></i>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="mdi mdi-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="codigo">Código *</label>
                  <input
                    type="text"
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    required
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
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="categoria">Categoría</label>
                  <select
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="reactivos">Reactivos</option>
                    <option value="equipos">Equipos</option>
                    <option value="consumibles">Consumibles</option>
                    <option value="cristaleria">Cristalería</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="precio_venta">Precio de Venta *</label>
                  <input
                    type="number"
                    step="0.01"
                    id="precio_venta"
                    value={formData.precio_venta}
                    onChange={(e) => setFormData({...formData, precio_venta: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="precio_costo">Precio de Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    id="precio_costo"
                    value={formData.precio_costo}
                    onChange={(e) => setFormData({...formData, precio_costo: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="existencia_actual">Existencia Actual</label>
                  <input
                    type="number"
                    id="existencia_actual"
                    value={formData.existencia_actual}
                    onChange={(e) => setFormData({...formData, existencia_actual: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="stock_minimo">Stock Mínimo</label>
                  <input
                    type="number"
                    id="stock_minimo"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="ubicacion_almacen">Ubicación en Almacén</label>
                  <input
                    type="text"
                    id="ubicacion_almacen"
                    value={formData.ubicacion_almacen}
                    onChange={(e) => setFormData({...formData, ubicacion_almacen: e.target.value})}
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    rows="3"
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
                  </select>
                </div>
              </div>
              
              <div className="modal-actions">
                <Button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" loading={loading}>
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Productos;
