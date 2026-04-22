-- Añadir columna para persistir el total de compras en efectivo al cerrar el turno
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS purchases_cash NUMERIC DEFAULT 0;
