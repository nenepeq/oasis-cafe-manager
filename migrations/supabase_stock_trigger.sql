-- 1. Habilitar la extensión de HTTP (si no está activa)
create extension if not exists pg_net;

-- 2. Función para enviar la alerta
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  -- ⚠️ IMPORTANTE: REEMPLAZA ESTA URL CON TU URL REAL DE N8N
  webhook_url text := 'https://REEMPLAZAR_CON_TU_URL_DE_N8N_AQUI'; 
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'product_id', NEW.product_id,
    'product_name', NEW.product_name,
    'current_stock', NEW.stock,
    'min_stock', 5
  );

  PERFORM
    net.http_post(
      url := webhook_url,
      body := payload,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger que vigila el stock
DROP TRIGGER IF EXISTS check_stock_level ON inventory;

CREATE TRIGGER check_stock_level
AFTER UPDATE ON inventory
FOR EACH ROW
WHEN (OLD.stock > 5 AND NEW.stock <= 5)
EXECUTE FUNCTION notify_low_stock();
