import { supabase } from '../supabaseClient';

/**
 * Registra una actividad de usuario en la tabla activity_logs de Supabase.
 * 
 * @param {string} userId - ID del usuario que realiza la acción.
 * @param {string} action - Descripción breve de la acción (ej: 'CREACION_VENTA').
 * @param {string} category - Categoría de la acción (ej: 'VENTAS', 'INVENTARIO', 'FINANZAS').
 * @param {Object} details - Datos adicionales relevantes para la auditoría.
 */
export const logActivity = async (userId, action, category, details = {}) => {
    try {
        // Usar getSession() en lugar de getUser() para leer los datos de sesión localmente sin peticiones de red HTTP redundantes
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email || 'desconocido';

        const { error } = await supabase
            .from('activity_logs')
            .insert([
                {
                    user_id: userId,
                    user_email: userEmail,
                    action,
                    category,
                    details
                }
            ]);

        if (error) {
            console.error('Error al registrar log de actividad en Supabase:', error);
        }
    } catch (err) {
        console.error('Error inesperado en logActivity:', err);
    }
};
