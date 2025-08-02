import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import firebaseService from '../../services/FirebaseService';
import Button from '../../components/UI/Button';

const Perfil = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const { userData, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('perfil');
  const [profileData, setProfileData] = useState({
    nombre: '',
    nombre_usuario: '',
    email: '',
    telefono: '',
    departamento: '',
    cargo: '',
    fecha_ingreso: '',
    avatar: '',
    biografia: '',
    especialidades: '',
    certificaciones: ''
  });
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferencesData, setPreferencesData] = useState({
    tema: 'light',
    idioma: 'es',
    notificaciones_email: true,
    notificaciones_push: true,
    mostrar_ayuda: true,
    formato_fecha: 'dd/mm/yyyy',
    zona_horaria: 'America/Mexico_City'
  });
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    if (userData) {
      loadProfileData();
      loadUserActivity();
    }
  }, [userData]);

  const loadProfileData = () => {
    setProfileData({
      nombre: userData.nombre || '',
      nombre_usuario: userData.nombre_usuario || '',
      email: userData.email || '',
      telefono: userData.telefono || '',
      departamento: userData.departamento || '',
      cargo: userData.cargo || '',
      fecha_ingreso: userData.fecha_ingreso ? new Date(userData.fecha_ingreso.seconds * 1000).toISOString().split('T')[0] : '',
      avatar: userData.avatar || '',
      biografia: userData.biografia || '',
      especialidades: userData.especialidades || '',
      certificaciones: userData.certificaciones || ''
    });

    setPreferencesData({
      tema: userData.preferencias?.tema || 'light',
      idioma: userData.preferencias?.idioma || 'es',
      notificaciones_email: userData.preferencias?.notificaciones_email !== false,
      notificaciones_push: userData.preferencias?.notificaciones_push !== false,
      mostrar_ayuda: userData.preferencias?.mostrar_ayuda !== false,
      formato_fecha: userData.preferencias?.formato_fecha || 'dd/mm/yyyy',
      zona_horaria: userData.preferencias?.zona_horaria || 'America/Mexico_City'
    });
  };

  const loadUserActivity = async () => {
    try {
      // Load user's recent activity from various collections
      const [movimientos, registros, historial] = await Promise.all([
        firebaseService.getAll('movimientos'),
        firebaseService.getAll('registro_pedidos'),
        firebaseService.getAll('historial_equipos')
      ]);

      const activities = [];

      if (movimientos.success) {
        const userMovimientos = movimientos.data?.filter(m => m.usuario_id === userData.id) || [];
        activities.push(...userMovimientos.map(m => ({
          tipo: 'movimiento',
          descripcion: `${m.tipo_movimiento} de ${m.cantidad} unidades`,
          fecha: m.fecha_movimiento,
          modulo: 'Inventario'
        })));
      }

      if (registros.success) {
        const userRegistros = registros.data?.filter(r => r.usuario_id === userData.id) || [];
        activities.push(...userRegistros.map(r => ({
          tipo: 'registro',
          descripcion: `${r.accion} en pedido`,
          fecha: r.fecha_registro,
          modulo: 'Pedidos'
        })));
      }

      if (historial.success) {
        const userHistorial = historial.data?.filter(h => h.usuario_id === userData.id) || [];
        activities.push(...userHistorial.map(h => ({
          tipo: 'equipo',
          descripcion: `${h.tipo_evento} en equipo`,
          fecha: h.fecha_evento,
          modulo: 'Equipos'
        })));
      }

      // Sort by date and take last 20
      activities.sort((a, b) => new Date(b.fecha?.seconds * 1000) - new Date(a.fecha?.seconds * 1000));
      setActivityData(activities.slice(0, 20));
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedData = {
        ...profileData,
        fecha_ingreso: profileData.fecha_ingreso || null,
        updated_at: new Date()
      };

      const result = await firebaseService.update('usuarios', userData.id, updatedData);
      if (result.success) {
        updateUserData(updatedData);
        showSuccess('Éxito', 'Perfil actualizado correctamente');
      } else {
        showError('Error', 'No se pudo actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error', 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // Validar que se haya ingresado nueva contraseña
    if (!securityData.newPassword) {
      showError('Error', 'Debe ingresar una nueva contraseña');
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      showError('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (securityData.newPassword.length < 6) {
      showError('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Solo verificar contraseña actual si el usuario la tiene configurada
      if (userData.password && securityData.currentPassword && userData.password !== securityData.currentPassword) {
        showError('Error', 'La contraseña actual es incorrecta');
        setLoading(false);
        return;
      }

      console.log('Updating password for user:', userData.id);
      const result = await firebaseService.update('usuarios', userData.id, {
        password: securityData.newPassword,
        updated_at: new Date()
      });

      console.log('Password update result:', result);

      if (result.success) {
        showSuccess('Éxito', 'Contraseña actualizada correctamente');
        // Actualizar datos del usuario en el contexto
        updateUserData({ password: securityData.newPassword });

        setSecurityData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showError('Error', result.error || 'No se pudo actualizar la contraseña');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      showError('Error', 'Error al actualizar la contraseña: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await firebaseService.update('usuarios', userData.id, {
        preferencias: preferencesData,
        updated_at: new Date()
      });

      if (result.success) {
        updateUserData({ preferencias: preferencesData });
        showSuccess('Éxito', 'Preferencias actualizadas correctamente');
        
        // Apply theme change immediately
        if (preferencesData.tema !== userData.preferencias?.tema) {
          document.body.setAttribute('data-theme', preferencesData.tema);
        }
      } else {
        showError('Error', 'No se pudieron actualizar las preferencias');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      showError('Error', 'Error al actualizar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const generateAvatarUrl = (name) => {
    const initials = name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=2563eb&color=fff&size=150`;
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      administrador: 'mdi-shield-crown',
      tecnico: 'mdi-wrench',
      investigador: 'mdi-microscope',
      supervisor: 'mdi-account-supervisor'
    };
    return roleIcons[role] || 'mdi-account';
  };

  const getActivityIcon = (tipo) => {
    const icons = {
      movimiento: 'mdi-transfer',
      registro: 'mdi-cart-plus',
      equipo: 'mdi-cog'
    };
    return icons[tipo] || 'mdi-information';
  };

  return (
    <div className="perfil-page">
      <div className="page-header">
        <div className="page-title">
          <i className="mdi mdi-account"></i>
          <h1>Mi Perfil</h1>
        </div>
      </div>

      {/* Profile Header */}
      <div className="profile-header" style={{
        padding: '2rem',
        background: 'var(--background-primary)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        border: '1px solid var(--border-color)'
      }}>
        <div className="avatar-section">
          <img
            src={profileData.avatar || generateAvatarUrl(profileData.nombre)}
            alt="Avatar"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '3px solid var(--primary-color)'
            }}
          />
        </div>
        <div className="profile-info" style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {profileData.nombre || 'Usuario'}
            <i className={getRoleIcon(userData?.rol)} style={{ color: 'var(--primary-color)' }}></i>
          </h2>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>
            {userData?.rol || 'Sin rol'} • {profileData.departamento || 'Sin departamento'}
          </p>
          <p style={{ margin: '0', color: 'var(--text-secondary)' }}>
            <i className="mdi mdi-email"></i> {profileData.email}
          </p>
          {profileData.telefono && (
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
              <i className="mdi mdi-phone"></i> {profileData.telefono}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs" style={{ marginBottom: '2rem' }}>
        <div className="tab-buttons" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
          {[
            { id: 'perfil', label: 'Información Personal', icon: 'mdi-account' },
            { id: 'seguridad', label: 'Seguridad', icon: 'mdi-lock' },
            { id: 'preferencias', label: 'Preferencias', icon: 'mdi-cog' },
            { id: 'actividad', label: 'Actividad Reciente', icon: 'mdi-history' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content" style={{
        padding: '2rem',
        background: 'var(--background-primary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)'
      }}>
        {activeTab === 'perfil' && (
          <form onSubmit={handleProfileUpdate}>
            <h3 style={{ marginBottom: '1.5rem' }}>Información Personal</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nombre">Nombre Completo</label>
                <input
                  type="text"
                  id="nombre"
                  value={profileData.nombre}
                  onChange={(e) => setProfileData({...profileData, nombre: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="nombre_usuario">Nombre de Usuario</label>
                <input
                  type="text"
                  id="nombre_usuario"
                  value={profileData.nombre_usuario}
                  onChange={(e) => setProfileData({...profileData, nombre_usuario: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="tel"
                  id="telefono"
                  value={profileData.telefono}
                  onChange={(e) => setProfileData({...profileData, telefono: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="departamento">Departamento</label>
                <input
                  type="text"
                  id="departamento"
                  value={profileData.departamento}
                  onChange={(e) => setProfileData({...profileData, departamento: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="cargo">Cargo</label>
                <input
                  type="text"
                  id="cargo"
                  value={profileData.cargo}
                  onChange={(e) => setProfileData({...profileData, cargo: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="fecha_ingreso">Fecha de Ingreso</label>
                <input
                  type="date"
                  id="fecha_ingreso"
                  value={profileData.fecha_ingreso}
                  onChange={(e) => setProfileData({...profileData, fecha_ingreso: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="avatar">URL de Avatar</label>
                <input
                  type="url"
                  id="avatar"
                  value={profileData.avatar}
                  onChange={(e) => setProfileData({...profileData, avatar: e.target.value})}
                />
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="biografia">Biografía</label>
                <textarea
                  id="biografia"
                  value={profileData.biografia}
                  onChange={(e) => setProfileData({...profileData, biografia: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="especialidades">Especialidades</label>
                <textarea
                  id="especialidades"
                  value={profileData.especialidades}
                  onChange={(e) => setProfileData({...profileData, especialidades: e.target.value})}
                  rows="2"
                />
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="certificaciones">Certificaciones</label>
                <textarea
                  id="certificaciones"
                  value={profileData.certificaciones}
                  onChange={(e) => setProfileData({...profileData, certificaciones: e.target.value})}
                  rows="2"
                />
              </div>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <Button type="submit" className="btn-primary" loading={loading}>
                Actualizar Perfil
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'seguridad' && (
          <form onSubmit={handlePasswordChange}>
            <h3 style={{ marginBottom: '1.5rem' }}>Cambiar Contraseña</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="currentPassword">Contraseña Actual</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={securityData.currentPassword}
                  onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">Nueva Contraseña</label>
                <input
                  type="password"
                  id="newPassword"
                  value={securityData.newPassword}
                  onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={securityData.confirmPassword}
                  onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <Button type="submit" className="btn-primary" loading={loading}>
                Cambiar Contraseña
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'preferencias' && (
          <form onSubmit={handlePreferencesUpdate}>
            <h3 style={{ marginBottom: '1.5rem' }}>Preferencias de Usuario</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="tema">Tema</label>
                <select
                  id="tema"
                  value={preferencesData.tema}
                  onChange={(e) => setPreferencesData({...preferencesData, tema: e.target.value})}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="idioma">Idioma</label>
                <select
                  id="idioma"
                  value={preferencesData.idioma}
                  onChange={(e) => setPreferencesData({...preferencesData, idioma: e.target.value})}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="formato_fecha">Formato de Fecha</label>
                <select
                  id="formato_fecha"
                  value={preferencesData.formato_fecha}
                  onChange={(e) => setPreferencesData({...preferencesData, formato_fecha: e.target.value})}
                >
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="zona_horaria">Zona Horaria</label>
                <select
                  id="zona_horaria"
                  value={preferencesData.zona_horaria}
                  onChange={(e) => setPreferencesData({...preferencesData, zona_horaria: e.target.value})}
                >
                  <option value="America/Mexico_City">México</option>
                  <option value="America/New_York">Estados Unidos (Este)</option>
                  <option value="America/Los_Angeles">Estados Unidos (Oeste)</option>
                  <option value="Europe/Madrid">España</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={preferencesData.notificaciones_email}
                    onChange={(e) => setPreferencesData({...preferencesData, notificaciones_email: e.target.checked})}
                  />
                  Notificaciones por Email
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={preferencesData.notificaciones_push}
                    onChange={(e) => setPreferencesData({...preferencesData, notificaciones_push: e.target.checked})}
                  />
                  Notificaciones Push
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={preferencesData.mostrar_ayuda}
                    onChange={(e) => setPreferencesData({...preferencesData, mostrar_ayuda: e.target.checked})}
                  />
                  Mostrar Ayuda y Tutoriales
                </label>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <Button type="submit" className="btn-primary" loading={loading}>
                Guardar Preferencias
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'actividad' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem' }}>Actividad Reciente</h3>
            {activityData.length > 0 ? (
              <div className="activity-list">
                {activityData.map((activity, index) => (
                  <div key={index} className="activity-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color-light)',
                    '&:last-child': { borderBottom: 'none' }
                  }}>
                    <div className="activity-icon" style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--primary-color)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className={getActivityIcon(activity.tipo)}></i>
                    </div>
                    <div className="activity-content" style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{activity.descripcion}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {activity.modulo} • {activity.fecha ? new Date(activity.fecha.seconds * 1000).toLocaleString() : 'Fecha desconocida'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <i className="mdi mdi-history" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
                <p>No hay actividad reciente registrada</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Perfil;
