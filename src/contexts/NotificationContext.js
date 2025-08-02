import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((title, message = '', type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      title,
      message,
      type, // success, error, warning, info
      duration,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title, message = '', duration = 4000) => {
    return addNotification(title, message, 'success', duration);
  }, [addNotification]);

  const showError = useCallback((title, message = '', duration = 6000) => {
    return addNotification(title, message, 'error', duration);
  }, [addNotification]);

  const showWarning = useCallback((title, message = '', duration = 5000) => {
    return addNotification(title, message, 'warning', duration);
  }, [addNotification]);

  const showInfo = useCallback((title, message = '', duration = 5000) => {
    return addNotification(title, message, 'info', duration);
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
