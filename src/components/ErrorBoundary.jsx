import React from 'react';

/**
 * Error Boundary para capturar errores de renderizado en React.
 * Muestra un UI de recuperación en vez de destruir toda la app.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log para depuración (en producción se enviaría a un servicio de monitoreo)
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: "'Inter', system-ui, sans-serif",
          backgroundColor: '#f8f6f2',
          color: '#4a3728'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            padding: '30px',
            borderRadius: '16px',
            backgroundColor: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>☕</div>
            <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '700' }}>
              Algo salió mal
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              Ocurrió un error inesperado. Puedes intentar recuperar la sesión o recargar la página.
            </p>

            {this.state.error && (
              <details style={{
                textAlign: 'left',
                marginBottom: '20px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                fontSize: '12px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#991b1b' }}>
                  Detalles del error
                </summary>
                <pre style={{
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#7f1d1d',
                  fontSize: '11px'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fff',
                  color: '#4a3728',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Reintentar
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#27ae60',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
