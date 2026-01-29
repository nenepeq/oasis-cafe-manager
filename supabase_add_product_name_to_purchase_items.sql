-- 1. Agregar la columna 'product_name' a la tabla 'purchase_items'
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS product_name text;

-- 2. Rellenar la columna 'product_name' con los datos actuales de 'products'
UPDATE purchase_items
SET product_name = products.name
FROM products
WHERE purchase_items.product_id = products.id;

-- 3. (Opcional) Asegurar que el nombre del producto se sincronice si cambia en la tabla de productos
-- Como es un registro histórico de compra, a veces es preferible mantener el nombre original 
-- al momento de la compra, pero si se desea sincronización completa se puede usar un trigger similar 
-- al de la tabla inventory.
