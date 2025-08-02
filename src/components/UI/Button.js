import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon = null,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading ? 'btn-loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="loading" style={{ width: '16px', height: '16px' }}></div>
          <span>Cargando...</span>
        </>
      ) : (
        <>
          {icon && <i className={`mdi ${icon}`}></i>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
