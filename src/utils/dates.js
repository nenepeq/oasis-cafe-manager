/**
 * Utilidades de fecha y hora para zona horaria de México.
 * Centraliza helpers de fecha para evitar duplicación en el proyecto.
 */

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (Zona México).
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getMXDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

/**
 * Obtiene timestamp ISO ajustado a zona horaria de México.
 * Evita que registros nocturnos (después de las 6 PM) aparezcan como del día siguiente.
 * @returns {string} Timestamp ISO en zona horaria America/Mexico_City
 */
export const getMXTimestamp = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(new Date());
  const values = {};
  parts.forEach(({ type, value }) => {
    values[type] = value;
  });

  // Validación de seguridad
  if (!values.year || !values.month || !values.day) {
    return new Date().toISOString();
  }

  // Construir string ISO en zona horaria de México con desfase -06:00
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}-06:00`;
};
