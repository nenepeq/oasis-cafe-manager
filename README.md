# Oasis Café - Frontend

Gestión integral para Oasis Café. Incluye control de inventario, ventas, finanzas con gráficas interactivas y generación de tickets para WhatsApp.

## 🚀 Despliegue en Vercel

Este proyecto está optimizado para desplegarse en **Vercel**.

1. **Instalar Vercel CLI**: `npm i -g vercel`
2. **Desplegar**: Ejecuta `vercel` en la raíz del proyecto.
3. **Variables de Entorno**: Configura en el panel de Vercel:
   - `VITE_SUPABASE_URL`: URL de tu instancia de Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Llave pública anónima de Supabase.

El ruteo de SPA está manejado automáticamente por `vercel.json`.

## 🛠 Tecnologías

- **Fronend**: React 19 + Vite
- **Base de Datos & Auth**: Supabase
- **Gráficas**: Recharts
- **Iconos**: Lucide React

## 📦 Desarrollo Local

1. Instala dependencias: `npm install`
2. Configura el archivo `.env` con tus llaves de Supabase.
3. Inicia el servidor: `npm run dev`
4. Genera el build de producción: `npm run build`
