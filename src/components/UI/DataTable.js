import React from 'react';
import './DataTable.css';

const DataTable = ({
  data = [],
  columns = [],
  actions = [],
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  emptyIcon = 'mdi-database',
  onRowClick = null,
  className = ''
}) => {
  if (loading) {
    return (
      <div className="data-table-container">
        <div className="data-table-loading">
          <div className="loading"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="data-table-container">
        <div className="no-data-message">
          <i className={`mdi ${emptyIcon}`}></i>
          <p>{emptyMessage}</p>
          <small>Los datos aparecerán aquí cuando estén disponibles</small>
        </div>
      </div>
    );
  }

  const handleRowClick = (row, index) => {
    if (onRowClick) {
      onRowClick(row, index);
    }
  };

  return (
    <div className={`data-table-container ${className}`}>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth || '80px',
                    maxWidth: column.maxWidth
                  }}
                >
                  <div className="th-content">
                    {column.icon && <i className={`mdi ${column.icon}`}></i>}
                    <span>{column.label || column.title}</span>
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th style={{ width: '180px', minWidth: '180px', textAlign: 'center' }}>
                  <div className="th-content">
                    <i className="mdi mdi-cog"></i>
                    <span>Acciones</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={row.id ? `${row.id}-${rowIndex}` : rowIndex}
                onClick={() => handleRowClick(row, rowIndex)}
                className={onRowClick ? 'clickable' : ''}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key || colIndex}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth || '80px',
                      maxWidth: column.maxWidth
                    }}
                  >
                    <div className="td-content">
                      {column.render ? column.render(row[column.key], row, rowIndex) : (row[column.key] || '-')}
                    </div>
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td style={{ textAlign: 'center', width: '180px', minWidth: '180px' }}>
                    <ActionButtons>
                      {actions
                        .filter(action => !action.condition || action.condition(row))
                        .map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          className={`btn btn-small ${action.className || 'btn-secondary'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (action.onClick) {
                              action.onClick(row, rowIndex);
                            }
                          }}
                          title={action.label}
                          disabled={action.disabled}
                        >
                          {action.icon && <i className={`mdi ${action.icon}`}></i>}
                          <span className="btn-text">{action.label}</span>
                        </button>
                      ))}
                    </ActionButtons>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table info footer */}
      <div className="table-footer">
        <div className="table-info">
          <span className="record-count">
            Mostrando {data.length} registro{data.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

// Helper component for action buttons in tables
export const ActionButtons = ({ children, className = '' }) => (
  <div className={`action-buttons ${className}`}>
    {children}
  </div>
);

// Helper component for status badges
export const StatusBadge = ({ status, className = '' }) => {
  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (['activo', 'active', 'completado', 'completed'].includes(statusLower)) {
      return 'status-active';
    }
    if (['inactivo', 'inactive', 'pendiente', 'pending'].includes(statusLower)) {
      return 'status-pending';
    }
    if (['suspendido', 'suspended', 'cancelado', 'cancelled'].includes(statusLower)) {
      return 'status-cancelled';
    }
    if (['en_proceso', 'processing'].includes(statusLower)) {
      return 'status-processing';
    }
    
    return 'status-default';
  };

  return (
    <span className={`badge ${getStatusClass(status)} ${className}`}>
      {status}
    </span>
  );
};

// Helper component for user info in tables
export const UserInfo = ({ user, showAvatar = true, showRole = false }) => {
  if (!user) return null;

  return (
    <div className="user-details">
      {showAvatar && (
        <div className="user-avatar">
          {user.nombre?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      )}
      <div className="user-info-content">
        <div className="user-name">{user.nombre || 'Sin nombre'}</div>
        {showRole && user.rol && (
          <div className="user-role">{user.rol}</div>
        )}
      </div>
    </div>
  );
};

export default DataTable;
