-- =============================================================
-- FUNCIÓN ATÓMICA PARA CANCELAR VENTAS Y DEVOLVER STOCK
-- =============================================================
-- Reemplaza el loop de updates del frontend por una transacción
-- server-side que garantiza consistencia: si algo falla, se revierte todo.
--
-- Ejecutar en Supabase SQL Editor.
-- =============================================================

CREATE OR REPLACE FUNCTION cancel_sale_and_restock(p_sale_id UUID, p_new_status TEXT)
RETURNS JSON AS $$
DECLARE
  v_item RECORD;
  v_current_stock INTEGER;
BEGIN
  -- Verificar que la venta existe y no está ya cancelada
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND status != 'cancelado') THEN
    RETURN json_build_object('success', false, 'error', 'Venta no encontrada o ya cancelada');
  END IF;

  -- Verificar permisos (solo admin puede cancelar)
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden cancelar ventas';
  END IF;

  -- Devolver stock de cada item al inventario
  FOR v_item IN
    SELECT product_id, quantity FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    SELECT stock INTO v_current_stock
    FROM inventory
    WHERE product_id = v_item.product_id;

    IF v_current_stock IS NOT NULL THEN
      UPDATE inventory
      SET stock = v_current_stock + v_item.quantity
      WHERE product_id = v_item.product_id;
    END IF;
  END LOOP;

  -- Actualizar status de la venta
  UPDATE sales SET status = p_new_status WHERE id = p_sale_id;

  RETURN json_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    -- Si algo falla, toda la transacción se revierte automáticamente (ROLLBACK implícito)
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
