-- 1. Agregar la columna 'category' a la tabla 'inventory'
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS category text;

-- 2. Rellenar la columna 'category' con los datos actuales de 'products'
UPDATE inventory
SET category = products.category
FROM products
WHERE inventory.product_id = products.id;

-- 3. Actualizar la función del Trigger para que sincronice Nombre Y Categoría
CREATE OR REPLACE FUNCTION public.sync_product_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar product_name y category en inventory cuando cambie en products
  UPDATE public.inventory
  SET 
    product_name = NEW.name,
    category = NEW.category
  WHERE product_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: El trigger 'sync_product_name_trigger' ya existe y llama a esta función,
-- así que no hace falta recrearlo, solo con actualizar la función basta.
