// uiStyles.js
// SOLO estilos visuales – no lógica

export const colors = {
  primary: '#4a3728',
  secondary: '#8b6a55',
  background: '#fdfdfd',
  backgroundSoft: '#faf7f5',
  text: '#2f2f2f',
  textSecondary: '#6b6b6b',
  dangerSoft: '#fdecea',
  dangerText: '#a94442',
};

export const ui = {
  // CONTENEDOR GENERAL
  app: {
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
  },

  // CATEGORÍAS
  categoryButton: {
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.3px',
    color: colors.textSecondary,
    padding: '8px 10px',
    borderRadius: '10px',
  },

  // TARJETA PRODUCTO
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    cursor: 'pointer',
  },

  productName: {
    fontSize: '13.5px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '4px',
  },

  productPrice: {
    fontSize: '15px',
    fontWeight: '800',
    color: colors.primary,
  },

  // CARRITO
  cartContainer: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: '14px',
    padding: '10px',
  },

  cartItemName: {
    fontSize: '13px',
    fontWeight: '600',
    color: colors.text,
  },

  cartItemQty: {
    fontSize: '12px',
    color: colors.textSecondary,
  },

  cartItemSubtotal: {
    fontSize: '13px',
    fontWeight: '700',
    color: colors.text,
  },

  // TOTAL
  totalLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.textSecondary,
  },

  totalAmount: {
    fontSize: '18px',
    fontWeight: '900',
    color: colors.primary,
  },

  // BOTÓN COBRAR
  chargeButton: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    fontSize: '17px',
    fontWeight: '800',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    minHeight: '44px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  },

  // MODALES
  modal: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    padding: '14px',
  },

  modalTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: colors.primary,
    marginBottom: '10px',
  },

  modalText: {
    fontSize: '13px',
    color: colors.text,
  },

  // INVENTARIO BAJO
  lowStock: {
    backgroundColor: colors.dangerSoft,
    color: colors.dangerText,
    fontWeight: '700',
    borderRadius: '8px',
    padding: '4px 6px',
    fontSize: '12px',
  },

  normalStock: {
    fontSize: '12px',
    color: colors.text,
  },

  // BOTONES GENERALES
  button: {
    minHeight: '44px',
    fontSize: '14px',
    borderRadius: '12px',
    fontWeight: '600',
  },
};
