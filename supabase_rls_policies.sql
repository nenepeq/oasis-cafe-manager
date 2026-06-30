-- =============================================================
-- POLÍTICAS RLS (Row Level Security) PARA OASIS CAFÉ
-- =============================================================
-- Ejecutar en Supabase SQL Editor para aplicar seguridad server-side.
-- Esto previene que usuarios manipulen el frontend para acceder a
-- funciones de admin (cancelar ventas, ver finanzas, etc.)
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
-- Todos pueden ver y crear ventas
CREATE POLICY "Todos pueden ver ventas" ON sales
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden crear ventas" ON sales
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Solo admin puede cancelar (UPDATE status)
CREATE POLICY "Solo admin puede modificar ventas" ON sales
  FOR UPDATE USING (is_admin() OR auth.uid() = created_by);

-- Nadie puede borrar ventas directamente
CREATE POLICY "Nadie puede borrar ventas" ON sales
  FOR DELETE USING (false);

-- =============================================================
-- ITEMS DE VENTA (sale_items)
-- =============================================================
CREATE POLICY "Todos pueden ver items de venta" ON sale_items
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items" ON sale_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================
-- GASTOS (expenses)
-- =============================================================
CREATE POLICY "Todos pueden ver gastos" ON expenses
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden crear gastos" ON expenses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede modificar gastos" ON expenses
  FOR UPDATE USING (is_admin());

CREATE POLICY "Solo admin puede borrar gastos" ON expenses
  FOR DELETE USING (is_admin());

-- =============================================================
-- COMPRAS (purchases)
-- =============================================================
CREATE POLICY "Todos pueden ver compras" ON purchases
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden crear compras" ON purchases
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede modificar compras" ON purchases
  FOR UPDATE USING (is_admin());

-- =============================================================
-- INVENTARIO (inventory)
-- =============================================================
CREATE POLICY "Todos pueden ver inventario" ON inventory
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar inventario" ON inventory
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede insertar inventario" ON inventory
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede borrar inventario" ON inventory
  FOR DELETE USING (is_admin());

-- =============================================================
-- PRODUCTOS (products)
-- =============================================================
CREATE POLICY "Todos pueden ver productos" ON products
  FOR SELECT USING (true);

CREATE POLICY "Solo admin puede crear productos" ON products
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede modificar productos" ON products
  FOR UPDATE USING (is_admin());

CREATE POLICY "Solo admin puede borrar productos" ON products
  FOR DELETE USING (is_admin());

-- =============================================================
-- TURNOS DE CAJA (cash_shifts)
-- =============================================================
CREATE POLICY "Todos pueden ver turnos" ON cash_shifts
  FOR SELECT USING (true);

CREATE POLICY "Solo admin puede gestionar turnos" ON cash_shifts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede cerrar turnos" ON cash_shifts
  FOR UPDATE USING (is_admin());

-- =============================================================
-- CONFIGURACIÓN (settings)
-- =============================================================
CREATE POLICY "Todos pueden ver settings" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Solo admin puede modificar settings" ON settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Solo admin puede actualizar settings" ON settings
  FOR UPDATE USING (is_admin());

-- =============================================================
-- PERFILES (profiles)
-- =============================================================
CREATE POLICY "Usuarios pueden ver su propio perfil" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Solo admin puede modificar perfiles" ON profiles
  FOR UPDATE USING (is_admin());

-- =============================================================
-- LOGS DE ACTIVIDAD (activity_logs)
-- =============================================================
CREATE POLICY "Solo admin puede ver logs" ON activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Todos pueden crear logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
