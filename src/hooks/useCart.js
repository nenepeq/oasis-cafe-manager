import { useState } from 'react';
import { useToast } from './useToast.jsx';

/**
 * Hook personalizado para manejar el estado y la lógica de negocio del carrito de ventas
 * aplicando el principio de Responsabilidad Única (SRP).
 * 
 * @param {Array} inventoryList - Lista del stock actual en el inventario para validaciones de disponibilidad.
 * @returns {Object} Lógica y estado del carrito de ventas.
 */
export const useCart = (inventoryList = []) => {
  const [cart, setCart] = useState([]);
  const { showToast } = useToast();

  /**
   * Añade un producto al carrito validando el stock disponible.
   */
  const addToCart = (product) => {
    const inventoryItem = inventoryList.find(inv => inv.product_id === product.id);
    const totalStock = inventoryItem ? inventoryItem.stock : 0;
    const itemInCart = cart.find(i => i.id === product.id);
    const qtyInCart = itemInCart ? itemInCart.quantity : 0;

    if (qtyInCart + 1 > totalStock) {
      showToast(`⚠️ FUERA DE STOCK: Solo quedan ${totalStock - qtyInCart} unidades de ${product.name}`, 'warning');
      return;
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  /**
   * Elimina un producto por completo del carrito.
   */
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  /**
   * Actualiza la cantidad de un producto sumando o restando (delta).
   */
  const updateCartQty = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.id !== productId));
      return;
    }

    if (delta > 0) {
      const inventoryItem = inventoryList.find(inv => inv.product_id === productId);
      const totalStock = inventoryItem ? inventoryItem.stock : 0;
      if (newQty > totalStock) {
        showToast(`⚠️ FUERA DE STOCK: Solo quedan ${totalStock} unidades`, 'warning');
        return;
      }
    }

    setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity: newQty } : i));
  };

  /**
   * Limpia todos los elementos del carrito.
   */
  const clearCart = () => setCart([]);

  return {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateCartQty,
    clearCart
  };
};
