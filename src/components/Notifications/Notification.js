import React, { useEffect, useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

const Notification = ({ id, title, message, type, duration }) => {
  const { removeNotification } = useNotification();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => removeNotification(id), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'mdi-check-circle';
      case 'error':
        return 'mdi-alert-circle';
      case 'warning':
        return 'mdi-alert';
      case 'info':
      default:
        return 'mdi-information';
    }
  };

  return (
    <div 
      className={`notification ${type} ${isVisible ? 'visible' : ''}`}
      style={{
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div className="notification-icon">
        <i className={`mdi ${getIcon()}`}></i>
      </div>
      <div className="notification-content">
        <h4 className="notification-title">{title}</h4>
        {message && <p className="notification-message">{message}</p>}
      </div>
      <button className="notification-close" onClick={handleClose}>
        <i className="mdi mdi-close"></i>
      </button>
    </div>
  );
};

export default Notification;
