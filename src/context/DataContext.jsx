import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import * as apiService from '../services/apiService';
import { logActivity } from '../utils/logger';
import { getMXDate, getMXTimestamp } from '../utils/dates';
import { sanitizeText } from '../utils/sanitize';
import { formatUserError } from '../utils/errorHandler';
import { useToast } from '../hooks/useToast.jsx';
import { 
  getAllPendingItems, 
  clearPendingItem 
} from '../utils/db';
import { compressImage } from '../utils/imageOptimizer';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { showToast } = useToast();

  // --- ESTADOS DE AUTENTICACIÓN Y PERFIL ---
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('ventas');
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DE DATOS PRINCIPALES ---
  const [products, setProducts] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [inventoryList, setInventoryList] = useState([]);

  // --- ESTADOS DE RED Y SINCRONIZACIÓN ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [pendingSales, setPendingSales] = useState([]);

  // --- ESTADOS DE ARQUEO DE CAJA ---
  const [activeShift, setActiveShift] = useState(null);
  const [showArqueoHistory, setShowArqueoHistory] = useState(false);
  const [cashInitialFund, setCashInitialFund] = useState(0);
  const [cashPhysicalCount, setCashPhysicalCount] = useState(0);
  const [cashObservations, setCashObservations] = useState('');
  const [arqueoHistory, setArqueoHistory] = useState([]);
  const [cashReportData, setCashReportData] = useState({
    ventasEfectivo: 0,
    gastosEfectivo: 0,
    comprasEfectivo: 0,
    esperado: 0,
    diferencia: 0
  });

  // --- ESTADOS DE PRODUCTOS ESTRELLA ---
  const [starStartDate, setStarStartDate] = useState(getMXDate());
  const [starEndDate, setStarEndDate] = useState(getMXDate());
  const [starData, setStarData] = useState([]);
  const [kpiData, setKpiData] = useState({
    ticketPromedio: 0,
    horaPico: '00:00',
    margenReal: 0,
    totalVentas: 0
  });

  // --- ESTADOS DE REPORTES ---
  const [sales, setSales] = useState([]);
  const [salesOffset, setSalesOffset] = useState(0);
  const [hasMoreSales, setHasMoreSales] = useState(true);
  const [reportStartDate, setReportStartDate] = useState(getMXDate());
  const [reportEndDate, setReportEndDate] = useState(getMXDate());
  const [totalIngresosReporte, setTotalIngresosReporte] = useState(0);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [reportExpenses, setReportExpenses] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);

  // --- CONFIGURACIÓN Y FINANZAS ---
  const [salesGoal, setSalesGoal] = useState(50000);
  const [monthlySalesTotal, setMonthlySalesTotal] = useState(0);
  const [finData, setFinData] = useState({
    ingresos: 0,
    costoProductos: 0,
    gastosOps: 0,
    gastosStock: 0,
    totalEgresos: 0,
    utilidadNeta: 0,
    margen: 0
  });
  const [dailyExpensesList, setDailyExpensesList] = useState([]);
  const [dailyStockList, setDailyStockList] = useState([]);
  const [dailySalesList, setDailySalesList] = useState([]);
  const [financeStartDate, setFinanceStartDate] = useState(getMXDate());
  const [financeEndDate, setFinanceEndDate] = useState(getMXDate());

  // --- LÍMITE DE PAGINACIÓN DE VENTAS ---
  const SALES_LIMIT = 50;

  // --- FUNCIONES DE CARGA Y SERVICIOS ---

  const checkPendingItems = React.useCallback(async () => {
    const { sales: pSales, expenses, purchases } = await getAllPendingItems();
    setHasPendingItems(pSales.length > 0 || expenses.length > 0 || purchases.length > 0);
    setPendingSales(pSales);
  }, []);

  const syncOfflineData = React.useCallback(async () => {
    console.log('🔄 Intento de sincronización. isSyncingRef:', isSyncingRef.current, 'online:', isOnline);
    if (isSyncingRef.current || !isOnline) return;
    isSyncingRef.current = true;

    const { sales: pSales, expenses, purchases } = await getAllPendingItems();
    console.log('📦 Items pendientes encontrados:', { sales: pSales.length, expenses: expenses.length, purchases: purchases.length });

    if (pSales.length === 0 && expenses.length === 0 && purchases.length === 0) {
      setHasPendingItems(false);
      isSyncingRef.current = false;
      return;
    }

    setIsSyncing(true);
    showToast('🔄 Sincronizando datos pendientes...', 'info', 2000);

    try {
      // Sync Ventas
      for (const s of pSales) {
        try {
          const { data: existing } = await apiService.checkExistingSaleByTimestamp(s.timestamp, s.created_by);
          if (existing) {
            await clearPendingItem('pending_sales', s.id);
            continue;
          }

          const saleData = {
            total: s.total,
            status: s.status,
            created_by: s.created_by,
            customer_name: sanitizeText(s.customer_name, 100) || 'Cliente Mostrador',
            payment_method: s.payment_method,
            created_at: s.timestamp
          };

          const { data: sale, error: saleError } = await apiService.insertSaleWithItems(saleData, s.items);

          if (!saleError && sale) {
            await clearPendingItem('pending_sales', s.id);
            logActivity(s.created_by, 'SYNC_VENTA_OFFLINE', 'VENTAS', { sale_id: sale.id }).catch(err => console.error('Error log sync venta:', err));
          }
        } catch (e) { console.error('Error sync venta:', e); }
      }

      // Sync Gastos
      for (const g of expenses) {
        try {
          const { data: existing } = await apiService.checkExistingExpenseByTimestamp(g.timestamp, g.created_by);
          if (existing) {
            await clearPendingItem('pending_expenses', g.id);
            continue;
          }

          const { error: expError } = await apiService.insertExpense({
            monto: g.monto,
            concepto: sanitizeText(g.concepto, 300),
            categoria: g.categoria,
            fecha: g.fecha,
            created_by: g.created_by,
            created_at: g.timestamp
          });

          if (!expError) {
            await clearPendingItem('pending_expenses', g.id);
            logActivity(g.created_by, 'SYNC_GASTO_OFFLINE', 'FINANZAS', { amount: g.monto }).catch(err => console.error('Error log sync gasto:', err));
          }
        } catch (e) { console.error('Error sync gasto:', e); }
      }

      // Sync Compras
      for (const p of purchases) {
        try {
          const { data: existing } = await apiService.checkExistingPurchaseByTimestamp(p.timestamp, p.created_by);
          if (existing) {
            await clearPendingItem('pending_purchases', p.id);
            continue;
          }

          const purchaseData = {
            total: p.total,
            created_by: p.created_by,
            created_at: p.timestamp
          };

          const { data: purchase, error: purError } = await apiService.insertPurchaseWithItems(purchaseData, p.items);
          if (!purError && purchase) {
            await clearPendingItem('pending_purchases', p.id);
            logActivity(p.created_by, 'SYNC_COMPRA_OFFLINE', 'INVENTARIO', { total: p.total }).catch(err => console.error('Error log sync compra:', err));
          }
        } catch (e) { console.error('Error sync compra:', e); }
      }

      // Sync Mermas
      const { shrinkages } = await getAllPendingItems();
      for (const s of (shrinkages || [])) {
        try {
          const { data: existing } = await apiService.checkExistingExpenseByTimestamp(s.timestamp, s.created_by);
          if (existing) {
            await clearPendingItem('pending_shrinkage', s.id);
            continue;
          }

          const { data: currentInv } = await apiService.getInventoryProduct(s.product_id);
          if (currentInv) {
            await apiService.updateInventoryStock(s.product_id, currentInv.stock - s.quantity);
          }

          const { error: expError } = await apiService.insertExpense({
            concepto: `Merma (Sync): ${s.quantity}x ${s.product_name} (${s.reason})`,
            categoria: 'Merma',
            monto: 0,
            fecha: s.timestamp.split('T')[0],
            created_by: s.created_by,
            created_at: s.timestamp
          });

          if (!expError) {
            await clearPendingItem('pending_shrinkage', s.id);
            logActivity(s.created_by, 'SYNC_MERMA_OFFLINE', 'INVENTARIO', { product: s.product_name }).catch(err => console.error('Error log sync merma:', err));
          }
        } catch (e) { console.error('Error sync merma:', e); }
      }

      await checkPendingItems();
      await fetchInventory();
      if (userRole === 'admin') await calculateFinances();
      showToast('✅ Datos sincronizados correctamente', 'success');

    } catch (err) {
      console.error('Error en sincronización:', err);
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [checkPendingItems, isOnline, userRole]);

  const fetchProfile = async (currentUser) => {
    setUser(currentUser);
    const { data } = await apiService.getUserRole(currentUser.id);
    if (data && data.role) setUserRole(data.role);
  };

  const login = async (email, password) => {
    const { data, error } = await apiService.signIn(email, password);
    if (!error && data?.user) {
      await fetchProfile(data.user);
    }
    return { data, error };
  };

  const handleLogout = async () => {
    await apiService.signOut();
    setUser(null);
    setUserRole('ventas');
  };

  const fetchProducts = async () => {
    const res = await apiService.getProducts();
    if (res.error) setFetchError(res.error.message);
    else { setProducts(res.data || []); setFetchError(null); }
  };

  const fetchInventory = async () => {
    const { data, error } = await apiService.getInventory();
    if (!error && data) {
      const sortedData = data.sort((a, b) =>
        (a.products?.name || "").localeCompare(b.products?.name || "", 'es', { sensitivity: 'base' })
      );
      setInventoryList(sortedData);
    }
  };

  // Categorías base (siempre visibles)
  const baseCategories = [
    'Bebidas Calientes', 'Alimentos', 'Frappés',
    'Bebidas Frías', 'Refrescos', 'Postres', 'Sabritas y Otros'
  ];

  // Categorías Dinámicas (Base + las que vengan de DB)
  const categories = React.useMemo(() => {
    const prodCats = products.map(p => p.category).filter(Boolean);
    const uniqueCats = new Set([...baseCategories, ...prodCats]);
    return ['Todos', ...Array.from(uniqueCats).sort()];
  }, [products]);

  // Sube una imagen al bucket de Supabase Storage
  const uploadTicketImage = async (file, folder = 'general') => {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      let fileToUpload = file;
      try {
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
      } catch (optErr) {
        console.warn('Falló optimización de imagen, subiendo original:', optErr);
      }

      const { data, error } = await apiService.uploadFile('tickets', fileName, fileToUpload);
      if (error) throw error;

      const { data: { publicUrl } } = apiService.getFilePublicUrl('tickets', fileName);
      return publicUrl;
    } catch (error) {
      console.error('Error subiendo imagen:', error.message);
      showToast('Error al subir la imagen: ' + formatUserError(error), 'error');
      return null;
    }
  };

  const fetchActiveShift = async () => {
    const { data, error } = await apiService.getActiveCashShift();
    if (!error) {
      setActiveShift(data);
      if (data) setCashInitialFund(data.initial_fund);
    }
  };

  const fetchMonthlySalesTotal = async () => {
    try {
      const now = new Date();
      const mxDateStr = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'numeric', day: 'numeric' });
      const [month, day, year] = mxDateStr.split(',')[0].split('/').map(n => parseInt(n));
      const startStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00-06:00`;
      const lastDay = new Date(year, month, 0);
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}T23:59:59-06:00`;

      const { data, error } = await apiService.getMonthlySalesTotal(startStr, endStr);
      if (!error && data) {
        const total = data.reduce((acc, s) => acc + (s.total || 0), 0);
        setMonthlySalesTotal(total);
      }
    } catch (err) {
      console.error('Error fetching monthly sales total:', err);
    }
  };

  const fetchSalesGoal = async () => {
    try {
      const { data, error } = await apiService.getSettingValue('sales_goal');
      if (!error && data) {
        setSalesGoal(parseFloat(data.value) || 50000);
      } else if (!error && !data) {
        const saved = localStorage.getItem('oasis_sales_goal');
        if (saved) setSalesGoal(parseFloat(saved));
      }
    } catch (err) {
      console.error('Error fetching sales goal:', err);
    }
  };

  const updateSalesGoalInDB = async (newGoal) => {
    setSalesGoal(newGoal);
    localStorage.setItem('oasis_sales_goal', newGoal.toString());
    try {
      const { error } = await apiService.upsertSetting('sales_goal', newGoal.toString());
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error updating sales goal:', err);
      return { success: false, error: err };
    }
  };

  const fetchSales = async (offset = 0) => {
    setLoading(true);
    if (offset === 0) setSales([]);
    const from = offset;
    const to = offset + SALES_LIMIT - 1;

    let startDateFilter = null;
    let nextDayStrFilter = null;

    if (reportStartDate && reportEndDate) {
      const endDateObj = new Date(reportEndDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      nextDayStrFilter = endDateObj.toISOString().split('T')[0];
      startDateFilter = reportStartDate + 'T06:00:00';
    }

    const endDateFilter = nextDayStrFilter ? nextDayStrFilter + 'T06:00:00' : null;
    const { data, error } = await apiService.getSalesWithDetails(from, to, startDateFilter, endDateFilter);

    if (!error && data) {
      if (offset === 0) {
        setSales(data || []);
        try {
          const { data: summaryData } = await apiService.getSalesTotalSummary(startDateFilter, endDateFilter);
          if (summaryData) {
            const realSum = summaryData.reduce((acc, s) => acc + (s.total || 0), 0);
            setTotalIngresosReporte(realSum);
            setTotalSalesCount(summaryData.length);
          }
        } catch (sumErr) {
          console.error("Error fetching sales summary:", sumErr);
        }
      } else {
        setSales(prev => [...prev, ...data]);
      }

      if (data.length < SALES_LIMIT) {
        setHasMoreSales(false);
      } else {
        setHasMoreSales(true);
      }
      setSalesOffset(offset);
    }
    setLoading(false);
  };

  const loadMoreSales = async () => {
    const nextOffset = salesOffset + SALES_LIMIT;
    await fetchSales(nextOffset);
  };

  const fetchReportExpenses = async () => {
    setLoading(true);
    try {
      const { data, error, count } = await apiService.getExpensesReport(reportStartDate, reportEndDate);
      if (!error) {
        setReportExpenses(data || []);
      } else {
        showToast(`Error al cargar gastos: ${formatUserError(error)}`, 'error');
      }
    } catch (err) {
      console.error("Error fetching report expenses:", err);
    }
    setLoading(false);
  };

  const updateSaleStatus = async (saleId, newStatus) => {
    if (newStatus === 'cancelado' && userRole !== 'admin') return showToast("Solo admin puede cancelar", "warning");
    setLoading(true);
    try {
      if (newStatus === 'cancelado') {
        await apiService.cancelSaleAndRestock(saleId, newStatus);
      } else {
        await apiService.updateSaleStatusOnly(saleId, newStatus);
      }

      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s));
      setSelectedSale(prev => prev && prev.id === saleId ? { ...prev, status: newStatus } : prev);
      showToast(`✅ Estatus: ${newStatus.toUpperCase()}`, "success");

      logActivity(user?.id || user.id, `CAMBIO_ESTATUS_${newStatus.toUpperCase()}`, 'VENTAS', {
        sale_id: saleId,
        new_status: newStatus
      }).catch(err => console.error('Error log cambio estatus:', err));

      calculateFinances(); fetchInventory(); fetchMonthlySalesTotal();
    } catch (err) { showToast('Error: ' + formatUserError(err), "error"); }
    setLoading(false);
  };

  const cancelOfflineSale = async (localId) => {
    if (userRole !== 'admin') return showToast("Solo admin puede cancelar", "warning");
    if (!window.confirm("¿Eliminar esta venta offline?")) return;

    try {
      await clearPendingItem('pending_sales', localId);
      await checkPendingItems();
      setSelectedSale(null);
      showToast("✅ Venta offline eliminada correctamente", "success");
    } catch (err) {
      showToast("Error al eliminar venta offline: " + formatUserError(err), "error");
    }
  };

  const markAsPaid = async (saleId, method = 'Efectivo') => {
    setLoading(true);
    try {
      await apiService.updateSalePaymentStatus(saleId, 'entregado', method);

      setSales(prev => prev.map(s => s.id === saleId ? { ...s, payment_method: method, status: 'entregado' } : s));
      setSelectedSale(prev => prev && prev.id === saleId ? { ...prev, payment_method: method, status: 'entregado' } : prev);
      showToast(`✅ Venta cobrada con éxito (registrada como ${method})`, "success");
      logActivity(user?.id || user.id, 'COBRO_DEUDA', 'VENTAS', { sale_id: saleId, method }).catch(err => console.error('Error log cobro deuda:', err));

      calculateFinances(); fetchMonthlySalesTotal(); fetchInventory();
    } catch (err) { showToast('Error al cobrar: ' + formatUserError(err), "error"); }
    setLoading(false);
  };

  const calculateFinances = async () => {
    if (userRole !== 'admin') return;
    setLoading(true);
    const endDateTime = new Date(financeEndDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    const nextDayStr = endDateTime.toISOString().split('T')[0];

    const { data: salesData } = await apiService.getSalesForFinance(financeStartDate + 'T06:00:00', nextDayStr + 'T06:00:00');

    let ingresos = 0, costoProds = 0;
    salesData?.forEach(s => { ingresos += s.total; s.sale_items?.forEach(i => costoProds += (i.quantity * (i.products?.cost_price || 0))); });

    const { data: expData } = await apiService.getExpensesForPeriod(financeStartDate, financeEndDate);
    const { data: purData } = await apiService.getPurchasesForPeriod(financeStartDate + 'T06:00:00', nextDayStr + 'T06:00:00');

    const gastOps = expData?.reduce((a, e) => a + e.monto, 0) || 0;
    const gastStk = purData?.reduce((a, p) => a + p.total, 0) || 0;
    const egr = costoProds + gastOps + gastStk;
    const util = ingresos - egr;

    setFinData({ ingresos, costoProductos: costoProds, gastosOps: gastOps, gastosStock: gastStk, totalEgresos: egr, utilidadNeta: util, margen: ingresos > 0 ? (util / ingresos) * 100 : 0 });
    setDailyExpensesList(expData || []); setDailyStockList(purData || []); setDailySalesList(salesData || []); setLoading(false);
  };

  const runCashArqueo = async () => {
    if ((!activeShift && !showArqueoHistory) || loading) return;
    setLoading(true);
    try {
      const startTime = activeShift ? activeShift.start_time : getMXTimestamp();
      const { vResult, eResult, pResult } = await apiService.getCashArqueoSummary(startTime);

      const vEfec = vResult.data?.reduce((a, v) => a + (v.total || 0), 0) || 0;
      const eEfec = eResult.data?.reduce((a, e) => a + (e.monto || 0), 0) || 0;
      const pEfec = pResult.data?.reduce((a, p) => a + (p.total || 0), 0) || 0;
      
      const initial = activeShift ? parseFloat(activeShift.initial_fund || 0) : parseFloat(cashInitialFund || 0);
      const esp = initial + vEfec - eEfec - pEfec;

      setCashReportData({
        ventasEfectivo: vEfec,
        gastosEfectivo: eEfec,
        comprasEfectivo: pEfec,
        esperado: esp,
        diferencia: (parseFloat(cashPhysicalCount) || 0) - esp
      });
    } catch (err) {
      console.error("Error en runCashArqueo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    if (cashInitialFund < 0 || loading) return showToast("Ingresa un fondo inicial válido", "warning");
    setLoading(true);
    const { data, error } = await apiService.createCashShift({
      initial_fund: cashInitialFund,
      opened_by: user.id,
      status: 'open',
      start_time: getMXTimestamp()
    });

    if (!error) {
      setActiveShift(data);
      setCashInitialFund(0);
      showToast("✅ Turno Abierto", "success");
      logActivity(user?.id || user.id, 'APERTURA_TURNO', 'FINANZAS', { initial_fund: cashInitialFund }).catch(err => console.error('Error log apertura turno:', err));
    } else {
      showToast("Error al abrir turno: " + formatUserError(error), "error");
    }
    setLoading(false);
  };

  const handleCloseShift = async (finalObservations = null) => {
    if (cashPhysicalCount <= 0 || loading) return showToast("Ingresa el efectivo contado", "warning");
    if (!window.confirm("¿Estás seguro de cerrar el turno?")) return;

    setLoading(true);
    const expected = cashReportData.esperado;
    const difference = (parseFloat(cashPhysicalCount) || 0) - expected;

    const { error } = await apiService.updateCashShift(activeShift.id, {
      end_time: getMXTimestamp(),
      actual_cash: cashPhysicalCount,
      expected_cash: expected,
      difference: difference,
      sales_cash: cashReportData.ventasEfectivo,
      expenses_cash: cashReportData.gastosEfectivo,
      purchases_cash: cashReportData.comprasEfectivo,
      observations: finalObservations !== null ? finalObservations : cashObservations,
      closed_by: user.id,
      status: 'closed'
    });

    if (!error) {
      showToast("✅ Turno Cerrado y Arqueo Guardado", "success");
      logActivity(user?.id || user.id, 'CIERRE_TURNO', 'FINANZAS', {
        expected: expected,
        actual: cashPhysicalCount,
        difference: difference
      }).catch(err => console.error('Error log cierre turno:', err));
      setActiveShift(null);
      setCashPhysicalCount(0);
      setCashObservations('');
      setCashInitialFund(0);
    } else {
      showToast("Error al cerrar turno: " + formatUserError(error), "error");
    }
    setLoading(false);
  };

  const fetchArqueoHistory = async () => {
    setLoading(true);
    const { data, error } = await apiService.getCashShiftsHistory();
    if (!error) {
      setArqueoHistory(data || []);
      setShowArqueoHistory(true);
    } else {
      console.error("Error fetching shift history:", error);
    }
    setLoading(false);
  };

  const fetchStarProducts = async () => {
    setLoading(true);
    const endDateTime = new Date(starEndDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    const nextDayStr = endDateTime.toISOString().split('T')[0];

    const { data } = await apiService.getStarProductsData(starStartDate + 'T06:00:00', nextDayStr + 'T06:00:00');

    const grouping = (data || []).reduce((acc, item) => {
      const name = item.products?.name || 'Desconocido';
      if (!acc[name]) acc[name] = { name, totalQty: 0, totalRevenue: 0, totalCost: 0 };
      acc[name].totalQty += item.quantity;
      acc[name].totalRevenue += (item.quantity * item.price);
      acc[name].totalCost += (item.quantity * (item.products?.cost_price || 0));
      return acc;
    }, {});

    const salesIds = new Set();
    const hourlyDistribution = {};
    let totalRevenue = 0;
    let totalCost = 0;

    (data || []).forEach(item => {
      salesIds.add(item.sales.id);
      totalRevenue += (item.quantity * item.price);
      totalCost += (item.quantity * (item.products?.cost_price || 0));

      const hour = new Date(item.sales.created_at).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    let peakHour = 0, maxSales = 0;
    Object.entries(hourlyDistribution).forEach(([hr, count]) => {
      if (count > maxSales) { maxSales = count; peakHour = hr; }
    });

    const ticketPromedio = salesIds.size > 0 ? totalRevenue / salesIds.size : 0;
    const margenReal = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    setKpiData({
      ticketPromedio,
      horaPico: `${peakHour}:00`,
      margenReal,
      totalVentas: salesIds.size
    });

    setStarData(Object.values(grouping).sort((a, b) => b.totalQty - a.totalQty));
    setLoading(false);
  };

  // --- EFECTOS INICIALES Y HEARTBEAT DE CONEXIÓN ---

  // Recuperar sesión al cargar
  useEffect(() => {
    apiService.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user);
      }
    });
  }, []);

  // Verificar items pendientes al iniciar
  useEffect(() => {
    checkPendingItems();
  }, [checkPendingItems]);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline, syncOfflineData]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('📡 Dispositivo reporta ONLINE (window listener)');
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => {
      console.log('📡 Dispositivo reporta OFFLINE (window listener)');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connectionInterval = setInterval(async () => {
      const navStatus = navigator.onLine;
      if (!navStatus) {
        setIsOnline(false);
        return;
      }
      // Solo hacer ping activo si creemos estar offline — evita peticiones innecesarias
      // cuando ya estamos online (los eventos 'online'/'offline' del browser son suficientes)
      if (isOnline) return;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`/logo.png?t=${Date.now()}`, { 
          method: 'HEAD', 
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response) setIsOnline(true);
      } catch (err) {
        console.warn('⚠️ Falló ping de red local, interpretando como offline:', err.message);
        setIsOnline(false);
      }
    }, 15000); // 15 segundos — solo actúa cuando estamos offline

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionInterval);
    };
  }, [syncOfflineData]);

  // Cargar datos cuando el usuario inicia sesión
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchInventory();
      fetchActiveShift();
      fetchSalesGoal();
      fetchMonthlySalesTotal();
    }
  }, [user]);

  // --- SUSCRIPCIONES EN TIEMPO REAL ---
  const onSalesUpdateRef = useRef(() => {});
  const fetchInventoryRef = useRef(fetchInventory);
  const fetchProductsRef = useRef(fetchProducts);

  useEffect(() => {
    onSalesUpdateRef.current = (payload) => {
      console.log('🔄 Procesando actualización realtime (Context):', payload);

      // 1. Actualización Optimista (Immediate UI Feedback)
      if (payload.eventType === 'UPDATE' && payload.new) {
        setSales(prev => prev.map(sale => {
          if (sale.id === payload.new.id) {
            return { ...sale, ...payload.new };
          }
          return sale;
        }));

        if (selectedSale && selectedSale.id === payload.new.id) {
          setSelectedSale(prev => ({ ...prev, ...payload.new }));
        }
      }

      // 2. Refresco completo
      fetchSales();
      fetchMonthlySalesTotal();
      if (userRole === 'admin') calculateFinances();
    };
  });

  useEffect(() => {
    fetchInventoryRef.current = fetchInventory;
    fetchProductsRef.current = fetchProducts;
  });

  useEffect(() => {
    const channel = supabase
      .channel('inventory_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          console.log('🔔 Cambio detectado en base de datos (inventory):', payload);
          if (fetchInventoryRef.current) fetchInventoryRef.current();
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción Realtime (Inventory):', status);
      });

    const productsChannel = supabase
      .channel('products_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('🔔 Cambio detectado en productos:', payload);
          if (fetchProductsRef.current) fetchProductsRef.current();
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción Realtime (Products):', status);
      });

    const salesChannel = supabase
      .channel('sales_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('🔔 Cambio detectado en ventas:', payload);
          if (onSalesUpdateRef.current) onSalesUpdateRef.current(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción Realtime (Sales):', status);
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(salesChannel);
    };
  }, []);

  // Retornar los valores expuestos
  return (
    <DataContext.Provider value={{
      showToast,
      user, setUser, userRole, setUserRole, loading, setLoading, fetchProfile, handleLogout, login,
      products, setProducts, fetchError, inventoryList, setInventoryList, fetchProducts, fetchInventory,
      categories, uploadTicketImage,
      isOnline, isSyncing, hasPendingItems, pendingSales, checkPendingItems, syncOfflineData,
      activeShift, setActiveShift, showArqueoHistory, setShowArqueoHistory, fetchActiveShift,
      cashInitialFund, setCashInitialFund, cashPhysicalCount, setCashPhysicalCount,
      cashObservations, setCashObservations, arqueoHistory, setArqueoHistory, cashReportData, setCashReportData,
      runCashArqueo, handleOpenShift, handleCloseShift, fetchArqueoHistory,
      starStartDate, setStarStartDate, starEndDate, setStarEndDate, starData, setStarData, kpiData, setKpiData, fetchStarProducts,
      sales, setSales, salesOffset, setSalesOffset, hasMoreSales, setHasMoreSales, loadMoreSales,
      reportStartDate, setReportStartDate, reportEndDate, setReportEndDate,
      totalIngresosReporte, setTotalIngresosReporte, totalSalesCount, setTotalSalesCount,
      reportExpenses, setReportExpenses, selectedSale, setSelectedSale, fetchSales, fetchReportExpenses,
      updateSaleStatus, cancelOfflineSale, markAsPaid,
      salesGoal, setSalesGoal, monthlySalesTotal, setMonthlySalesTotal, finData, setFinData,
      dailyExpensesList, setDailyExpensesList, dailyStockList, setDailyStockList, dailySalesList, setDailySalesList,
      financeStartDate, setFinanceStartDate, financeEndDate, setFinanceEndDate, calculateFinances, fetchSalesGoal, updateSalesGoalInDB,
      getMXDate, getMXTimestamp
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe usarse dentro de un DataProvider');
  }
  return context;
};
