-- 1. Agregar la columna 'is_visible' a la tabla 'products'
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- 2. Asegurar que todos los productos existentes tengan la columna como TRUE por defecto
UPDATE products SET is_visible = true WHERE is_visible IS NULL;
