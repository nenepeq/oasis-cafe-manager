/**
 * Utilidades de sanitización de inputs para prevenir inyección de contenido.
 * Limpia strings antes de enviarlos a la base de datos.
 */

/**
 * Sanitiza un string de texto eliminando caracteres peligrosos.
 * Previene XSS y contenido malicioso en campos de texto libre.
 * 
 * @param {string} input - El string a sanitizar
 * @param {number} maxLength - Longitud máxima permitida (default 200)
 * @returns {string} String sanitizado
 */
export const sanitizeText = (input, maxLength = 200) => {
  if (!input || typeof input !== 'string') return '';

  return input
    // Eliminar tags HTML/script
    .replace(/<[^>]*>/g, '')
    // Eliminar caracteres de control (excepto newline y tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalizar espacios múltiples
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
    // Limitar longitud
    .slice(0, maxLength);
};

/**
 * Sanitiza un nombre (cliente, usuario, etc.)
 * Solo permite letras, números, espacios y acentos.
 * 
 * @param {string} name - Nombre a sanitizar
 * @returns {string} Nombre sanitizado
 */
export const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') return '';

  return name
    // Solo letras (incluyendo acentos), números, espacios, puntos y guiones
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.\-']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
};

/**
 * Sanitiza un concepto de gasto o descripción libre.
 * Más permisivo que sanitizeName pero sin HTML/scripts.
 * 
 * @param {string} text - Concepto a sanitizar
 * @returns {string} Concepto sanitizado
 */
export const sanitizeConcepto = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    // Eliminar tags HTML
    .replace(/<[^>]*>/g, '')
    // Permitir caracteres comunes en español + números + puntuación básica
    .replace(/[^\w\sáéíóúÁÉÍÓÚñÑüÜ.,;:()\-$#%&/+'"°]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
};
