import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfig } from '../../contexts/ConfigContext';
import './Login.css';

const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const { showError, showSuccess } = useNotification();
  const { theme, toggleTheme, isDark } = useTheme();
  const { config } = useConfig();
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.emailOrUsername || !formData.password) {
      showError('Error', 'Por favor completa todos los campos');
      return;
    }

    console.log('=== LOGIN FORM SUBMISSION ===');
    console.log('Form data:', {
      emailOrUsername: formData.emailOrUsername,
      password: formData.password,
      passwordLength: formData.password?.length,
      rememberMe: formData.rememberMe
    });

    setIsLoading(true);

    try {
      // Use AuthContext login which handles both Firebase and direct authentication
      const result = await login(
        formData.emailOrUsername,
        formData.password,
        formData.rememberMe
      );

      if (result.success) {
        showSuccess('¡Bienvenido!', 'Has iniciado sesión correctamente');
        // AuthContext will handle the state update, no need to redirect manually
        return;
      } else {
        showError('Error de inicio de sesión', result.error || 'Credenciales incorrectas');
      }

    } catch (error) {
      console.error('Login submission error:', error);
      showError('Error', 'Ha ocurrido un error inesperado: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="login-loading">
        <div className="loading"></div>
        <p>Inicializando aplicación...</p>
        <small>Verificando Firebase y preparando autenticación...</small>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-background">
        <div className="particles">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className="particle" 
              style={{
                top: `${10 + i * 15}%`,
                left: `${10 + (i % 3) * 30}%`,
                width: `${4 + i}px`,
                height: `${4 + i}px`,
                animationDelay: `${i}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="login-container">
        {/* Theme Toggle */}
        <div className="theme-toggle-container">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
          >
            <i className={`mdi ${isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'}`}></i>
            <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>

        {/* App Brand */}
        <div className="app-brand">
          <i className={`mdi ${config?.logoIcon || 'mdi-beaker-outline'} logo-icon`}></i>
          <h1>
            {config?.companyName && config.companyName !== 'LabFlow'
              ? config.companyName
              : 'LabFlow Manager'
            }
          </h1>
          <p className="app-subtitle">
            {config?.logoType === 'hospital' && 'Sistema de Gestión Hospitalaria'}
            {config?.logoType === 'clinica' && 'Sistema de Gestión Clínica'}
            {config?.logoType === 'farmacia' && 'Sistema de Gestión de Farmacia'}
            {config?.logoType === 'veterinaria' && 'Sistema de Gestión Veterinaria'}
            {config?.logoType === 'dentista' && 'Sistema de Gestión Dental'}
            {config?.logoType === 'investigacion' && 'Sistema de Gestión de Investigación'}
            {(!config?.logoType || config?.logoType === 'laboratorio') && 'Sistema de Gestión de Laboratorio'}
          </p>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="emailOrUsername">Email o Nombre de Usuario</label>
            <div className="input-container">
              <i className="fas fa-user input-icon"></i>
              <input
                type="text"
                id="emailOrUsername"
                name="emailOrUsername"
                value={formData.emailOrUsername}
                onChange={handleInputChange}
                required
                placeholder="Ingresa tu usuario o email"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-container">
              <i className="fas fa-lock input-icon"></i>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={(e) => console.log('Password field value on blur:', e.target.value, 'Length:', e.target.value.length)}
                required
                placeholder="••••••��•"
                disabled={isLoading}
                autoComplete="current-password"
                spellCheck="false"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>

          <div className="form-options">
            <div className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <label htmlFor="rememberMe">Recordarme</label>
            </div>
            <button type="button" className="forgot-password">¿Olvidaste tu contraseña?</button>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading" style={{ width: '16px', height: '16px' }}></div>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">login</span>
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>



        {/* Footer */}
        <div className="footer">
          &copy; 2024 LabFlow Manager
        </div>
      </div>
    </div>
  );
};

export default Login;
