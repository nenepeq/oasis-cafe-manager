import { supabase } from './supabaseClient';

export const getProducts = async () => {
  const result = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  return result;
};

/**
 * Crea un nuevo producto y su entrada inicial en el inventario.
 */
export const createProduct = async (productData) => {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (error) return { data: null, error };

  // Crear entrada en inventario (mapeando campos para evitar NULLs)
  const { error: invError } = await supabase
    .from('inventory')
    .insert([{
      product_id: data.id,
      product_name: data.name,
      category: data.category,
      stock: 0
    }]);

  if (invError) {
    console.error("Error al crear registro de inventario:", invError);
    // Nota: El producto ya se creó, pero falló el inventario. El sistema es robusto pero esto es un aviso.
  }

  return { data, error: null };
};

/**
 * Actualiza un producto existente.
 */
export const updateProduct = async (id, productData) => {
  const result = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();

  return result;
};

/**
 * Elimina un producto. 
 * Primero elimina su registro en inventario para evitar errores de integridad.
 */
export const deleteProduct = async (id) => {
  // 1. Eliminar de inventario primero
  const { error: invError } = await supabase
    .from('inventory')
    .delete()
    .eq('product_id', id);

  if (invError) return { error: invError };

  // 2. Eliminar el producto
  const result = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  return result;
};
