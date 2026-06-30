import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import { DataProvider } from './context/DataContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Log de errores no capturados (sin destruir el DOM)
window.addEventListener('error', (event) => {
  console.error('[Oasis Error]', event.message, event.filename, event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Oasis Unhandled Promise]', event.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
