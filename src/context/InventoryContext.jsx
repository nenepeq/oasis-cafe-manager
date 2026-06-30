import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as apiService from '../services/apiService';
import { useToast } from '../hooks/useToast.jsx';
import { compressImage } from '../utils/imageOptimizer';
import { useAuth } from './AuthContext';

const InventoryContext = createContext();

/**
 * Contexto de Inventario y Productos.
 * Gestiona: lista de productos, stock, categorías, subida de imágenes.
 */
export const InventoryProvider = ({ children }) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [inventoryList, setInventoryList] = useState([]);

  // Categorías base (siempre visibles)
  const baseCategories = [
    'Bebidas Calientes', 'Alimentos', 'Frappés',
    'Bebidas Frías', 'Refrescos', 'Postres', 'Sabritas y Otros'
  ];

  // Categorías Dinámicas (Base + las que vengan de DB)
  const categories = useMemo(() => {
    const prodCats = products.map(p => p.category).filter(Boolean);
    const uniqueCats = new Set([...baseCategories, ...prodCats]);
    return ['Todos', ...Array.from(uniqueCats).sort()];
  }, [products]);

  const fetchProducts = async () => {
    const res = await apiService.getProducts();
    if (res.error) setFetchError(res.error.message);
    else { setProducts(res.data || []); setFetchError(null); }
  };

  const fetchInventory = async () => {
    const { data, error } = await apiService.getInventory();
    if (!error && data) {
      const sortedData = data.sort((a, b) =>
        (a.products?.name || "").localeCompare(b.products?.name || "", 'es', { sensitivity: 'base' })
      );
      setInventoryList(sortedData);
    }
  };

  // Sube una imagen al bucket de Supabase Storage
  const uploadTicketImage = async (file, folder = 'general') => {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      let fileToUpload = file;
      try {
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
      } catch (optErr) {
        console.warn('Falló optimización de imagen, subiendo original:', optErr);
      }

      const { error } = await apiService.uploadFile('tickets', fileName, fileToUpload);
      if (error) throw error;

      const { data: { publicUrl } } = apiService.getFilePublicUrl('tickets', fileName);
      return publicUrl;
    } catch (error) {
      console.error('Error subiendo imagen:', error.message);
      showToast('Error al subir la imagen del ticket: ' + error.message, 'error');
      return null;
    }
  };

  // Cargar datos cuando el usuario inicia sesión
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchInventory();
    }
  }, [user]);

  return (
    <InventoryContext.Provider value={{
      products, setProducts, fetchError,
      inventoryList, setInventoryList,
      categories, fetchProducts, fetchInventory,
      uploadTicketImage
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory debe usarse dentro de un InventoryProvider');
  }
  return context;
};
