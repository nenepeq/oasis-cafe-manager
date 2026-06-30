-- =============================================================
-- POLÍTICAS RLS (Row Level Security) PARA OASIS CAFÉ
-- =============================================================
-- Ejecutar en Supabase SQL Editor para aplicar seguridad server-side.
-- Esto previene que usuarios manipulen el frontend para acceder a
-- funciones de admin (cancelar ventas, ver finanzas, etc.)
--
-- IMPORTANTE: Si ya tienes políticas existentes, primero elimínalas:
--   DROP POLICY IF EXISTS "nombre_policy" ON tabla;
-- O usa el Dashboard de Supabase para revisarlas antes de aplicar.
-- =============================================================

-- 1. Habilitar RLS en todas las tablas principales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Función helper para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================
-- VENTAS (sales)
-- =============================================================
-- Flujo: Todos crean ventas, todos pueden ver, todos pueden cambiar
-- status (recibido→entregado, cobrar deudas). Solo admin cancela.
-- La restricción de cancelación está en el backend logic pero
-- la RLS permite UPDATE genérico para cobros (markAsPaid).

CREATE POLICY "Todos pueden ver ventas" ON sales
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear ventas" ON sales
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Cualquier usuario autenticado puede actualizar ventas
-- (necesario para marcar como pagadas/entregadas desde cualquier sesión)
-- La lógica de "solo admin cancela" se refuerza con un trigger.
CREATE POLICY "Usuarios autenticados pueden actualizar ventas" ON sales
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Nadie puede borrar ventas directamente
CREATE POLICY "Nadie puede borrar ventas" ON sales
  FOR DELETE USING (false);

-- =============================================================
-- ITEMS DE VENTA (sale_items)
-- =============================================================
CREATE POLICY "Todos pueden ver items de venta" ON sale_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear items" ON sale_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================
-- GASTOS (expenses)
-- =============================================================
-- Tanto admin como ventas pueden registrar gastos (sync offline y mermas)
CREATE POLICY "Usuarios autenticados pueden ver gastos" ON expenses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear gastos" ON expenses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede modificar gastos" ON expenses
  FOR UPDATE USING (is_admin());

CREATE POLICY "Solo admin puede borrar gastos" ON expenses
  FOR DELETE USING (is_admin());

-- =============================================================
-- COMPRAS (purchases)
-- =============================================================
-- Las compras las registra admin desde InventoryModal, pero la sync
-- offline las sube cualquier usuario que las haya guardado localmente.
-- En la práctica solo admin accede al UI de compras.
CREATE POLICY "Usuarios autenticados pueden ver compras" ON purchases
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear compras" ON purchases
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede modificar compras" ON purchases
  FOR UPDATE USING (is_admin());

-- =============================================================
-- ITEMS DE COMPRA (purchase_items)
-- =============================================================
CREATE POLICY "Usuarios autenticados pueden ver items de compra" ON purchase_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear items de compra" ON purchase_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================
-- INVENTARIO (inventory)
-- =============================================================
-- UPDATE: cualquier usuario necesita actualizar stock (al vender, sync mermas)
-- INSERT: solo al crear productos (admin)
-- DELETE: solo al eliminar productos (admin)
CREATE POLICY "Usuarios autenticados pueden ver inventario" ON inventory
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden modificar stock" ON inventory
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede insertar inventario" ON inventory
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede borrar inventario" ON inventory
  FOR DELETE USING (is_admin());

-- =============================================================
-- PRODUCTOS (products)
-- =============================================================
CREATE POLICY "Todos pueden ver productos" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede crear productos" ON products
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede modificar productos" ON products
  FOR UPDATE USING (is_admin());

CREATE POLICY "Solo admin puede borrar productos" ON products
  FOR DELETE USING (is_admin());

-- =============================================================
-- TURNOS DE CAJA (cash_shifts)
-- =============================================================
-- Solo admin gestiona turnos (abrir/cerrar)
CREATE POLICY "Usuarios autenticados pueden ver turnos" ON cash_shifts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede abrir turnos" ON cash_shifts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede cerrar turnos" ON cash_shifts
  FOR UPDATE USING (is_admin());

-- =============================================================
-- CONFIGURACIÓN (settings)
-- =============================================================
CREATE POLICY "Usuarios autenticados pueden ver settings" ON settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede crear settings" ON settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede actualizar settings" ON settings
  FOR UPDATE USING (is_admin());

-- =============================================================
-- PERFILES (profiles)
-- =============================================================
-- Cada usuario necesita leer su propio perfil para obtener su rol
CREATE POLICY "Usuarios pueden ver su propio perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin puede ver todos los perfiles
CREATE POLICY "Admin puede ver todos los perfiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Solo admin puede modificar perfiles" ON profiles
  FOR UPDATE USING (is_admin());

-- =============================================================
-- LOGS DE ACTIVIDAD (activity_logs)
-- =============================================================
CREATE POLICY "Solo admin puede ver logs" ON activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Usuarios autenticados pueden crear logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================
-- TRIGGER OPCIONAL: Prevenir cancelación por no-admin a nivel DB
-- =============================================================
-- Este trigger es la barrera real contra cancelaciones no autorizadas.
-- Incluso si alguien bypasea el frontend, el DB lo rechaza.
CREATE OR REPLACE FUNCTION prevent_non_admin_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se intenta cambiar status a 'cancelado'
  IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    -- Verificar si el usuario es admin
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Solo administradores pueden cancelar ventas';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger (DROP IF EXISTS para evitar duplicados)
DROP TRIGGER IF EXISTS check_cancellation_permission ON sales;
CREATE TRIGGER check_cancellation_permission
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION prevent_non_admin_cancellation();
