import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable, { ActionButtons, StatusBadge, UserInfo } from '../../components/UI/DataTable';
import Button from '../../components/UI/Button';
import ConnectionStatus from '../../components/UI/ConnectionStatus';
import useOfflineData from '../../hooks/useOfflineData';
import './Usuarios.css';

const Usuarios = () => {
  const { showSuccess, showError } = useNotification();

  // Usar el hook de persistencia offline
  const {
    data: usuarios,
    loading,
    error,
    fromCache,
    lastUpdated,
    refresh,
    createDocument,
    updateDocument,
    deleteDocument,
    isOnline,
    isOffline
  } = useOfflineData('usuarios', {
    orderBy: 'created_at',
    orderDirection: 'desc',
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealTime: true
  });

  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: '',
    estado: ''
  });
  const [createForm, setCreateForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'usuario'
  });



  // Manejar errores del hook
  useEffect(() => {
    if (error) {
      showError('Error', `Error cargando usuarios: ${error}`);
    }
  }, [error, showError]);

  const handleRefresh = () => {
    refresh();
    showSuccess('Actualizado', 'Lista de usuarios actualizada');
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setEditForm({
      nombre: usuario.displayName || usuario.nombre || '',
      email: usuario.email || '',
      password: '', // Dejar vacío para que el usuario pueda cambiarla
      rol: usuario.role || usuario.rol || '',
      estado: usuario.estado || 'activo'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      console.log('Editing user:', editingUser);
      console.log('Form data:', editForm);

      // Preparar datos de actualización
      const updateData = {
        nombre: editForm.nombre,
        email: editForm.email,
        rol: editForm.rol,
        estado: editForm.estado
      };

      // Solo incluir contraseña si se proporciona
      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password;
      }

      console.log(`🔄 Actualizando usuario ${editingUser.id} (${isOffline ? 'offline' : 'online'})`);

      // Usar el hook para manejar la actualización con persistencia offline
      await updateDocument(editingUser.id, updateData);

      showSuccess('Usuario Actualizado', `Usuario actualizado correctamente ${isOffline ? '(guardado offline)' : ''}`);
      setShowEditModal(false);
      setEditingUser(null);

    } catch (error) {
      console.error('Error updating user:', error);
      showError('Error', `Error al actualizar el usuario: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditForm({
      nombre: '',
      email: '',
      password: '',
      rol: '',
      estado: ''
    });
  };

  const handleCreateUser = async () => {
    try {
      const userData = {
        nombre: createForm.nombre,
        email: createForm.email,
        password: createForm.password,
        rol: createForm.rol,
        estado: 'activo'
      };

      console.log(`🔄 Creando usuario ${userData.email} (${isOffline ? 'offline' : 'online'})`);

      // Usar el hook para manejar la creación con persistencia offline
      await createDocument(userData);

      showSuccess('Usuario Creado', `Usuario creado correctamente ${isOffline ? '(guardado offline)' : ''}`);
      setShowCreateModal(false);
      setCreateForm({
        nombre: '',
        email: '',
        password: '',
        rol: 'usuario'
      });

    } catch (error) {
      console.error('Error creating user:', error);
      showError('Error', `Error al crear el usuario: ${error.message}`);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setCreateForm({
      nombre: '',
      email: '',
      password: '',
      rol: 'usuario'
    });
  };

  const handleDelete = async (usuario) => {
    const userName = usuario.displayName || usuario.nombre || 'este usuario';
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${userName}?`)) {
      try {
        console.log(`🗑️ Eliminando usuario ${usuario.id} (${isOffline ? 'offline' : 'online'})`);

        // Usar el hook para manejar la eliminación con persistencia offline
        await deleteDocument(usuario.id);

        showSuccess('Usuario Eliminado', `${userName} eliminado correctamente ${isOffline ? '(acción guardada offline)' : ''}`);

      } catch (error) {
        console.error('Error deleting user:', error);
        showError('Error', `Error al eliminar el usuario: ${error.message}`);
      }
    }
  };

  const handleChangeRole = async (usuario) => {
    const newRole = prompt(`Cambiar rol para ${usuario.displayName || usuario.nombre}\n\nRoles disponibles: administrador, tecnico, investigador, supervisor, usuario\n\nRol actual: ${usuario.role || usuario.rol || 'usuario'}\n\nIngrese el nuevo rol:`, usuario.role || usuario.rol || 'usuario');

    if (newRole && newRole !== (usuario.role || usuario.rol)) {
      const validRoles = ['administrador', 'tecnico', 'investigador', 'supervisor', 'usuario'];
      if (!validRoles.includes(newRole.toLowerCase())) {
        showError('Error', 'Rol inválido. Roles válidos: ' + validRoles.join(', '));
        return;
      }

      try {
        const updateData = { rol: newRole.toLowerCase() };

        console.log(`🔄 Cambiando rol de ${usuario.id} a ${newRole} (${isOffline ? 'offline' : 'online'})`);

        await updateDocument(usuario.id, updateData);

        showSuccess('Rol Actualizado', `Rol cambiado a ${newRole} ${isOffline ? '(guardado offline)' : ''}`);

      } catch (error) {
        console.error('Error changing role:', error);
        showError('Error', `Error al cambiar el rol: ${error.message}`);
      }
    }
  };

  const handleToggleStatus = async (usuario) => {
    const newStatus = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    if (window.confirm(`¿Cambiar el estado de ${usuario.displayName || usuario.nombre} a ${newStatus}?`)) {
      try {
        const updateData = { estado: newStatus };

        console.log(`🔄 Cambiando estado de ${usuario.id} a ${newStatus} (${isOffline ? 'offline' : 'online'})`);

        await updateDocument(usuario.id, updateData);

        showSuccess('Estado Actualizado', `Estado cambiado a ${newStatus} ${isOffline ? '(guardado offline)' : ''}`);

      } catch (error) {
        console.error('Error changing status:', error);
        showError('Error', `Error al cambiar el estado: ${error.message}`);
      }
    }
  };

  const columns = [
    {
      key: 'nombre',
      title: 'Usuario',
      render: (value, row) => (
        <UserInfo user={{...row, nombre: row.displayName || row.nombre}} showRole={true} />
      )
    },
    {
      key: 'email',
      title: 'Email',
      render: (value) => value || 'Sin email'
    },
    {
      key: 'rol',
      title: 'Rol',
      render: (value, row) => (
        <span className={`badge role-${row.role || row.rol || 'usuario'}`}>
          {row.role || row.rol || 'usuario'}
        </span>
      )
    },
    {
      key: 'estado',
      title: 'Estado',
      render: (value, row) => <StatusBadge status={row.estado || 'activo'} />
    },
    {
      key: 'created_at',
      title: 'Fecha Registro',
      render: (value, row) => {
        // Handle Firebase Auth metadata (production) or Firestore created_at (development)
        let dateValue = null;
        if (row.metadata && row.metadata.creationTime) {
          dateValue = row.metadata.creationTime;
        } else if (row.created_at) {
          dateValue = row.created_at.seconds ? row.created_at.seconds * 1000 : row.created_at;
        }

        if (!dateValue) return 'Sin fecha';
        try {
          const date = new Date(dateValue);
          return date.toLocaleDateString();
        } catch {
          return 'Fecha inválida';
        }
      }
    },
    {
      key: 'actions',
      title: 'Acciones',
      width: '200px',
      render: (value, row) => (
        <ActionButtons>
          <Button
            variant="secondary"
            size="small"
            icon="mdi-pencil"
            onClick={() => handleEdit(row)}
          >
            Editar
          </Button>
          <Button
            variant="warning"
            size="small"
            icon="mdi-shield-account"
            onClick={() => handleChangeRole(row)}
          >
            Cambiar Rol
          </Button>
          <Button
            variant="danger"
            size="small"
            icon="mdi-delete"
            onClick={() => handleDelete(row)}
          >
            Eliminar
          </Button>
        </ActionButtons>
      )
    }
  ];

  return (
    <div className="usuarios-page">
      <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-account-group"></i>
          <h1>Gestión de Usuarios</h1>
        </div>
        <div className="header-actions">
          <Button
            variant="info"
            icon="mdi-bug"
            onClick={() => {
              console.log('=== DEBUG INFO ===');
              console.log('Usuarios state:', usuarios);
              console.log('Loading state:', loading);
              console.log('Show edit modal:', showEditModal);
              console.log('=== END DEBUG ===');
            }}
          >
            Debug
          </Button>
          <Button
            variant="secondary"
            icon="mdi-refresh"
            onClick={handleRefresh}
            loading={loading}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            icon="mdi-account-plus"
            onClick={() => setShowCreateModal(true)}
          >
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Estado de Conexión y Persistencia Offline */}
      <ConnectionStatus />

      {/* Información adicional de caché y estado */}
      <div className="cache-info-bar">
        <span className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
          <i className={`mdi ${isOnline ? 'mdi-cloud-check' : 'mdi-cloud-off'}`}></i>
          {isOnline ? 'En línea' : 'Modo offline'}
        </span>
        {fromCache && (
          <span className="cache-indicator">
            <i className="mdi mdi-database"></i>
            Datos desde caché
          </span>
        )}
        {lastUpdated && (
          <span className="last-updated">
            <i className="mdi mdi-clock"></i>
            Actualizado: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <i className="mdi mdi-account-group"></i>
          </div>
          <div className="stat-content">
            <h3>{usuarios.length}</h3>
            <p>Total Usuarios</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon active">
            <i className="mdi mdi-account-check"></i>
          </div>
          <div className="stat-content">
            <h3>{usuarios.filter(u => (u.estado === 'activo') || (!u.estado)).length}</h3>
            <p>Usuarios Activos</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <i className="mdi mdi-account-alert"></i>
          </div>
          <div className="stat-content">
            <h3>{usuarios.filter(u => u.estado === 'inactivo').length}</h3>
            <p>Usuarios Inactivos</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <i className="mdi mdi-shield-account"></i>
          </div>
          <div className="stat-content">
            <h3>{usuarios.filter(u => (u.role === 'administrador') || (u.rol === 'administrador')).length}</h3>
            <p>Administradores</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Filtrar por Estado</label>
          <select className="form-select">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Filtrar por Rol</label>
          <select className="form-select">
            <option value="">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="tecnico">Técnico</option>
            <option value="investigador">Investigador</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Buscar</label>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre o email..."
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-section">
        <DataTable
        data={usuarios}
        columns={columns}
        loading={loading}
        emptyMessage="No hay usuarios registrados"
        emptyIcon="mdi-account-group"
        />
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Editar Usuario</h3>
              <button onClick={handleCancelEdit} className="close-button">
                <i className="mdi mdi-close"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nombre completo</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                  placeholder="Ingrese el nombre completo"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="Ingrese el email"
                />
              </div>

              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  value={editForm.password}
                  onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                  placeholder="Dejar vacío para mantener la actual"
                />
                <small style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                  Solo completar si desea cambiar la contraseña
                </small>
              </div>

              <div className="form-group">
                <label>Rol</label>
                <select
                  className="form-select"
                  value={editForm.rol}
                  onChange={(e) => setEditForm({...editForm, rol: e.target.value})}
                >
                  <option value="">Seleccionar rol</option>
                  <option value="administrador">Administrador</option>
                  <option value="tecnico">Técnico</option>
                  <option value="investigador">Investigador</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select
                  className="form-select"
                  value={editForm.estado}
                  onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={handleCancelEdit}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                loading={loading}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Crear Nuevo Usuario</h3>
              <button onClick={handleCancelCreate} className="close-button">
                <i className="mdi mdi-close"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nombre completo *</label>
                <input
                  type="text"
                  className="form-input"
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({...createForm, nombre: e.target.value})}
                  placeholder="Ingrese el nombre completo"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="Ingrese el email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contraseña *</label>
                <input
                  type="password"
                  className="form-input"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="Ingrese la contraseña (mínimo 6 caracteres)"
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label>Rol *</label>
                <select
                  className="form-select"
                  value={createForm.rol}
                  onChange={(e) => setCreateForm({...createForm, rol: e.target.value})}
                  required
                >
                  <option value="usuario">Usuario</option>
                  <option value="administrador">Administrador</option>
                  <option value="tecnico">Técnico</option>
                  <option value="investigador">Investigador</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={handleCancelCreate}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateUser}
                loading={loading}
                disabled={!createForm.nombre || !createForm.email || !createForm.password}
              >
                Crear Usuario
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Usuarios;
