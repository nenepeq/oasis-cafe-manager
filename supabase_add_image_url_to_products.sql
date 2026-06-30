-- Agregar columna image_url a la tabla products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Comentario explicativo
COMMENT ON COLUMN public.products.image_url IS 'URL pública de la imagen del producto subida a Supabase Storage';
