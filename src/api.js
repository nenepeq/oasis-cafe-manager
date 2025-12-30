import { supabase } from './supabaseClient';

export const getProducts = async () => {
  // Seleccionamos todos los campos de la tabla products
  const result = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true }); // Ordenar alfabéticamente
    
  return result;
};
