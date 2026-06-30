import { supabase } from '../supabaseClient';

/**
 * Servicio de API de Supabase para Oasis Café,
 * aplicando el principio de Responsabilidad Única (SRP).
 * Centraliza todas las consultas y mutaciones de la base de datos.
 */

/**
 * Obtiene el rol asignado al perfil de un usuario.
 */
export const getUserRole = async (userId) => {
  return await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
};

/**
 * Verifica si ya existe una venta registrada con un ID específico (para sincronización offline).
 */
export const checkExistingSale = async (saleId) => {
  return await supabase
    .from('sales')
    .select('id')
    .eq('id', saleId);
};

/**
 * Inserta una venta y sus elementos asociados.
 */
export const insertSaleWithItems = async (saleData, items) => {
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert([saleData])
    .select()
    .single();

  if (saleError) return { data: null, error: saleError };

  const itemsToInsert = items.map(item => ({
    sale_id: sale.id,
    product_id: item.id || item.product_id,
    quantity: item.quantity,
    price: item.sale_price || item.price,
    sale_ticket_number: sale.ticket_number
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(itemsToInsert);

  return { data: sale, error: itemsError };
};

/**
 * Verifica si existe un gasto (para sincronización offline).
 */
export const checkExistingExpense = async (expenseId) => {
  return await supabase
    .from('expenses')
    .select('id')
    .eq('id', expenseId);
};

/**
 * Inserta un gasto en la base de datos.
 */
export const insertExpense = async (expenseData) => {
  return await supabase
    .from('expenses')
    .insert([expenseData]);
};

/**
 * Inserta múltiples gastos en bloque (bulk insert).
 */
export const insertExpenses = async (expenses) => {
  return await supabase
    .from('expenses')
    .insert(expenses);
};

/**
 * Verifica si existe una compra (para sincronización offline).
 */
export const checkExistingPurchase = async (purchaseId) => {
  return await supabase
    .from('purchases')
    .select('id')
    .eq('id', purchaseId);
};

/**
 * Inserta una compra y sus productos asociados.
 */
export const insertPurchaseWithItems = async (purchaseData, items) => {
  const { data: purchase, error: purError } = await supabase
    .from('purchases')
    .insert([purchaseData])
    .select()
    .single();

  if (purError) return { data: null, error: purError };

  const itemsToInsert = items.map(item => ({
    purchase_id: purchase.id,
    product_id: item.product_id || item.id,
    product_name: item.product_name || item.name,
    quantity: item.quantity || item.qty,
    cost: item.cost,
    purchase_number: purchase.purchase_number
  }));

  const { error: itemsError } = await supabase
    .from('purchase_items')
    .insert(itemsToInsert);

  return { data: purchase, error: itemsError };
};

/**
 * Obtiene el inventario actual de un producto.
 */
export const getInventoryProduct = async (productId) => {
  return await supabase
    .from('inventory')
    .select('*')
    .eq('product_id', productId)
    .single();
};

/**
 * Obtiene el listado de ventas detallado para paginación e historial.
 */
export const getSalesWithDetails = async (from, to, startDateFilter, endDateFilter) => {
  let query = supabase
    .from('sales')
    .select(`*, sale_items (*, products (name, sale_price))`)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (startDateFilter && endDateFilter) {
    query = query
      .gte('created_at', startDateFilter)
      .lt('created_at', endDateFilter);
  }

  return await query;
};

/**
 * Obtiene el total consolidado de las ventas del periodo para el resumen financiero.
 */
export const getSalesTotalSummary = async (startDateFilter, endDateFilter) => {
  let query = supabase
    .from('sales')
    .select('total')
    .neq('status', 'cancelado')
    .neq('payment_method', 'A Cuenta');

  if (startDateFilter && endDateFilter) {
    query = query
      .gte('created_at', startDateFilter)
      .lt('created_at', endDateFilter);
  }

  return await query;
};

/**
 * Cancela una venta y devuelve las cantidades vendidas al stock de inventario.
 */
export const cancelSaleAndRestock = async (saleId, newStatus) => {
  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('product_id, quantity')
    .eq('sale_id', saleId);

  if (itemsError) return { error: itemsError };

  if (items) {
    for (const item of items) {
      const { data: inv, error: invError } = await supabase
        .from('inventory')
        .select('stock')
        .eq('product_id', item.product_id)
        .single();

      if (!invError && inv) {
        await supabase
          .from('inventory')
          .update({ stock: inv.stock + item.quantity })
          .eq('product_id', item.product_id);
      }
    }
  }

  return await supabase
    .from('sales')
    .update({ status: newStatus })
    .eq('id', saleId);
};

/**
 * Actualiza el estado y método de pago de una venta.
 */
export const updateSalePaymentStatus = async (saleId, status, paymentMethod) => {
  return await supabase
    .from('sales')
    .update({
      status,
      payment_method: paymentMethod
    })
    .eq('id', saleId);
};

/**
 * Obtiene ventas para el módulo financiero.
 */
export const getSalesForFinance = async (startDate, endDate) => {
  return await supabase
    .from('sales')
    .select(`id, total, created_at, status, customer_name, payment_method, sale_items (quantity, price, products (name, cost_price))`)
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .neq('status', 'cancelado');
};

/**
 * Obtiene gastos operativos para el módulo financiero.
 */
export const getExpensesForPeriod = async (startDate, endDate) => {
  return await supabase
    .from('expenses')
    .select('*')
    .gte('fecha', startDate)
    .lte('fecha', endDate);
};

/**
 * Obtiene compras para el módulo financiero.
 */
export const getPurchasesForPeriod = async (startDate, endDate) => {
  return await supabase
    .from('purchases')
    .select(`*, purchase_items(*, products(name))`)
    .gte('created_at', startDate)
    .lt('created_at', endDate);
};

/**
 * Ejecuta la consulta de resumen financiero para el arqueo de caja.
 */
export const getCashArqueoSummary = async (startTime) => {
  const [vResult, eResult, pResult] = await Promise.all([
    supabase.from('sales').select('total').eq('payment_method', 'Efectivo').neq('status', 'cancelado').gte('created_at', startTime),
    supabase.from('expenses').select('monto').gte('created_at', startTime),
    supabase.from('purchases').select('total').gte('created_at', startTime)
  ]);

  return { vResult, eResult, pResult };
};

/**
 * Crea un nuevo turno de caja (apertura).
 */
export const createCashShift = async (shiftData) => {
  return await supabase
    .from('cash_shifts')
    .insert([shiftData])
    .select()
    .single();
};

/**
 * Actualiza un turno de caja (cierre/arqueo).
 */
export const updateCashShift = async (shiftId, shiftData) => {
  return await supabase
    .from('cash_shifts')
    .update(shiftData)
    .eq('id', shiftId);
};

/**
 * Obtiene el historial de todos los arqueos de turnos de caja.
 */
export const getCashShiftsHistory = async () => {
  return await supabase
    .from('cash_shifts')
    .select('*')
    .order('start_time', { ascending: false });
};

/**
 * Obtiene las estadísticas de ventas de productos estrella para un periodo de tiempo.
 */
export const getStarProductsData = async (startDate, endDate) => {
  return await supabase
    .from('sale_items')
    .select(`quantity, price, products ( name, cost_price ), sales!inner ( id, created_at, status )`)
    .gte('sales.created_at', startDate)
    .lt('sales.created_at', endDate)
    .neq('sales.status', 'cancelado');
};

/**
 * Registra una merma online actualizando stock de inventario y creando el registro de gasto de $0.
 */
export const registerShrinkageOnline = async (productId, newStock, expenseData) => {
  const { error: invError } = await supabase
    .from('inventory')
    .update({ stock: newStock })
    .eq('product_id', productId);

  if (invError) return { error: invError };

  return await supabase
    .from('expenses')
    .insert([expenseData]);
};

/**
 * Obtiene el total de ingresos mensuales para validar la meta de ventas.
 */
export const getMonthlySalesTotal = async (startDate, endDate) => {
  return await supabase
    .from('sales')
    .select('total')
    .neq('status', 'cancelado')
    .neq('payment_method', 'A Cuenta')
    .gte('created_at', startDate)
    .lt('created_at', endDate);
};

/**
 * Obtiene el valor de una configuración en la tabla settings.
 */
export const getSettingValue = async (key) => {
  return await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
};

/**
 * Guarda o actualiza un valor de configuración en la tabla settings (upsert).
 */
export const upsertSetting = async (key, value) => {
  return await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
};

/**
 * Verifica si ya existe una venta registrada en una fecha y usuario específicos (para sincronización offline).
 */
export const checkExistingSaleByTimestamp = async (timestamp, userId) => {
  return await supabase
    .from('sales')
    .select('id')
    .eq('created_at', timestamp)
    .eq('created_by', userId)
    .maybeSingle();
};

/**
 * Verifica si ya existe un gasto registrado en una fecha y usuario específicos (para sincronización offline).
 */
export const checkExistingExpenseByTimestamp = async (timestamp, userId) => {
  return await supabase
    .from('expenses')
    .select('id')
    .eq('created_at', timestamp)
    .eq('created_by', userId)
    .maybeSingle();
};

/**
 * Verifica si ya existe una compra registrada en una fecha y usuario específicos (para sincronización offline).
 */
export const checkExistingPurchaseByTimestamp = async (timestamp, userId) => {
  return await supabase
    .from('purchases')
    .select('id')
    .eq('created_at', timestamp)
    .eq('created_by', userId)
    .maybeSingle();
};

/**
 * Obtiene el turno de caja activo en el sistema.
 */
export const getActiveCashShift = async () => {
  return await supabase
    .from('cash_shifts')
    .select('*')
    .eq('status', 'open')
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();
};

/**
 * Obtiene el stock del inventario ordenado.
 */
export const getInventory = async () => {
  return await supabase
    .from('inventory')
    .select('stock, product_id, products:product_id (name)');
};

/**
 * Actualiza únicamente el estatus de una venta.
 */
export const updateSaleStatusOnly = async (saleId, status) => {
  return await supabase
    .from('sales')
    .update({ status })
    .eq('id', saleId);
};

/**
 * Obtiene la sesión activa del usuario actual.
 */
export const getSession = async () => {
  return await supabase.auth.getSession();
};

/**
 * Cierra la sesión activa del usuario.
 */
export const signOut = async () => {
  return await supabase.auth.signOut();
};

/**
 * Sube un archivo a un bucket y ruta específicos de Supabase Storage.
 */
export const uploadFile = async (bucket, path, file) => {
  return await supabase.storage.from(bucket).upload(path, file);
};

/**
 * Obtiene la URL pública de un archivo en Supabase Storage.
 */
export const getFilePublicUrl = (bucket, path) => {
  return supabase.storage.from(bucket).getPublicUrl(path);
};

/**
 * Actualiza el stock de un producto específico en el inventario.
 */
export const updateInventoryStock = async (productId, newStock) => {
  return await supabase
    .from('inventory')
    .update({ stock: newStock })
    .eq('product_id', productId);
};

/**
 * Obtiene el listado de gastos detallado para un periodo con conteo y orden.
 */
export const getExpensesReport = async (startDate, endDate) => {
  return await supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .order('fecha', { ascending: false });
};

/**
 * Inicia sesion con email y password.
 */
export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

/**
 * Obtiene ventas registradas como 'A Cuenta' que no estén canceladas (Deudas).
 */
export const getDebtsWithDetails = async () => {
  return await supabase
    .from('sales')
    .select(`*, sale_items (*, products (name, sale_price))`)
    .eq('payment_method', 'A Cuenta')
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false });
};

/**
 * Obtiene todas las ventas detalladas en un rango de fechas para exportacion a Excel.
 */
export const getSalesExportData = async (startDate, endDate) => {
  let query = supabase
    .from('sales')
    .select(`*, sale_items (*, products (name, sale_price))`)
    .order('created_at', { ascending: false });

  if (startDate && endDate) {
    query = query
      .gte('created_at', startDate)
      .lt('created_at', endDate);
  }

  return await query;
};


// ============================================================
// FUNCIONES DE PRODUCTOS (migradas desde src/api.js)
// ============================================================

/**
 * Obtiene todos los productos ordenados por nombre.
 */
export const getProducts = async () => {
  const result = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  return result;
};

/**
 * Crea un nuevo producto y su entrada inicial en el inventario.
 */
export const createProduct = async (productData) => {
  const { stock: _, ...cleanProductData } = productData;
  const { data, error } = await supabase
    .from('products')
    .insert([cleanProductData])
    .select()
    .single();

  if (error) return { data: null, error };

  // Crear entrada en inventario
  const { error: invError } = await supabase
    .from('inventory')
    .insert([{
      product_id: data.id,
      product_name: data.name,
      category: data.category,
      stock: productData.stock || 0
    }]);

  if (invError) {
    console.error("Error al crear registro de inventario:", invError);
  }

  return { data, error: null };
};

/**
 * Actualiza un producto existente.
 */
export const updateProduct = async (id, productData) => {
  const { stock: _, ...cleanProductData } = productData;
  const result = await supabase
    .from('products')
    .update(cleanProductData)
    .eq('id', id)
    .select()
    .single();

  return result;
};

/**
 * Elimina un producto.
 * Primero elimina su registro en inventario para evitar errores de integridad.
 */
export const deleteProduct = async (id) => {
  // 1. Eliminar de inventario primero
  const { error: invError } = await supabase
    .from('inventory')
    .delete()
    .eq('product_id', id);

  if (invError) return { error: invError };

  // 2. Eliminar el producto
  const result = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  return result;
};

/**
 * Actualiza directamente el stock de un producto en la tabla de inventario.
 */
export const updateStock = async (productId, newStock) => {
  const result = await supabase
    .from('inventory')
    .update({ stock: newStock })
    .eq('product_id', productId);

  return result;
};
