import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import { DataProvider } from './context/DataContext.jsx'

// Capturar y mostrar errores de ejecución en pantalla para depuración
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; font-family: monospace; margin: 20px;">
        <h3 style="margin-top: 0;">Error de Ejecución (Runtime Error):</h3>
        <p><strong>Mensaje:</strong> ${event.message}</p>
        <p><strong>Archivo:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
        <pre style="white-space: pre-wrap; background: #fff; padding: 10px; border-radius: 4px; color: #333;">${event.error?.stack || ''}</pre>
      </div>
    `;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </ToastProvider>
  </StrictMode>,
)


