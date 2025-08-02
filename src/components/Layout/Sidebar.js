import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useConfig } from '../../contexts/ConfigContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { userData, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { config } = useConfig();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    inventory: false,
    equipment: false,
    products: false,
    admin: false
  });

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Handle sidebar collapse
  const handleToggleSidebar = () => {
    toggleSidebar();
    // Close all sections when collapsing
    if (!isCollapsed) {
      setExpandedSections({
        inventory: false,
        equipment: false,
        products: false,
        admin: false
      });
    }
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    if (isCollapsed) {
      // Si está colapsado, primero expandir el sidebar
      toggleSidebar();
      // Luego expandir la sección
      setTimeout(() => {
        setExpandedSections(prev => ({
          ...prev,
          [section]: true
        }));
      }, 100);
      return;
    }
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Check if current path matches link
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Check if any submenu item is active
  const isSubmenuActive = (paths) => {
    return paths.some(path => location.pathname === path);
  };

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'mdi-view-dashboard',
      path: '/dashboard',
      single: true
    },
    {
      id: 'inventory',
      title: 'Inventario',
      icon: 'mdi-flask-empty-outline',
      section: 'inventory',
      submenu: [
        { title: 'Insumos', icon: 'mdi-flask', path: '/insumos' },
        { title: 'Movimientos', icon: 'mdi-transfer', path: '/movimientos' },
        { title: 'Pedidos', icon: 'mdi-cart', path: '/pedidos' },
        { title: 'Registro Pedidos', icon: 'mdi-cart-plus', path: '/registro-pedidos' }
      ]
    },
    {
      id: 'equipment',
      title: 'Equipos',
      icon: 'mdi-cog-outline',
      section: 'equipment',
      submenu: [
        { title: 'Equipos', icon: 'mdi-cog', path: '/equipos' },
        { title: 'Historial', icon: 'mdi-history', path: '/historial-equipos' }
      ]
    },
    {
      id: 'products',
      title: 'Productos',
      icon: 'mdi-package-variant-closed',
      section: 'products',
      submenu: [
        { title: 'Productos', icon: 'mdi-package-variant', path: '/productos' },
        { title: 'Envíos', icon: 'mdi-truck', path: '/envios' }
      ]
    },
    {
      id: 'reports',
      title: 'Reportes',
      icon: 'mdi-chart-line',
      path: '/reportes',
      single: true
    }
  ];

  const adminMenuItems = [
    {
      id: 'admin',
      title: 'Administración',
      icon: 'mdi-shield-account-outline',
      section: 'admin',
      submenu: [
        { title: 'Usuarios', icon: 'mdi-account-group', path: '/usuarios', adminOnly: true },
        { title: 'Configuración', icon: 'mdi-cog', path: '/configuracion', adminOnly: true },
        { title: 'Ajustes del Sistema', icon: 'mdi-tune', path: '/ajustes', adminOnly: true },
        { title: 'Migración de Datos', icon: 'mdi-database-sync', path: '/migracion', adminOnly: true }
      ]
    }
  ];

  const userMenuItems = [
    { title: 'Perfil', icon: 'mdi-account', path: '/perfil' }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleMobileSidebar}
        style={{
          display: 'none',
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1100,
          background: 'var(--accent-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          cursor: 'pointer'
        }}
      >
        <i className="mdi mdi-menu"></i>
      </button>

      {/* Sidebar Container */}
      <div
        id="sidebar-container"
        className={`sidebar-container ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      >
        <div id="sidebar" className="sidebar">
          {/* Header */}
          <div className="sidebar-header">
            <div className="logo-section">
              <i className={`mdi ${config?.logoIcon || 'mdi-beaker-outline'} logo-icon`}></i>
              {!isCollapsed && (
                <div className="logo-text-container">
                  {config?.companyName && config.companyName !== 'LabFlow' ? (
                    <>
                      <span className="company-name">{config.companyName}</span>
                      <span className="powered-by">by LabFlow</span>
                    </>
                  ) : (
                    <span className="logo-text">LabFlow</span>
                  )}
                </div>
              )}
            </div>
            {/* Collapse button - solo visible en desktop */}
            <button
              className="collapse-btn desktop-only"
              onClick={handleToggleSidebar}
              title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              <i className={`mdi ${isCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'}`}></i>
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="theme-toggle-section">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <i className={`mdi ${theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'}`}></i>
              {!isCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
            </button>
          </div>

          {/* Main Content */}
          <div className="sidebar-content">
            <ul className="main-menu">
              {/* Main Menu Items */}
              {menuItems.map(item => (
                <li key={item.id}>
                  {item.single ? (
                    <Link
                      to={item.path}
                      className={isActive(item.path) ? 'active' : ''}
                      title={isCollapsed ? item.title : ''}
                    >
                      <i className={`mdi ${item.icon}`}></i>
                      {!isCollapsed && <span>{item.title}</span>}
                    </Link>
                  ) : (
                    <>
                      <div className="menu-section">
                        <div
                          className={`menu-section-header ${expandedSections[item.section] || isSubmenuActive(item.submenu.map(sub => sub.path)) ? 'active' : ''}`}
                          onClick={() => toggleSection(item.section)}
                          title={isCollapsed ? item.title : ''}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <i className={`mdi ${item.icon}`}></i>
                            {!isCollapsed && <span>{item.title}</span>}
                          </div>
                          {!isCollapsed && <i className="mdi mdi-chevron-down dropdown-arrow"></i>}
                        </div>
                        {!isCollapsed && (
                          <ul className="submenu">
                            {item.submenu.map(subItem => (
                              <li key={subItem.path}>
                                <Link
                                  to={subItem.path}
                                  className={isActive(subItem.path) ? 'active' : ''}
                                >
                                  <i className={`mdi ${subItem.icon}`}></i>
                                  <span>{subItem.title}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}

              {/* Admin Menu Items */}
              {(() => {
                const isAdmin = userData?.rol === 'administrador' || userData?.role === 'administrador';
                console.log('🔍 Debug Sidebar - Usuario:', userData?.nombre, 'Rol:', userData?.rol, 'Role:', userData?.role, 'Es Admin:', isAdmin);
                return isAdmin;
              })() && adminMenuItems.map(item => (
                <li key={item.id}>
                  <div className="menu-section">
                    <div
                      className={`menu-section-header ${expandedSections[item.section] || isSubmenuActive(item.submenu.map(sub => sub.path)) ? 'active' : ''}`}
                      onClick={() => toggleSection(item.section)}
                      title={isCollapsed ? item.title : ''}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <i className={`mdi ${item.icon}`}></i>
                        {!isCollapsed && <span>{item.title}</span>}
                      </div>
                      {!isCollapsed && <i className="mdi mdi-chevron-down dropdown-arrow"></i>}
                    </div>
                    {!isCollapsed && (
                      <ul className="submenu">
                        {item.submenu.map(subItem => {
                          const isAdmin = userData?.rol === 'administrador' || userData?.role === 'administrador';
                          const shouldShow = !subItem.adminOnly || isAdmin;
                          console.log('🔍 Debug Subitem:', subItem.title, 'AdminOnly:', subItem.adminOnly, 'IsAdmin:', isAdmin, 'ShouldShow:', shouldShow);

                          return shouldShow ? (
                            <li key={subItem.path}>
                              <Link
                                to={subItem.path}
                                className={isActive(subItem.path) ? 'active' : ''}
                              >
                                <i className={`mdi ${subItem.icon}`}></i>
                                <span>{subItem.title}</span>
                              </Link>
                            </li>
                          ) : null;
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              ))}

              {/* User Menu Items */}
              {userMenuItems.map(item => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={isActive(item.path) ? 'active' : ''}
                    title={isCollapsed ? item.title : ''}
                  >
                    <i className={`mdi ${item.icon}`}></i>
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                </li>
              ))}
            </ul>

            {/* User Info */}
            <div className="user-info">
              <div className="user-avatar">
                {userData?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {!isCollapsed && (
                <div className="user-details">
                  <div className="user-name">{userData?.nombre || 'Usuario'}</div>
                  <div className="user-role">{userData?.rol || 'Sin rol'}</div>
                </div>
              )}
              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Cerrar sesión"
              >
                <i className="mdi mdi-logout"></i>
                {!isCollapsed && <span>Cerrar Sesión</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
