-- SCRIPT DE BLINDAJE DE INVENTARIO
-- Este script añade una restricción de integridad para asegurar que el stock 
-- NUNCA pueda ser negativo, sin importar si hay errores en el código o triggers duplicados.

-- 1. Asegurar que no existan valores negativos actuales (limpieza preventiva)
UPDATE inventory SET stock = 0 WHERE stock < 0;

-- 2. Añadir la restricción CHECK
-- Si el sistema intenta restar más de lo que hay, Supabase devolverá un error 
-- y cancelará la transacción, evitando que el inventario se corrompa.
ALTER TABLE inventory 
ADD CONSTRAINT stock_no_negativo 
CHECK (stock >= 0);

-- Nota: Si al ejecutar esto recibes un error, asegúrate de que el nombre 
-- de la tabla sea 'inventory' y la columna sea 'stock'.
