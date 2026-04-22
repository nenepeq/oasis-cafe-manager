import React, { useEffect, useState } from 'react';
import './Toast.css';

/**
 * Componente Visual de Toast
 * Presenta una notificación elegante con efectos de transición.
 */
const Toast = ({ message, type = 'info', onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Iniciamos la animación de salida un poco antes de que se desmonte
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 2700); // 300ms antes del default de 3s

    return () => clearTimeout(timer);
  }, []);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div 
      className={`toast-item ${type} ${isExiting ? 'exit' : 'enter'}`}
      onClick={() => {
        setIsExiting(true);
        setTimeout(onClose, 300);
      }}
    >
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
      <button className="toast-close-btn">&times;</button>
      <div className="toast-progress-bar"></div>
    </div>
  );
};

export default Toast;
