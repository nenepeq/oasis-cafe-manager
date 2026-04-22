import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { getProducts } from './api';
import {
  Coffee, Snowflake, CupSoda, Utensils, ShoppingCart,
  LogOut, IceCream, FileText, RefreshCw, CakeSlice,
  Banknote, RotateCcw, X, Package, PieChart, Award, Trash2, Plus, Minus, CreditCard,
  Wifi, WifiOff, CloudSync, ClipboardList, Clock, Search,
  Sun, Moon // Iconos añadidos
} from 'lucide-react';
import { logActivity } from './utils/logger';
import { 
  savePendingSale, 
  savePendingExpense, 
  savePendingPurchase, 
  savePendingShrinkage,
  getAllPendingItems, 
  clearPendingItem 
} from './utils/db';
import { compressImage } from './utils/imageOptimizer';
import { useToast } from './hooks/useToast.jsx';

// Componentes
import Login from './components/Login';
import InventoryModal from './components/InventoryModal';
import FinanceModal from './components/FinanceModal';
import SalesModal from './components/SalesModal';
import CashArqueoModal from './components/CashArqueoModal';
import StarProductsModal from './components/StarProductsModal';
import CatalogModal from './components/CatalogModal';
import { generateTicketPDF } from './utils/ticketGenerator';




// Función Helper para obtener la fecha actual en formato YYYY-MM-DD (Zona México)
const getMXDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

/**
 * Función Helper para obtener timestamp ISO ajustado a zona horaria de México
 * Evita que registros nocturnos (después de las 6 PM) aparezcan como del día siguiente
 * @returns {string} Timestamp ISO en zona horaria America/Mexico_City
 */
const getMXTimestamp = () => {
  // Obtener componentes de fecha/hora en zona horaria de México
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(new Date());
  const values = {};
  parts.forEach(({ type, value }) => {
    values[type] = value;
  });

  // Validación de seguridad
  if (!values.year || !values.month || !values.day) {
    return new Date().toISOString(); 
  }

  // Construir string ISO en zona horaria de México con desfase -06:00
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}-06:00`;
};

function App() {
  // --- ESTADOS DE AUTENTICACIÓN Y PERFIL ---
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('ventas');
  const [loading, setLoading] = useState(false);
  const [confirmPaymentStep, setConfirmPaymentStep] = useState(false); // Safety toggle
  const { showToast } = useToast();

  // --- ESTADOS DE DATOS PRINCIPALES ---
  const [products, setProducts] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [inventoryList, setInventoryList] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // --- ESTADOS DE CONTROL DE MODALES ---
  const [showInventory, setShowInventory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showFinances, setShowFinances] = useState(false);
  const [showCashArqueo, setShowCashArqueo] = useState(false);
  const [showStarProducts, setShowStarProducts] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [pendingSales, setPendingSales] = useState([]);


  // --- TEMA (DARK MODE) ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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


  // --- ESTADOS DE REPORTES DE VENTAS ---
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [totalIngresosReporte, setTotalIngresosReporte] = useState(0);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [reportStartDate, setReportStartDate] = useState(getMXDate());
  const [reportEndDate, setReportEndDate] = useState(getMXDate());
  const [reportExpenses, setReportExpenses] = useState([]);

  // --- ESTADOS DE FINANZAS ---
  const [financeStartDate, setFinanceStartDate] = useState(getMXDate());
  const [financeEndDate, setFinanceEndDate] = useState(getMXDate());
  const [finData, setFinData] = useState({
    ingresos: 0, costoProductos: 0, gastosOps: 0, gastosStock: 0,
    totalEgresos: 0, utilidadNeta: 0, margen: 0
  });
  const [dailyExpensesList, setDailyExpensesList] = useState([]);
  const [dailyStockList, setDailyStockList] = useState([]);
  const [dailySalesList, setDailySalesList] = useState([]);

  // --- ESTADOS DE FORMULARIOS (INVENTARIO/GASTOS) ---
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [selectedPurchaseProd, setSelectedPurchaseProd] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(0);
  const [purchaseCost, setPurchaseCost] = useState(0);

  // Mermas (Shrinkage)
  const [selectedShrinkageProd, setSelectedShrinkageProd] = useState('');
  const [shrinkageQty, setShrinkageQty] = useState(0);
  const [shrinkageReason, setShrinkageReason] = useState('Dañado');

  const [expenseConcepto, setExpenseConcepto] = useState('');
  const [expenseCategoria, setExpenseCategoria] = useState('Insumos');
  const [expenseMonto, setExpenseMonto] = useState(0);
  const [expenseCart, setExpenseCart] = useState([]);
  const [expenseFile, setExpenseFile] = useState(null);
  const [purchaseFile, setPurchaseFile] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([
    'Insumos y Alimentos', 'Empaques y Desechables', 'Operación del Local', 'Personal', 'Finanzas y Control', 'Otros'
  ]);
  const [expenseSuggestions, setExpenseSuggestions] = useState([]);

  // --- ESTADO DE CONFIGURACIÓN ---
  const [salesGoal, setSalesGoal] = useState(50000);
  const [monthlySalesTotal, setMonthlySalesTotal] = useState(0);

  const fetchMonthlySalesTotal = async () => {
    try {
      const now = new Date();
      // Obtener mes y año en CDMX
      const mxDateStr = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'numeric', day: 'numeric' });
      const [month, day, year] = mxDateStr.split(',')[0].split('/').map(n => parseInt(n));

      // Primer día del mes (en formato YYYY-MM-DD para Supabase)
      const startStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00-06:00`;

      // Último día del mes
      const lastDay = new Date(year, month, 0);
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}T23:59:59-06:00`;

      const { data, error } = await supabase
        .from('sales')
        .select('total')
        .neq('status', 'cancelado')
        .neq('payment_method', 'A Cuenta')
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .limit(5000);

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
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'sales_goal')
        .maybeSingle();

      if (!error && data) {
        setSalesGoal(parseFloat(data.value) || 50000);
      } else if (!error && !data) {
        // Si no existe, intentar leer de localStorage como fallback inicial
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
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'sales_goal', value: newGoal.toString() });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error updating sales goal:', err);
      return { success: false, error: err };
    }
  };

  // --- SPOTLIGHT SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [fabPosition, setFabPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 120 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // Refs for Click Outside Detection
  const searchInputRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const mobileFabRef = useRef(null);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSearchOpen &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target) &&
        (!desktopSearchRef.current || !desktopSearchRef.current.contains(event.target)) &&
        (!mobileFabRef.current || !mobileFabRef.current.contains(event.target)) &&
        !event.target.closest('.product-card') && // Ignore clicks on products
        !event.target.closest('.cart-section')    // Ignore clicks on cart
      ) {
        setIsSearchOpen(false);
        setSearchQuery(''); // Clear query on close
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  // Drag Handlers
  const handleDragStart = (e) => {
    isDragging.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - fabPosition.x,
      y: clientY - fabPosition.y
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e) => {
    isDragging.current = true; // It moved, so it's a drag
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Prevent default scrolling on touch
    if (e.touches && typeof e.preventDefault === 'function') e.preventDefault();
    if (e.preventDefault) e.preventDefault();

    let newX = clientX - dragOffset.current.x;
    let newY = clientY - dragOffset.current.y;

    // Constrain to screen bounds (Button size approx 55px)
    const buttonSize = 60; // 55px + padding margin safety
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;

    if (newX < 0) newX = 0;
    if (newX > maxX) newX = maxX;
    if (newY < 0) newY = 0;
    if (newY > maxY) newY = maxY;

    setFabPosition({ x: newX, y: newY });
  };

  const handleFabClick = () => {
    if (!isDragging.current) {
      if (isSearchOpen) {
        setSearchQuery(''); // Clear query when closing manually
      }
      setIsSearchOpen(!isSearchOpen);
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
  }, [products, products.length]); // Added products.length for safety, though products should be enough if it's an array

  const checkPendingItems = React.useCallback(async () => {
    const { sales, expenses, purchases } = await getAllPendingItems();
    setHasPendingItems(sales.length > 0 || expenses.length > 0 || purchases.length > 0);
    setPendingSales(sales);
  }, []);

  const syncOfflineData = React.useCallback(async () => {
    console.log('🔄 Intento de sincronización. isSyncingRef:', isSyncingRef.current, 'online:', isOnline);
    if (isSyncingRef.current || !isOnline) return;
    isSyncingRef.current = true; // LOCK INMEDIATO para evitar condiciones de carrera

    const { sales, expenses, purchases } = await getAllPendingItems();
    console.log('📦 Items pendientes encontrados:', { sales: sales.length, expenses: expenses.length, purchases: purchases.length });

    if (sales.length === 0 && expenses.length === 0 && purchases.length === 0) {
      setHasPendingItems(false);
      isSyncingRef.current = false; // Liberar lock si no hay nada
      return;
    }

    setIsSyncing(true);
    showToast('🔄 Sincronizando datos pendientes...', 'info', 2000);
    console.log('🚀 Iniciando sincronización...');

    try {
      // Sync Ventas
      for (const s of sales) {
        try {
          // 1. VERIFICAR SI YA EXISTE (Idempotencia)
          // Usamos timestamp exacto original + usuario creador como llave única compuesta
          const { data: existing } = await supabase.from('sales')
            .select('id')
            .eq('created_at', s.timestamp)
            .eq('created_by', s.created_by)
            .maybeSingle();

          if (existing) {
            console.warn(`⚠️ Venta offline ya sincronizada previamente (ID: ${existing.id}). Limpiando local...`);
            await clearPendingItem('pending_sales', s.id);
            continue; // Saltamos inserción
          }

          const { data: sale, error: saleError } = await supabase.from('sales').insert([{
            total: s.total, status: s.status, created_by: s.created_by,
            customer_name: s.customer_name, payment_method: s.payment_method,
            created_at: s.timestamp
          }]).select().single();

          if (!saleError && sale) {
            const { error: itemsError } = await supabase.from('sale_items').insert(s.items.map(item => ({
              sale_id: sale.id,
              product_id: item.id,
              quantity: item.quantity,
              price: item.sale_price,
              sale_ticket_number: sale.ticket_number // Incluir número de ticket generado
            })));

            if (!itemsError) {
              // ACTUALIZACIÓN DE INVENTARIO: SE ELIMINA LA ACTUALIZACIÓN MANUAL
              // PORQUE LA BASE DE DATOS TIENE UN TRIGGER QUE LO MANEJA AUTOMÁTICAMENTE.
              // ESTO EVITA LA DOBLE DEDUCCIÓN DE INVENTARIO.

              await clearPendingItem('pending_sales', s.id);
              await logActivity(s.created_by, 'SYNC_VENTA_OFFLINE', 'VENTAS', { sale_id: sale.id });
            } else {
              console.error('Error sincronizando items:', itemsError);
            }
          } else {
            console.error('Error sincronizando venta:', saleError);
          }
        } catch (e) {
          console.error('Error crítico en sync venta:', e);
        }
      }

      // Sync Gastos
      for (const g of expenses) {
        try {
          // Idempotencia para gastos offline
          const { data: existing } = await supabase.from('expenses')
            .select('id')
            .eq('created_at', g.timestamp)
            .eq('created_by', g.created_by)
            .maybeSingle();

          if (existing) {
            await clearPendingItem('pending_expenses', g.id);
            continue;
          }

          const { error: expError } = await supabase.from('expenses').insert([{
            monto: g.monto,
            concepto: g.concepto,
            categoria: g.categoria,
            fecha: g.fecha, // Usar la fecha local guardada
            created_by: g.created_by,
            created_at: g.timestamp
          }]);

          if (!expError) {
            await clearPendingItem('pending_expenses', g.id);
            await logActivity(g.created_by, 'SYNC_GASTO_OFFLINE', 'FINANZAS', { amount: g.monto });
          } else {
            console.error('Error sincronizando gasto:', expError);
          }
        } catch (e) { console.error('Error sync gasto:', e); }
      }

      // Sync Compras (Stock)
      for (const p of purchases) {
        try {
          // Idempotencia para compras offline
          const { data: existing } = await supabase.from('purchases')
            .select('id')
            .eq('created_at', p.timestamp)
            .eq('created_by', p.created_by)
            .maybeSingle();

          if (existing) {
            await clearPendingItem('pending_purchases', p.id);
            continue;
          }

          // 1. Insertar en la tabla principal 'purchases'
          const { data: purchase, error: purError } = await supabase.from('purchases').insert([{
            total: p.total,
            created_by: p.created_by,
            created_at: p.timestamp
            // ticket_url no se maneja en sync offline por ahora (requiere subir archivo)
          }]).select().single();

          if (!purError && purchase) {
            // 2. Insertar items en 'purchase_items'
            const itemsToInsert = p.items.map(item => ({
              purchase_id: purchase.id,
              product_id: item.id,
              product_name: item.name,
              quantity: item.qty,
              cost: item.cost,
              purchase_number: purchase.purchase_number
            }));

            const { error: itemsError } = await supabase.from('purchase_items').insert(itemsToInsert);

            if (!itemsError) {
              await clearPendingItem('pending_purchases', p.id);
              await logActivity(p.created_by, 'SYNC_COMPRA_OFFLINE', 'INVENTARIO', { total: p.total });
            } else {
              console.error('Error sincronizando items de compra:', itemsError);
            }
          } else {
            console.error('Error sincronizando compra:', purError);
          }
        } catch (e) { console.error('Error sync compra:', e); }
      }

      // Sync Mermas (Shrinkage)
      const { shrinkages } = await getAllPendingItems();
      for (const s of (shrinkages || [])) {
        try {
          const { data: existing } = await supabase.from('expenses')
            .select('id')
            .eq('created_at', s.timestamp)
            .eq('created_by', s.created_by)
            .maybeSingle();

          if (existing) {
            await clearPendingItem('pending_shrinkage', s.id);
            continue;
          }

          const { data: currentInv } = await supabase.from('inventory')
            .select('stock')
            .eq('product_id', s.product_id)
            .single();

          if (currentInv) {
            await supabase.from('inventory')
              .update({ stock: currentInv.stock - s.quantity })
              .eq('product_id', s.product_id);
          }

          const { error: expError } = await supabase.from('expenses').insert([{
            concepto: `Merma (Sync): ${s.quantity}x ${s.product_name} (${s.reason})`,
            categoria: 'Merma',
            monto: 0,
            fecha: s.timestamp.split('T')[0],
            created_by: s.created_by,
            created_at: s.timestamp
          }]);

          if (!expError) {
            await clearPendingItem('pending_shrinkage', s.id);
            await logActivity(s.created_by, 'SYNC_MERMA_OFFLINE', 'INVENTARIO', { product: s.product_name });
          }
        } catch (e) { console.error('Error sync merma:', e); }
      }

      await checkPendingItems();
      await fetchInventory(); // Refrescar stock real desde la nube
      if (userRole === 'admin') await calculateFinances(); // Refrescar finanzas
      console.log('🏁 Sincronización completada con éxito.');
      showToast('✅ Datos sincronizados correctamente', 'success');

    } catch (err) {
      console.error('Error general en sincronización:', err);
      showToast('⚠️ Error en la sincronización automática', 'error');
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [checkPendingItems, isOnline, userRole]);

  // --- EFECTOS INICIALES Y CARGA DE DATOS ---
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { 
    isOnlineRef.current = isOnline;
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline, syncOfflineData]);

  useEffect(() => {
    const handleOnline = () => { 
      if (!isOnlineRef.current) {
        setIsOnline(true); 
        syncOfflineData(); 
      }
    };
    const handleOffline = () => {
      if (isOnlineRef.current) setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat ultra-agresivo (5s) para detectar modo avión en Windows
    const connectionInterval = setInterval(async () => {
      const now = new Date().toLocaleTimeString();
      const navStatus = navigator.onLine;
      
      try {
        // 1. Verificación rápida con navigator.onLine
        if (!navStatus) {
          if (isOnlineRef.current) {
            console.log(`[${now}] 📡 Red: navigator.onLine detectó OFFLINE.`);
            setIsOnline(false);
          }
          return;
        }

        // 2. Verificación real con un ping HTTP (evitando el SDK para ser más directos)
        // Usamos el endpoint de Supabase directamente con un timeout muy agresivo
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          // Si llegamos aquí, hay algún tipo de respuesta de red
          if (!isOnlineRef.current) {
            console.log(`[${now}] 📡 Red: Conexión RESTABLECIDA.`);
            setIsOnline(true);
            syncOfflineData();
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (isOnlineRef.current) {
            console.log(`[${now}] 📡 Red: Ping falló (Probable Modo Avión/Sin Internet).`, fetchError);
            setIsOnline(false);
          }
        }
      } catch (err) {
        console.error(`[${now}] 📡 Red: Error crítico en heartbeat:`, err);
      }
    }, 5000);

    // Verificar items pendientes
    checkPendingItems();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionInterval);
    };
  }, [syncOfflineData, checkPendingItems]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user);
    });
  }, []);

  const fetchProfile = async (currentUser) => {
    setUser(currentUser);
    const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    if (data && data.role) setUserRole(data.role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole('ventas');
  };

  // Ref para manejar la callback de realtime siempre con el estado más reciente
  const onSalesUpdateRef = useRef(() => { });

  // Actualizamos el ref en cada render (o cuando cambien las deps relevantes)
  useEffect(() => {
    onSalesUpdateRef.current = (payload) => {
      console.log('🔄 Procesando actualización realtime:', payload);

      // 1. Actualización Optimista (Immediate UI Feedback)
      if (payload.eventType === 'UPDATE' && payload.new) {
        setSales(prev => prev.map(sale => {
          if (sale.id === payload.new.id) {
            // Preservamos los items y solo actualizamos campos cambiados de la venta
            return { ...sale, ...payload.new };
          }
          return sale;
        }));

        // Si la venta actualizada es la que está seleccionada actualmente, actualizamos también su estado en la vista detallada
        if (selectedSale && selectedSale.id === payload.new.id) {
          setSelectedSale(prev => ({ ...prev, ...payload.new }));
        }
      }

      // 2. Refresco completo para asegurar consistencia (relaciones, totales calculados, etc)
      fetchSales();
      fetchMonthlySalesTotal();
      if (userRole === 'admin') calculateFinances();
    };
  }); // Sin array de dependencias, se actualiza en cada render

  // Suscripción a cambios en tiempo real de Supabase (Tabla inventory)
  useEffect(() => {
    const channel = supabase
      .channel('inventory_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          console.log('🔔 Cambio detectado en base de datos:', payload);
          fetchInventory();
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción Realtime (Inventory):', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error de conexión Realtime en inventory.');
        }
      });

    const productsChannel = supabase
      .channel('products_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('🔔 Cambio detectado en productos:', payload);
          fetchProducts();
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
          // Llamamos a la función a través del ref para evitar stale closures
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
  }, []); // Array vacío: Solo se suscribe una vez al montar

  const fetchProducts = async () => {
    const res = await getProducts();
    if (res.error) setFetchError(res.error.message);
    else { setProducts(res.data || []); setFetchError(null); }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchInventory();
      fetchActiveShift();
      fetchSalesGoal();
      fetchMonthlySalesTotal();
    }
  }, [user]);

  const fetchActiveShift = async () => {
    const { data, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('status', 'open')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      setActiveShift(data);
      if (data) setCashInitialFund(data.initial_fund);
    }
  };

  // --- LÓGICA DE INVENTARIO ---
  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('stock, product_id, products:product_id (name)');
    if (!error && data) {
      const sortedData = data.sort((a, b) =>
        (a.products?.name || "").localeCompare(b.products?.name || "", 'es', { sensitivity: 'base' })
      );
      setInventoryList(sortedData);
    }
  };

  // --- LÓGICA DE WHATSAPP ---
  const generateWhatsAppMessage = (sale, items) => {
    const dateStr = new Date(sale.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    let message = `☕ *Oasis Café - Ticket* ☕\n`;
    message += `----------------------------------\n`;
    message += `¡Hola *${sale.customer_name}*! Gracias por tu preferencia. ✨\n\n`;
    message += `🛒 *DETALLE DEL PEDIDO:*\n`;

    items.forEach(item => {
      message += `• ${item.quantity}x ${item.name} ... $${(item.quantity * item.sale_price).toFixed(2)}\n`;
    });

    message += `\n----------------------------------\n`;
    message += `💰 *TOTAL: $${sale.total.toFixed(2)}*\n`;
    message += `💳 Pago: ${sale.payment_method}\n`;
    message += `📅 Fecha: ${dateStr}\n\n`;
    message += `_¡Esperamos verte pronto!_ 🧉`;

    return encodeURIComponent(message);
  };

  /**
   * Sube una imagen al bucket de Supabase Storage
   * @param {File} file Archivo a subir
   * @param {string} folder Carpeta dentro del bucket (opcional)
   * @returns {string|null} URL pública de la imagen o null si falla
   */
  const uploadTicketImage = async (file, folder = 'general') => {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // OPTIMIZACIÓN DE IMAGEN
      let fileToUpload = file;
      try {
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
      } catch (optErr) {
        console.warn('Falló optimización de imagen, subiendo original:', optErr);
      }

      const { data, error } = await supabase.storage
        .from('tickets')
        .upload(fileName, fileToUpload);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('tickets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error subiendo imagen:', error.message);
      showToast('Error al subir la imagen del ticket: ' + error.message, 'error');
      return null;
    }
  };

  // --- LÓGICA DE VENTAS ---
  const addToCart = (product) => {
    const inventoryItem = inventoryList.find(inv => inv.product_id === product.id);
    const totalStock = inventoryItem ? inventoryItem.stock : 0;
    const itemInCart = cart.find(i => i.id === product.id);
    const qtyInCart = itemInCart ? itemInCart.quantity : 0;

    if (qtyInCart + 1 > totalStock) {
      showToast(`⚠️ FUERA DE STOCK: Solo quedan ${totalStock - qtyInCart} unidades de ${product.name}`, 'warning');
      return;
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQty = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.id !== productId));
      return;
    }

    if (delta > 0) {
      const inventoryItem = inventoryList.find(inv => inv.product_id === productId);
      const totalStock = inventoryItem ? inventoryItem.stock : 0;
      if (newQty > totalStock) {
        showToast(`⚠️ FUERA DE STOCK: Solo quedan ${totalStock} unidades`, 'warning');
        return;
      }
    }

    setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity: newQty } : i));
  };

  const handleSale = async () => {
    if (cart.length === 0 || loading) return;
    // Verificación de stock previa (doble check)
    for (const item of cart) {
      const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
      const stockDisponible = currentInvItem?.stock || 0;
      if (item.quantity > stockDisponible) {
        showToast(`⚠️ STOCK INSUFICIENTE: ${item.name} tiene ${stockDisponible} unidades, intentas vender ${item.quantity}.`, 'error');
        setLoading(false);
        return;
      }
    }

    const total = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);

    // Validación para A Cuenta
    if (paymentMethod === 'A Cuenta' && !customerName.trim()) {
      showToast("⚠️ Para ventas A CUENTA, debes ingresar el nombre del cliente obligatoriamente.", "warning");
      return;
    }

    // Venta directa sin confirmación ni cálculo de cambio

    setLoading(true);
    try {
      // SI ESTAMOS OFFLINE, GUARDAR LOCALMENTE
      if (!isOnline) {
        await savePendingSale({
          total: cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0),
          status: "recibido",
          created_by: user.id,
          customer_name: customerName.trim() || 'Cliente Mostrador',
          payment_method: paymentMethod,
          items: cart,
          timestamp: getMXTimestamp() // Usar zona horaria de México
        });

        // Actualizar stock localmente para feedback inmediato en UI (Protegiendo contra negativos)
        setInventoryList(prev => prev.map(inv => {
          const itemInCart = cart.find(c => c.id === inv.product_id);
          if (itemInCart) {
            const newStock = Math.max(0, inv.stock - itemInCart.quantity);
            return { ...inv, stock: newStock };
          }
          return inv;
        }));

        setHasPendingItems(true);
        await checkPendingItems(); // Refresh pending sales list
        showToast("💾 Sin internet. Venta guardada localmente.", "info");
        setCart([]); setCustomerName(''); setCustomerPhone('');
        setLoading(false);
        return;
      }

      const { data: sale, error: saleError } = await supabase.from('sales').insert([{
        total: total,
        status: "recibido",
        created_by: user.id,
        customer_name: customerName.trim() || 'Cliente Mostrador',
        payment_method: paymentMethod
      }]).select().single();

      if (saleError) throw saleError;

      await supabase.from('sale_items').insert(cart.map(item => ({
        sale_id: sale.id, product_id: item.id, quantity: item.quantity, price: item.sale_price, sale_ticket_number: sale.ticket_number
      })));

      // ACTUALIZACIÓN DE INVENTARIO: SE ELIMINA LA ACTUALIZACIÓN MANUAL EN EL FRONTEND.
      // SE CONFIRMÓ QUE EXISTE UN TRIGGER EN LA BASE DE DATOS QUE DESCUENTA EL STOCK
      // CUANDO SE INSERTAN ÍTEMS EN 'sale_items' O SE CREA UNA VENTA.
      // ESTO RESUELVE EL PROBLEMA DE QUE SE DESCUENTEN DOS PIEZAS POR VENTA.

      showToast("✅ Venta registrada", "success");

      // LOG DE ACTIVIDAD
      await logActivity(user.id, 'CREACION_VENTA', 'VENTAS', {
        sale_id: sale.id,
        total: sale.total,
        customer: sale.customer_name,
        payment_method: sale.payment_method,
        items_count: cart.length
      });


      // Ticket y WhatsApp omitidos por configuración rápida

      setCart([]); setCustomerName(''); setCustomerPhone(''); fetchInventory();

    } catch (err) { showToast("Error: " + err.message, "error"); }
    setLoading(false);
  };

  const handleNewOrder = () => {
    if (window.confirm("¿Iniciar pedido nuevo?")) {
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('Efectivo');
    }
  };

  // --- LÓGICA DE REPORTES Y MODALES ---
  useEffect(() => {
    if (showReport && user) {
      if (reportStartDate <= reportEndDate) {
        fetchSales();
        fetchReportExpenses();
        fetchMonthlySalesTotal();
      } else {
        setSales([]);
        setReportExpenses([]);
        setTotalIngresosReporte(0);
      }
    }
  }, [showReport, reportStartDate, reportEndDate]);
  useEffect(() => {
    if (showFinances && user && userRole === 'admin') {
      if (financeStartDate <= financeEndDate) {
        calculateFinances();
        fetchMonthlySalesTotal();
      } else {
        setFinData({
          ingresos: 0, costoProductos: 0, gastosOps: 0, gastosStock: 0,
          totalEgresos: 0, utilidadNeta: 0, margen: 0
        });
        setDailyExpensesList([]);
        setDailyStockList([]);
      }
    }
  }, [showFinances, financeStartDate, financeEndDate]);



  useEffect(() => {
    if (showFinances) {
      calculateFinances();
      fetchMonthlySalesTotal();
    }
    // Always keep report updated when modals open
    if (showReport) {
      fetchSales();
      fetchMonthlySalesTotal();
    }
  }, [showFinances, financeStartDate, financeEndDate, showReport]);

  // Previous useEffect for runCashArqueo stays here
  useEffect(() => { if (showCashArqueo) runCashArqueo(); }, [cashInitialFund, cashPhysicalCount, showCashArqueo, activeShift]);


  // --- SALES PAGINATION STATE ---
  const [salesOffset, setSalesOffset] = useState(0);
  const [hasMoreSales, setHasMoreSales] = useState(true);
  const SALES_LIMIT = 50;

  const fetchSales = async (offset = 0) => {
    setLoading(true);
    if (offset === 0) setSales([]); // Limpiar historial previo para nueva búsqueda
    const from = offset;
    const to = offset + SALES_LIMIT - 1;

    let query = supabase.from('sales')
      .select(`*, sale_items (*, products (name, sale_price))`)
      .order('created_at', { ascending: false })
      .range(from, to);

    // Filtro de fecha con ajuste de Zona Horaria (UTC-6)
    let startDateFilter = null;
    let nextDayStrFilter = null;

    if (reportStartDate && reportEndDate) {
      // Fin del día local (23:59) es ~06:00 UTC del día siguiente
      const endDateObj = new Date(reportEndDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      nextDayStrFilter = endDateObj.toISOString().split('T')[0];
      startDateFilter = reportStartDate + 'T06:00:00';

      query = query
        .gte('created_at', startDateFilter) // 00:00 MX ~ 06:00 UTC
        .lt('created_at', nextDayStrFilter + 'T06:00:00');      // 00:00 MX día sig ~ 06:00 UTC día sig
    }

    const { data, error } = await query;

    if (!error) {
      if (offset === 0) {
        setSales(data || []);

        // --- Obtener Resumen Real del Periodo (Más allá del límite de 50) ---
        try {
          let summaryQuery = supabase.from('sales')
            .select('total')
            .neq('status', 'cancelado')
            .neq('payment_method', 'A Cuenta');

          if (startDateFilter && nextDayStrFilter) {
            summaryQuery = summaryQuery
              .gte('created_at', startDateFilter)
              .lt('created_at', nextDayStrFilter + 'T06:00:00');
          }

          const { data: summaryData } = await summaryQuery;
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

      // Si recibimos menos registros que el límite, no hay más
      if (data.length < SALES_LIMIT) {
        setHasMoreSales(false);
      } else {
        setHasMoreSales(true);
      }
      setSalesOffset(offset);
    } else {
      console.error("Error fetching sales:", error);
    }
    setLoading(false);
  };



  const fetchReportExpenses = async () => {
    setLoading(true);
    try {
      // Gastos usa columna 'fecha' tipo DATE
      const { data, error, count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .gte('fecha', reportStartDate)
        .lte('fecha', reportEndDate)
        .order('fecha', { ascending: false });

      if (!error) {
        console.log(`[DEBUG] Expenses found: ${data?.length || 0} (Total count: ${count}) for range ${reportStartDate} to ${reportEndDate}`);
        setReportExpenses(data || []);
      } else {
        console.error("[DEBUG] Error fetching report expenses:", error);
        showToast(`Error al cargar gastos: ${error.message}. Verifica las políticas RLS en Supabase.`, 'error');
      }
    } catch (err) {
      console.error("[DEBUG] Catch error fetching report expenses:", err);
    }
    setLoading(false);
  };

  const updateSaleStatus = async (saleId, newStatus) => {
    if (newStatus === 'cancelado' && userRole !== 'admin') return showToast("Solo admin puede cancelar", "warning");
    setLoading(true);
    try {
      if (newStatus === 'cancelado') {
        const { data: items } = await supabase.from('sale_items').select('product_id, quantity').eq('sale_id', saleId);
        for (const item of (items || [])) {
          const { data: inv } = await supabase.from('inventory').select('stock').eq('product_id', item.product_id).single();
          await supabase.from('inventory').update({ stock: inv.stock + item.quantity }).eq('product_id', item.product_id);
        }
      }
      await supabase.from('sales').update({ status: newStatus }).eq('id', saleId);

      // Actualizar el estado local para evitar el salto de scroll y pérdida de selección
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s));
      setSelectedSale(prev => prev && prev.id === saleId ? { ...prev, status: newStatus } : prev);

      showToast(`✅ Estatus: ${newStatus.toUpperCase()}`, "success");

      // LOG DE ACTIVIDAD
      await logActivity(user.id, `CAMBIO_ESTATUS_${newStatus.toUpperCase()}`, 'VENTAS', {
        sale_id: saleId,
        new_status: newStatus
      });

      calculateFinances(); fetchInventory(); fetchMonthlySalesTotal();

    } catch (err) { showToast('Error: ' + err.message, "error"); }
    setLoading(false);
  };

  const cancelOfflineSale = async (localId) => {
    if (userRole !== 'admin') return showToast("Solo admin puede cancelar", "warning");
    if (!window.confirm("¿Eliminar esta venta offline?")) return;

    try {
      await clearPendingItem('pending_sales', localId);
      await checkPendingItems(); // Refresca pendingSales y hasPendingItems
      setSelectedSale(null);
      showToast("✅ Venta offline eliminada correctamente", "success");
    } catch (err) {
      showToast("Error al eliminar venta offline: " + err.message, "error");
    }
  };

  const markAsPaid = async (saleId, method = 'Efectivo') => {
    setLoading(true);
    try {
      await supabase.from('sales').update({
        payment_method: method,
        status: 'entregado'
      }).eq('id', saleId);

      // Actualización local inmediata
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, payment_method: method, status: 'entregado' } : s));
      setSelectedSale(prev => prev && prev.id === saleId ? { ...prev, payment_method: method, status: 'entregado' } : prev);

      showToast(`✅ Venta cobrada con éxito (registrada como ${method})`, "success");
      await logActivity(user.id, 'COBRO_DEUDA', 'VENTAS', { sale_id: saleId, method });

      calculateFinances();
      fetchMonthlySalesTotal();
      fetchInventory();

    } catch (err) { showToast('Error al cobrar: ' + err.message, "error"); }
    setLoading(false);
  };

  const calculateFinances = async () => {
    if (userRole !== 'admin') return;
    setLoading(true);
    // Ajuste de Zona Horaria: Fin del día local (23:59) es ~06:00 UTC del día siguiente
    const endDateTime = new Date(financeEndDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    const nextDayStr = endDateTime.toISOString().split('T')[0];

    const { data: salesData } = await supabase.from('sales').select(`id, total, created_at, status, customer_name, payment_method, sale_items (quantity, price, products (name, cost_price))`)
      .gte('created_at', financeStartDate + 'T06:00:00').lt('created_at', nextDayStr + 'T06:00:00').neq('status', 'cancelado');

    let ingresos = 0, costoProds = 0;
    salesData?.forEach(s => { ingresos += s.total; s.sale_items?.forEach(i => costoProds += (i.quantity * (i.products?.cost_price || 0))); });

    // Gastos usa columna 'fecha' tipo DATE, no TIMESTAMP, así que no requiere ajuste de horas
    const { data: expData } = await supabase.from('expenses').select('*').gte('fecha', financeStartDate).lte('fecha', financeEndDate);

    const { data: purData } = await supabase.from('purchases').select(`*, purchase_items(*, products(name))`)
      .gte('created_at', financeStartDate + 'T06:00:00').lt('created_at', nextDayStr + 'T06:00:00');

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

      // Consultas paralelas para mejor rendimiento
      const [vResult, eResult, pResult] = await Promise.all([
        supabase.from('sales').select('total').eq('payment_method', 'Efectivo').neq('status', 'cancelado').gte('created_at', startTime),
        supabase.from('expenses').select('monto').gte('created_at', startTime),
        supabase.from('purchases').select('total').gte('created_at', startTime)
      ]);

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
      console.error("Error crítico en runCashArqueo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    if (cashInitialFund < 0 || loading) return showToast("Ingresa un fondo inicial válido", "warning");
    setLoading(true);
    const { data, error } = await supabase.from('cash_shifts').insert([{
      initial_fund: cashInitialFund,
      opened_by: user.id,
      status: 'open',
      start_time: getMXTimestamp() // Usar zona horaria de México
    }]).select().single();

    if (!error) {
      setActiveShift(data);
      setShowCashArqueo(false);
      setCashInitialFund(0);
      showToast("✅ Turno Abierto", "success");
      await logActivity(user.id, 'APERTURA_TURNO', 'FINANZAS', { initial_fund: cashInitialFund });
    } else {
      showToast("Error al abrir turno: " + error.message, "error");
    }
    setLoading(false);
  };

  const handleCloseShift = async () => {
    if (cashPhysicalCount <= 0 || loading) return showToast("Ingresa el efectivo contado", "warning");
    if (!window.confirm("¿Estás seguro de cerrar el turno?")) return;

    setLoading(true);
    const { error } = await supabase.from('cash_shifts').update({
      end_time: getMXTimestamp(), // Usar zona horaria de México
      actual_cash: cashPhysicalCount,
      expected_cash: cashReportData.esperado,
      difference: cashReportData.diferencia,
      sales_cash: cashReportData.ventasEfectivo, // Persistir ventas en efectivo
      expenses_cash: cashReportData.gastosEfectivo, // Persistir gastos en efectivo
      purchases_cash: cashReportData.comprasEfectivo, // NUEVO: Persistir compras en efectivo
      observations: cashObservations,
      closed_by: user.id,
      status: 'closed'
    }).eq('id', activeShift.id);

    if (!error) {
      showToast("✅ Turno Cerrado y Arqueo Guardado", "success");
      await logActivity(user.id, 'CIERRE_TURNO', 'FINANZAS', {
        expected: cashReportData.esperado,
        actual: cashPhysicalCount,
        difference: cashReportData.diferencia
      });
      setActiveShift(null);
      setShowCashArqueo(false);
      setCashPhysicalCount(0);
      setCashObservations('');
      setCashInitialFund(0);
    } else {
      showToast("Error al cerrar turno: " + error.message, "error");
    }
    setLoading(false);
  };

  const fetchArqueoHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cash_shifts').select('*').order('start_time', { ascending: false });
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
    // Ajuste de Zona Horaria: Fin del día local (23:59) es ~06:00 UTC del día siguiente
    const endDateTime = new Date(starEndDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    const nextDayStr = endDateTime.toISOString().split('T')[0];

    // Incluimos cost_price de los productos en la consulta
    const { data } = await supabase.from('sale_items').select(`quantity, price, products ( name, cost_price ), sales!inner ( id, created_at, status )`)
      .gte('sales.created_at', starStartDate + 'T06:00:00')
      .lt('sales.created_at', nextDayStr + 'T06:00:00')
      .neq('sales.status', 'cancelado');

    const grouping = (data || []).reduce((acc, item) => {
      const name = item.products?.name || 'Desconocido';
      if (!acc[name]) acc[name] = { name, totalQty: 0, totalRevenue: 0, totalCost: 0 };
      acc[name].totalQty += item.quantity;
      acc[name].totalRevenue += (item.quantity * item.price);
      acc[name].totalCost += (item.quantity * (item.products?.cost_price || 0));
      return acc;
    }, {});

    // --- CÁLCULO DE KPIs ---
    const salesIds = new Set();
    const hourlyDistribution = {}; // Para Hora Pico
    let totalRevenue = 0;
    let totalCost = 0;

    (data || []).forEach(item => {
      salesIds.add(item.sales.id);
      totalRevenue += (item.quantity * item.price);
      totalCost += (item.quantity * (item.products?.cost_price || 0));

      const hour = new Date(item.sales.created_at).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    // Encontrar hora con más items vendidos
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


  const handleRegisterPurchase = async () => {
    if (purchaseCart.length === 0 || loading) return;
    setLoading(true);
    try {
      let ticketUrl = null;
      // Solo intentamos subir la imagen si tenemos internet real
      if (isOnline && purchaseFile) {
        ticketUrl = await uploadTicketImage(purchaseFile, 'compras');
      }

      if (!isOnline) {
        // --- FLUJO OFFLINE ---
        await savePendingPurchase({
          total: purchaseCart.reduce((a, i) => a + (i.cost * i.qty), 0),
          items: purchaseCart,
          created_by: user.id,
          file: purchaseFile, // Guardamos la imagen (ya comprimida) en IndexedDB
          timestamp: getMXTimestamp() // Usar zona horaria de México
        });

        // Actualización Optimista del Stock Local
        const newInventory = [...inventoryList];
        purchaseCart.forEach(item => {
          const idx = newInventory.findIndex(inv => inv.product_id === item.id);
          if (idx >= 0) {
            newInventory[idx] = { ...newInventory[idx], stock: newInventory[idx].stock + item.qty };
          }
        });
        setInventoryList(newInventory); // Actualizamos estado visual inmediatamente

        setHasPendingItems(true);
        showToast("📦 Sin internet. Compra guardada y stock actualizado localmente. Se sincronizará al volver la conexión.", "info");
      } else {
        // --- FLUJO ONLINE ---
        const { data: purchase } = await supabase.from('purchases').insert([{
          total: purchaseCart.reduce((a, i) => a + (i.cost * i.qty), 0),
          created_by: user.id,
          ticket_url: ticketUrl
        }]).select().single();

        for (const item of purchaseCart) {
          await supabase.from('purchase_items').insert([{
            purchase_id: purchase.id,
            product_id: item.id,
            product_name: item.name,
            quantity: item.qty,
            cost: item.cost,
            purchase_number: purchase.purchase_number
          }]);
          // La actualización de stock se maneja automáticamente en la DB vía triggers
        }
        showToast("📦 Stock Actualizado", "success");

        // LOG DE ACTIVIDAD
        await logActivity(user.id, 'REGISTRO_COMPRA_INVENTARIO', 'INVENTARIO', {
          purchase_id: purchase.id,
          total: purchase.total,
          items_count: purchaseCart.length
        });

        fetchInventory(); // Refrescar stock de la nube
      }

      // Limpieza de estados y cierre de modal inmediato
      setPurchaseCart([]); 
      setPurchaseFile(null);
      setShowInventory(false);

    } catch (err) { 
      console.error("Error en registro de compra:", err);
      showToast("Error: " + err.message, "error"); 
    }
    setLoading(false);
  };

  const handleRegisterShrinkage = async () => {
    if (!selectedShrinkageProd || shrinkageQty <= 0) return;
    setLoading(true);

    try {
      const prod = products.find(p => p.id === selectedShrinkageProd);
      const inv = inventoryList.find(i => i.product_id === selectedShrinkageProd);

      if (!inv || inv.stock < shrinkageQty) {
        throw new Error("No hay suficiente stock para registrar esta merma.");
      }

      if (!isOnline) {
        // --- FLUJO OFFLINE ---
        await savePendingShrinkage({
          product_id: selectedShrinkageProd,
          product_name: prod.name,
          quantity: shrinkageQty,
          reason: shrinkageReason,
          created_by: user.id,
          timestamp: getMXTimestamp()
        });

        // Actualización Optimista Local
        const newInventory = [...inventoryList];
        const idx = newInventory.findIndex(i => i.product_id === selectedShrinkageProd);
        if (idx >= 0) {
          newInventory[idx] = { ...newInventory[idx], stock: newInventory[idx].stock - shrinkageQty };
        }
        setInventoryList(newInventory);
        setHasPendingItems(true);
        showToast(`✅ Merma registrada localmente: ${prod.name}`, "info");
      } else {
        // --- FLUJO ONLINE ---
        // 1. Actualizar Inventario
        const { error: invError } = await supabase.from('inventory')
          .update({ stock: inv.stock - shrinkageQty })
          .eq('product_id', selectedShrinkageProd);
        if (invError) throw invError;

        // 2. Registrar como "Gasto" de $0 para historial
        const { error: expError } = await supabase.from('expenses').insert([{
          concepto: `Merma: ${shrinkageQty}x ${prod.name} (${shrinkageReason})`,
          categoria: 'Merma',
          monto: 0,
          fecha: getMXDate(),
          created_by: user.id
        }]);
        if (expError) throw expError;

        // 3. Log de Actividad
        await logActivity(user.id, 'REGISTRO_MERMA', 'INVENTARIO', {
          producto: prod.name,
          cantidad: shrinkageQty,
          motivo: shrinkageReason
        });

        // alert(`✅ Merma registrada de ${prod.name}`); // Eliminado para UX fluida
      }

      // Limpieza y cierre inmediato
      setSelectedShrinkageProd('');
      setShrinkageQty(0);
      setShrinkageReason('Dañado');
      setShowInventory(false);
      showToast("✅ Merma registrada con éxito", "success");

      if (isOnline) {
        fetchInventory();
        calculateFinances();
      }

    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterExpense = async () => {
    if (expenseCart.length === 0 || loading) return;
    setLoading(true);

    try {
      // 1. Subir Ticket una sola vez (si existe)
      let ticketUrl = null;
      if (isOnline && expenseFile) {
        ticketUrl = await uploadTicketImage(expenseFile, 'gastos');
      }

      const today = getMXDate();

      // 2. Preparar inserción masiva
      const timestamp = getMXTimestamp(); // Usar zona horaria de México

      if (!isOnline) {
        for (const item of expenseCart) {
          await savePendingExpense({
            concepto: item.concepto,
            categoria: item.categoria,
            monto: item.monto,
            fecha: today,
            created_by: user.id,
            file: expenseFile,
            timestamp // Usamos el mismo timestamp para todo el ticket
          });
        }
        setHasPendingItems(true);
      } else {
        const expensesToInsert = expenseCart.map(item => ({
          concepto: item.concepto,
          categoria: item.categoria,
          monto: item.monto,
          fecha: today,
          created_by: user.id,
          ticket_url: ticketUrl
          // created_at automatico por BD (UTC)
        }));

        const { error } = await supabase.from('expenses').insert(expensesToInsert);
        if (error) throw error;
      }

      // 3. Log General
      await logActivity(user.id, 'REGISTRO_TICKET_GASTOS', 'FINANZAS', {
        items_count: expenseCart.length,
        total: expenseCart.reduce((a, b) => a + b.monto, 0)
      });

      // alert(isOnline ? "✅ Ticket registrado con éxito" : "💰 Sin internet. Gastos guardados localmente."); // Eliminado para UX fluida

      // Limpiar todo al finalizar el ticket y cerrar modal
      setExpenseCart([]);
      setExpenseFile(null);
      setExpenseConcepto('');
      setExpenseMonto(0);
      setShowInventory(false);
      showToast(isOnline ? "✅ Ticket registrado con éxito" : "💰 Sin internet. Gastos guardados localmente.", "success");

      if (isOnline) {
        calculateFinances();
        fetchInventory();
      }

    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- UI HELPERS ---
  const getCategoryIcon = (p) => {
    const cat = (p.category || '').trim();
    if (cat === 'Bebidas Calientes') return <Coffee size={35} color="#8b5a2b" />;
    if (cat === 'Alimentos') return <Utensils size={35} color="#27ae60" />;
    if (cat === 'Frappés') return <Snowflake size={35} color="#3498db" />;
    if (cat === 'Bebidas Frías') return (
      <svg width={35} height={35} viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10" width="9" height="9" rx="2" />
        <path d="M4 14h9" strokeOpacity="0.3" />
        <path d="M8 10v9" strokeOpacity="0.3" />
        <rect x="11" y="5" width="9" height="9" rx="2" />
        <path d="M11 9h9" strokeOpacity="0.3" />
        <path d="M15 5v9" strokeOpacity="0.3" />
      </svg>
    );
    if (cat === 'Refrescos') return (
      <svg width={35} height={35} viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2h4" />
        <path d="M10 2v4c0 1.5-3 2.5-3 5v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8c0-2.5-3-3.5-3-5V2" />
        <path d="M7 11h10" strokeOpacity="0.3" />
        <path d="M7 15h10" strokeOpacity="0.3" />
        <path d="M10 5h4" strokeOpacity="0.5" />
      </svg>
    );
    if (cat === 'Postres' || cat === 'Sabritas y Otros') {
      if (cat === 'Postres') return <CakeSlice size={35} color="#e67e22" />;
      // Icono de bolsa de Sabritas (Chips Bag)
      return (
        <svg width={35} height={35} viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Bolsa con bordes dentados (zigzag) */}
          <path d="M6 5 L8 3 L10 5 L12 3 L14 5 L16 3 L18 5 v14 L16 21 L14 19 L12 21 L10 19 L8 21 L6 19 v-14 Z" />
          {/* Detalles de la bolsa */}
          <path d="M9 8h6" strokeOpacity="0.4" strokeWidth="1" />
          <circle cx="12" cy="13" r="2.5" strokeOpacity="0.3" />
          <path d="M10 17h4" strokeOpacity="0.4" strokeWidth="1" />
        </svg>
      );
    }
    return <Coffee size={35} color="#8b5a2b" />;
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Todos' ? true : (p.category || '').trim() === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isVisible = p.is_visible !== false;
    return matchesCategory && matchesSearch && isVisible;
  });

  if (!user) return <Login onLogin={fetchProfile} />;

  return (
    <div className="app-container" style={{
      display: 'flex',
      height: '100dvh', // Altura dinámica para móviles
      width: '100%',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      transition: 'background-color 0.3s ease, color 0.3s ease',
      overflowX: 'hidden',
      overflowY: 'hidden' // El scroll debe ser interno, no del contenedor principal
    }}>

      {/* SECCIÓN TIENDA */}
      <div className="store-section">
        <div className="sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src="/logo.png" 
              alt="Oasis" 
              className={!isOnline ? 'logo-offline' : ''}
              style={{ height: '35px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', transition: 'all 0.5s ease' }} 
            />
            {!isOnline && (
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 'bold', 
                backgroundColor: 'var(--color-danger)', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Modo Offline</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <div 
              className={!isOnline ? 'status-indicator-offline' : ''}
              title={isOnline ? (isSyncing ? 'Sincronizando...' : 'Conectado') : 'Sin Internet (Modo Avión)'} 
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px',
                borderRadius: '50%', background: isOnline ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                color: isOnline ? '#2d6a4f' : '#c0392b',
                border: isOnline ? '1px solid rgba(39, 174, 96, 0.3)' : '1px solid rgba(231, 76, 60, 0.3)',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}>
              {isOnline ? (isSyncing ? <CloudSync size={18} className="spin" /> : <Wifi size={18} />) : <WifiOff size={18} />}
              {hasPendingItems && !isSyncing && (
                <div style={{
                  position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px',
                  borderRadius: '50%', backgroundColor: '#f1c40f', border: '2px solid #fff', boxShadow: '0 0 5px rgba(0,0,0,0.2)'
                }} title="Datos pendientes de sincronizar" />
              )}
            </div>
            {isOnline && hasPendingItems && !isSyncing && (
              <button
                onClick={syncOfflineData}
                title="Sincronizar datos pendientes"
                className="btn-active-effect"
                style={{
                  background: '#f1c40f', color: '#fff', border: 'none', padding: '8px',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <RefreshCw size={16} />
              </button>
            )}
            {userRole === 'admin' && (
              <>
                <button onClick={() => setShowCatalog(true)} title="Gestión de Catálogo" className="btn-active-effect" style={{ background: '#4a3728', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><ClipboardList size={16} /></button>
                <button onClick={() => setShowInventory(true)} className="btn-active-effect" style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><Package size={16} /></button>
                <button onClick={() => { setShowStarProducts(true); fetchStarProducts(); }} className="btn-active-effect" style={{ background: '#f1c40f', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><Award size={16} /></button>
                <button onClick={() => { setShowCashArqueo(true); setCashObservations(''); setCashPhysicalCount(0); }} className="btn-active-effect" style={{ background: '#e67e22', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><Banknote size={16} /></button>
              </>
            )}
            <button onClick={() => setShowReport(true)} className="btn-active-effect" style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><FileText size={16} /></button>
            {userRole === 'admin' && <button onClick={() => setShowFinances(true)} className="btn-active-effect" style={{ background: '#9b59b6', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><PieChart size={16} /></button>}
            <button onClick={handleLogout} className="btn-active-effect" style={{ background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', padding: '8px', borderRadius: '10px' }}><LogOut size={16} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', flex: 1 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="btn-active-effect"
                style={{
                  padding: '8px 16px',
                  borderRadius: '15px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: selectedCategory === cat ? 'var(--text-primary)' : 'var(--bg-secondary)',
                  color: selectedCategory === cat ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Static Search Button for Desktop/Tablet */}
          {/* Only show if NO modals are open (same logic as mobile) */}
          {!showReport && !showInventory && !showFinances && !showCashArqueo && !showStarProducts && !showCatalog && (
            <div
              ref={desktopSearchRef}
              className="desktop-search-inline"
              onClick={() => {
                if (isSearchOpen) setSearchQuery('');
                setIsSearchOpen(!isSearchOpen);
              }}
              title="Buscar producto"
            >
              {isSearchOpen ? <X size={24} strokeWidth={3} /> : <Search size={24} strokeWidth={3} />}
            </div>
          )}
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '10px', WebkitOverflowScrolling: 'touch' }}>
          <div className="product-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '10px',
            padding: '5px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {filteredProducts.map(p => {
              const invItem = inventoryList.find(inv => inv.product_id === p.id);
              const cartItem = cart.find(i => i.id === p.id);
              const qtyInCart = cartItem ? cartItem.quantity : 0;
              const totalStock = invItem ? invItem.stock : 0;
              const isOutOfStock = totalStock - qtyInCart <= 0;

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                  disabled={isOutOfStock}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ transform: 'scale(0.8)' }}>{getCategoryIcon(p)}</div>
                  <div className="product-name" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                  <div className="product-price" style={{ color: 'var(--green_btn_primary)' }}>${parseFloat(p.sale_price).toFixed(2)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN CARRITO */}
      <div className="cart-section" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
        <div className="cart-header-compact" style={{ height: '25px', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ShoppingCart size={18} /> Carrito
            <button
              onClick={toggleTheme}
              className="btn-active-effect"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                marginLeft: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme === 'dark' ? '#f1c40f' : '#f39c12'
              }}
              title={theme === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="Pedido a nombre de..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: 'none', backgroundColor: '#3498db', color: '#fff', fontWeight: 'bold', boxSizing: 'border-box', fontSize: '13px' }}
          />
        </div>
        <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '5px', WebkitOverflowScrolling: 'touch' }}>
          {cart.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              fontSize: '13px',
              backgroundColor: idx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
              borderRadius: '8px',
              marginBottom: '8px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid var(--border-color)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              color: 'var(--text-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="btn-active-effect"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-highlight)', borderRadius: '8px', padding: '2px 5px', border: '1px solid var(--border-color)' }}>
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="btn-active-effect"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '2px' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ margin: '0 8px', fontWeight: 'bold', minWidth: '15px', textAlign: 'center', color: 'var(--text-primary)' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className={`btn-active-effect ${((inventoryList.find(inv => inv.product_id === item.id)?.stock || 0) <= item.quantity) ? 'opacity-50 pointer-events-none' : ''}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '2px' }}
                        disabled={(inventoryList.find(inv => inv.product_id === item.id)?.stock || 0) <= item.quantity}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: '#888' }}>x ${item.sale_price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div style={{ color: '#27ae60', fontWeight: '900' }}>${(item.sale_price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* CONTENEDOR DE PAGO FIJO ABAJO */}
        <div style={{ flexShrink: 0, borderTop: '1px solid #eee', paddingTop: '10px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <button onClick={() => setPaymentMethod('Efectivo')} className="btn-active-effect" style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: paymentMethod === 'Efectivo' ? '#27ae60' : '#999', color: '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Banknote size={16} /> EFECTIVO
            </button>
            <button onClick={() => setPaymentMethod('Tarjeta')} className="btn-active-effect" style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: paymentMethod === 'Tarjeta' ? '#3498db' : '#999', color: '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <CreditCard size={16} /> TARJETA
            </button>
            <button onClick={() => setPaymentMethod('A Cuenta')} className="btn-active-effect" style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: paymentMethod === 'A Cuenta' ? '#f39c12' : '#999', color: '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Clock size={16} /> A CUENTA
            </button>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#00913f', textAlign: 'center', marginBottom: '10px' }}>Total: ${cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0).toFixed(2)}</div>
          <button
            onClick={() => {
              if (!confirmPaymentStep) {
                setConfirmPaymentStep(true);
                setTimeout(() => setConfirmPaymentStep(false), 2000); // 2s timeout
              } else {
                handleSale();
                setConfirmPaymentStep(false);
              }
            }}
            disabled={loading || cart.length === 0}
            className={cart.length > 0 ? "btn-active-effect" : ""}
            style={{
              width: '100%',
              padding: '15px',
              background: confirmPaymentStep ? '#f39c12' : (cart.length > 0 ? '#e74c3c' : '#999'),
              color: '#fff',
              borderRadius: '12px',
              fontWeight: '900',
              border: 'none',
              cursor: cart.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              transform: confirmPaymentStep ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            {loading ? 'PROCESANDO...' : (confirmPaymentStep ? '¿CONFIRMAR PAGO?' : 'PAGAR')}
          </button>
        </div>
      </div>

      {/* MODALES MODULARIZADOS */}
      <InventoryModal
        showInventory={showInventory} setShowInventory={setShowInventory} userRole={userRole} fetchInventory={fetchInventory} loading={loading} inventoryList={inventoryList} products={products}
        selectedPurchaseProd={selectedPurchaseProd} setSelectedPurchaseProd={setSelectedPurchaseProd} purchaseQty={purchaseQty} setPurchaseQty={setPurchaseQty}
        purchaseCost={purchaseCost} setPurchaseCost={setPurchaseCost} purchaseCart={purchaseCart} setPurchaseCart={setPurchaseCart} handleRegisterPurchase={handleRegisterPurchase}
        expenseCategoria={expenseCategoria} setExpenseCategoria={setExpenseCategoria} expenseMonto={expenseMonto} setExpenseMonto={setExpenseMonto}
        expenseConcepto={expenseConcepto} setExpenseConcepto={setExpenseConcepto} expenseCategories={expenseCategories}
        expenseSuggestions={expenseSuggestions}
        expenseCart={expenseCart} setExpenseCart={setExpenseCart} handleRegisterExpense={handleRegisterExpense}
        expenseFile={expenseFile} setExpenseFile={setExpenseFile} purchaseFile={purchaseFile} setPurchaseFile={setPurchaseFile}
        selectedShrinkageProd={selectedShrinkageProd} setSelectedShrinkageProd={setSelectedShrinkageProd}
        shrinkageQty={shrinkageQty} setShrinkageQty={setShrinkageQty}
        shrinkageReason={shrinkageReason} setShrinkageReason={setShrinkageReason}
        handleRegisterShrinkage={handleRegisterShrinkage}
      />
      <FinanceModal
        showFinances={showFinances} setShowFinances={setShowFinances} userRole={userRole} financeStartDate={financeStartDate} setFinanceStartDate={setFinanceStartDate}
        financeEndDate={financeEndDate} setFinanceEndDate={setFinanceEndDate} calculateFinances={calculateFinances} loading={loading} finData={finData}
        dailyExpensesList={dailyExpensesList} dailyStockList={dailyStockList} dailySalesList={dailySalesList}
        salesGoal={salesGoal}
        monthlySalesTotal={monthlySalesTotal}
      />
      <SalesModal
        showReport={showReport} setShowReport={setShowReport} setSelectedSale={setSelectedSale} reportStartDate={reportStartDate} setReportStartDate={setReportStartDate}
        reportEndDate={reportEndDate} setReportEndDate={setReportEndDate} fetchSales={() => fetchSales(0)} loading={loading} sales={sales}
        selectedSale={selectedSale} userRole={userRole} updateSaleStatus={updateSaleStatus} markAsPaid={markAsPaid}
        cancelOfflineSale={cancelOfflineSale}
        pendingSales={pendingSales}
        loadMoreSales={() => fetchSales(salesOffset + 50)}
        hasMoreSales={hasMoreSales}
        salesGoal={salesGoal} setSalesGoal={updateSalesGoalInDB}
        totalIngresosReporte={totalIngresosReporte}
        totalSalesCount={totalSalesCount}
      />
      <CashArqueoModal
        showCashArqueo={showCashArqueo} setShowCashArqueo={setShowCashArqueo} userRole={userRole} fetchArqueoHistory={fetchArqueoHistory}
        cashInitialFund={cashInitialFund} setCashInitialFund={setCashInitialFund} cashReportData={cashReportData} cashPhysicalCount={cashPhysicalCount} setCashPhysicalCount={setCashPhysicalCount}
        cashObservations={cashObservations} setCashObservations={setCashObservations} handleOpenShift={handleOpenShift} handleCloseShift={handleCloseShift} loading={loading}
        activeShift={activeShift} showArqueoHistory={showArqueoHistory} setShowArqueoHistory={setShowArqueoHistory} arqueoHistory={arqueoHistory}
      />
      <StarProductsModal
        showStarProducts={showStarProducts} setShowStarProducts={setShowStarProducts} userRole={userRole} starStartDate={starStartDate} setStarStartDate={setStarStartDate}
        starEndDate={starEndDate} setStarEndDate={setStarEndDate} fetchStarProducts={fetchStarProducts} starData={starData} kpiData={kpiData}
      />
      <CatalogModal
        showCatalog={showCatalog} setShowCatalog={setShowCatalog} userRole={userRole} products={products} inventoryList={inventoryList} fetchProducts={fetchProducts} fetchInventory={fetchInventory} categories={categories}
      />

      {/* SPOTLIGHT SEARCH FAB & INPUT - Only visible if no modals are open */}
      {!showReport && !showInventory && !showFinances && !showCashArqueo && !showStarProducts && !showCatalog && (
        <div
          ref={mobileFabRef}
          className="mobile-fab-only"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onClick={handleFabClick}
          style={{
            position: 'fixed',
            left: fabPosition.x,
            top: fabPosition.y,
            width: '55px',
            height: '55px',
            borderRadius: '50%',
            // High Visibility Style
            background: 'linear-gradient(135deg, #e67e22, #d35400)', // Vibrant Orange gradient
            border: '2px solid #fff', // White border for separation
            boxShadow: '0 4px 15px rgba(230, 126, 34, 0.6)', // Orange glow shadow
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            zIndex: 2000,
            touchAction: 'none',
            transition: isDragging.current ? 'none' : 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Bouncy effect
          }}
        >
          {isSearchOpen ? <X size={28} color="#fff" strokeWidth={3} /> : <Search size={28} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {isSearchOpen && !showReport && !showInventory && !showFinances && !showCashArqueo && !showStarProducts && !showCatalog && (
        <div
          ref={searchInputRef}
          style={{
            position: 'fixed',
            top: '100px', // Just below header roughly
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '400px',
            zIndex: 1999
          }}>
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '15px 20px',
              borderRadius: '25px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(15px)',
              fontSize: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              outline: 'none',
              color: '#333'
            }}
          />
        </div>
      )}

    </div>
  );
}

export default App;