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
        // Obtenemos el email del usuario para facilitar la lectura del log sin dependencias de joins.
        // Nota: Esto asume que el usuario ya está autenticado y tenemos su sesión.
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || 'desconocido';

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
            console.error('Error al registrar log de actividad:', error);
        }
    } catch (err) {
        console.error('Error inesperado en logActivity:', err);
    }
};
