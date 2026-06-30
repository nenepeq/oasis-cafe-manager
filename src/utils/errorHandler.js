/**
 * Utilidades de manejo de errores para consistencia en la aplicación.
 * Provee un wrapper para operaciones async y un handler centralizado.
 */

/**
 * Wrapper para operaciones de Supabase que normaliza el manejo de errores.
 * En vez de verificar `if (error)` en cada llamada, este wrapper:
 * - Captura excepciones no manejadas
 * - Normaliza el formato de error
 * - Loguea consistentemente
 * 
 * @param {Function} operation - Función async que ejecuta la operación
 * @param {string} context - Descripción de la operación para logs
 * @returns {{ data: any, error: { message: string } | null }}
 * 
 * @example
 * const { data, error } = await safeAsync(
 *   () => apiService.insertSaleWithItems(saleData, items),
 *   'Registrar venta'
 * );
 */
export const safeAsync = async (operation, context = 'operación') => {
  try {
    const result = await operation();

    // Si Supabase devuelve un error en el objeto result
    if (result?.error) {
      console.error(`[${context}] Error de Supabase:`, result.error);
      return {
        data: null,
        error: {
          message: result.error.message || result.error.details || `Error en ${context}`,
          code: result.error.code,
          original: result.error
        }
      };
    }

    return { data: result?.data ?? result, error: null };
  } catch (err) {
    console.error(`[${context}] Excepción no manejada:`, err);
    return {
      data: null,
      error: {
        message: err?.message || `Error inesperado en ${context}`,
        code: 'UNHANDLED_ERROR',
        original: err
      }
    };
  }
};

/**
 * Formatea un error para mostrar al usuario.
 * Convierte errores técnicos en mensajes entendibles.
 * 
 * @param {any} error - Error de Supabase, excepción, o string
 * @returns {string} Mensaje amigable para el usuario
 */
export const formatUserError = (error) => {
  if (!error) return 'Error desconocido';
  if (typeof error === 'string') return error;

  const message = error.message || error.details || '';

  // Mapear errores comunes a mensajes en español
  if (message.includes('duplicate key')) return 'Este registro ya existe';
  if (message.includes('violates foreign key')) return 'No se puede eliminar: hay registros dependientes';
  if (message.includes('permission denied') || message.includes('row-level security')) {
    return 'No tienes permisos para esta acción';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Error de conexión. Verifica tu internet';
  }
  if (message.includes('JWT expired') || message.includes('token')) {
    return 'Tu sesión expiró. Inicia sesión de nuevo';
  }

  return message || 'Ocurrió un error inesperado';
};
