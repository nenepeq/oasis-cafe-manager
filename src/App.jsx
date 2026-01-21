import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { getProducts } from './api';
import {
  Coffee, Snowflake, CupSoda, Utensils, ShoppingCart,
  LogOut, IceCream, FileText, RefreshCw, CakeSlice,
  Banknote, RotateCcw, X, Package, PieChart, Award, Trash2, Plus, Minus, CreditCard,
  Wifi, WifiOff, CloudSync, ClipboardList, Clock
} from 'lucide-react';
import { logActivity } from './utils/logger';
import { savePendingSale, savePendingExpense, savePendingPurchase, getAllPendingItems, clearPendingItem } from './utils/db';

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

function App() {
  // --- ESTADOS DE AUTENTICACIÓN Y PERFIL ---
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('ventas');
  const [loading, setLoading] = useState(false);
  const [confirmPaymentStep, setConfirmPaymentStep] = useState(false); // Safety toggle

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
  const [reportStartDate, setReportStartDate] = useState(getMXDate());
  const [reportEndDate, setReportEndDate] = useState(getMXDate());

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

  const expenseCategories = [
    '---☕ INSUMOS Y ALIMENTOS ☕---', 'Agua purificada', 'Azúcar', 'Café molido', 'Canela', 'Chobani', 'Crema batida', 'Embutidos', 'Endulzantes', 'Hielo', 'Jarabes saborizantes', 'Lácteos', 'Pan', 'Té', 'Vegetales',
    '---🧾 EMPAQUES Y DESECHABLES 🧾---', 'Cucharas y agitadores', 'Etiquetas o stickers', 'Fajitas para Café 50 pz', 'Popotes', 'Servilletas', 'Tapa Plana para vaso 16 oz Inix 50 pz', 'Tapa Traveler Negra 100 pz 12, 16, 20 oz', 'Vaso Cristal 16 oz Inix 473 ml 50 pz', 'Vaso Papel 16 oz blanco 50 pz',
    '--- 🏪OPERACIÓN DEL LOCAL 🏪---', 'Limpieza y sanitizantes', 'Servicios básicos',
    '---👥 PERSONAL 👥---', 'Nómina',
    '---📉 FINANZAS Y CONTROL 📉---', 'Otros'
  ];

  // --- EFECTOS INICIALES Y CARGA DE DATOS ---
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineData(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Intento inicial de sync si estamos online
    if (navigator.onLine) syncOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = async () => {
    if (isSyncing || !navigator.onLine) return;
    const { sales, expenses, purchases } = await getAllPendingItems();
    if (sales.length === 0 && expenses.length === 0 && purchases.length === 0) return;

    setIsSyncing(true);
    console.log('Sincronizando datos offline...');

    // Sync Ventas
    for (const s of sales) {
      try {
        const { data: sale, error: saleError } = await supabase.from('sales').insert([{
          total: s.total, status: s.status, created_by: s.created_by,
          customer_name: s.customer_name, payment_method: s.payment_method,
          created_at: s.timestamp // Mantener la hora real del registro
        }]).select().single();

        if (!saleError) {
          await supabase.from('sale_items').insert(s.items.map(item => ({
            sale_id: sale.id, product_id: item.id, quantity: item.quantity, price: item.sale_price
          })));
          await clearPendingItem('pending_sales', s.id);
          await logActivity(s.created_by, 'SYNC_VENTA_OFFLINE', 'VENTAS', { sale_id: sale.id });
        }
      } catch (e) { console.error('Error sync venta:', e); }
    }

    // Sync Gastos
    for (const e of expenses) {
      try {
        const { error } = await supabase.from('expenses').insert([{
          concepto: e.concepto, categoria: e.categoria, monto: e.monto,
          fecha: e.fecha, created_by: e.created_by
        }]);
        if (!error) {
          await clearPendingItem('pending_expenses', e.id);
          await logActivity(e.created_by, 'SYNC_GASTO_OFFLINE', 'FINANZAS', { concepto: e.concepto });
        }
      } catch (err) { console.error('Error sync gasto:', err); }
    }

    // Sync Compras (Inventario)
    for (const p of purchases) {
      try {
        const { data: purchase, error: pError } = await supabase.from('purchases').insert([{
          total: p.total,
          created_by: p.created_by,
          created_at: p.timestamp
        }]).select().single();

        if (!pError) {
          for (const item of p.items) {
            await supabase.from('purchase_items').insert([{
              purchase_id: purchase.id,
              product_id: item.id,
              quantity: item.qty,
              cost: item.cost,
              purchase_number: purchase.purchase_number
            }]);

            // Actualizar stock (Aunque ya se actualizó localmente, aseguramos la DB)
            // Nota: Esto podría duplicar si la lógica offline ya sumó, pero en este caso
            // asumimos que el "fetchInventory" final corregirá la verdad absoluta.
            // Para mayor seguridad en offline, incrementamos en DB la cantidad reportada.
            const currentData = await supabase.from('inventory').select('stock').eq('product_id', item.id).single();
            const currentStock = currentData.data ? currentData.data.stock : 0;
            await supabase.from('inventory').update({ stock: currentStock + item.qty }).eq('product_id', item.id);
          }
          await clearPendingItem('pending_purchases', p.id);
          await logActivity(p.created_by, 'SYNC_COMPRA_OFFLINE', 'INVENTARIO', { purchase_id: purchase.id, total: p.total });
        }
      } catch (err) { console.error('Error sync compra:', err); }
    }

    setIsSyncing(false);
    alert("✅ Datos offline sincronizados con éxito");
    fetchInventory(); // Refrescar stock
  };

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
          // Actualizar listas si están visibles
          fetchSales();
          // Si es un update de pago o cancelación, recalcular finanzas si es admin
          if (userRole === 'admin') calculateFinances();
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
  }, [userRole]); // Agregamos dependencia userRole para el cálculo correcto

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

      const { data, error } = await supabase.storage
        .from('tickets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('tickets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error subiendo imagen:', error.message);
      alert('Error al subir la imagen del ticket: ' + error.message);
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
      alert(`⚠️ FUERA DE STOCK: Solo quedan ${totalStock - qtyInCart} unidades de ${product.name}`);
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
        alert(`⚠️ FUERA DE STOCK: Solo quedan ${totalStock} unidades`);
        return;
      }
    }

    setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity: newQty } : i));
  };

  const handleSale = async () => {
    if (cart.length === 0 || loading) return;
    for (const item of cart) {
      const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
      if (item.quantity > (currentInvItem?.stock || 0)) {
        alert(`⚠️ FUERA DE STOCK: ${item.name}`);
        return;
      }
    }
    const total = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);

    // Validación para A Cuenta
    if (paymentMethod === 'A Cuenta' && !customerName.trim()) {
      alert("⚠️ Para ventas A CUENTA, debes ingresar el nombre del cliente obligatoriamente.");
      return;
    }

    // Venta directa sin confirmación ni cálculo de cambio

    setLoading(true);
    try {
      // SI ESTAMOS OFFLINE, GUARDAR LOCALMENTE
      if (!navigator.onLine) {
        await savePendingSale({
          total: cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0),
          status: "recibido",
          created_by: user.id,
          customer_name: customerName.trim() || 'Cliente Mostrador',
          payment_method: paymentMethod,
          items: cart
        });
        alert("💾 Sin internet. Venta guardada localmente.");
        setCart([]); setCustomerName(''); setCustomerPhone(''); fetchInventory();
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

      for (const item of cart) {
        const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
        await supabase.from('inventory').update({ stock: currentInvItem.stock - item.quantity }).eq('product_id', item.id);
      }

      alert("✅ Venta registrada");

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

    } catch (err) { alert("Error: " + err.message); }
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
      } else {
        setSales([]);
        setTotalIngresosReporte(0);
      }
    }
  }, [showReport, reportStartDate, reportEndDate]);
  useEffect(() => {
    if (showFinances && user && userRole === 'admin') {
      if (financeStartDate <= financeEndDate) {
        calculateFinances();
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
  useEffect(() => { if (showCashArqueo) runCashArqueo(); }, [cashInitialFund, cashPhysicalCount, showCashArqueo]);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sales').select(`*, sale_items (*, products (name, sale_price))`)
      .gte('created_at', reportStartDate + 'T00:00:00').lte('created_at', reportEndDate + 'T23:59:59').order('created_at', { ascending: false });
    if (!error) {
      setSales(data || []);
      // Solo sumamos lo que NO es cancelado Y que NO es 'A Cuenta' (porque eso no ha entrado dinero real aun)
      setTotalIngresosReporte((data || []).reduce((acc, sale) => (sale.status !== 'cancelado' && sale.payment_method !== 'A Cuenta') ? acc + (sale.total || 0) : acc, 0));
    }
    setLoading(false);
  };

  const updateSaleStatus = async (saleId, newStatus) => {
    if (newStatus === 'cancelado' && userRole !== 'admin') return alert("Solo admin puede cancelar");
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
      alert(`✅ Estatus: ${newStatus.toUpperCase()}`);

      // LOG DE ACTIVIDAD
      await logActivity(user.id, `CAMBIO_ESTATUS_${newStatus.toUpperCase()}`, 'VENTAS', {
        sale_id: saleId,
        new_status: newStatus
      });

      fetchSales(); calculateFinances(); fetchInventory(); setSelectedSale(null);

    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const markAsPaid = async (saleId, method = 'Efectivo') => {
    setLoading(true);
    try {
      await supabase.from('sales').update({
        payment_method: method,
        status: 'entregado' // Asumimos que al pagar ya se entregó o se entrega en el momento
      }).eq('id', saleId);

      alert(`✅ Venta cobrada con éxito (registrada como ${method})`);
      await logActivity(user.id, 'COBRO_DEUDA', 'VENTAS', { sale_id: saleId, method });

      fetchSales();
      calculateFinances();
      setSelectedSale(null);

    } catch (err) { alert('Error al cobrar: ' + err.message); }
    setLoading(false);
  };

  const calculateFinances = async () => {
    if (userRole !== 'admin') return;
    setLoading(true);
    const { data: salesData } = await supabase.from('sales').select(`id, total, created_at, status, customer_name, payment_method, sale_items (quantity, products (cost_price))`)
      .gte('created_at', financeStartDate + 'T00:00:00').lte('created_at', financeEndDate + 'T23:59:59').neq('status', 'cancelado');

    let ingresos = 0, costoProds = 0;
    salesData?.forEach(s => { ingresos += s.total; s.sale_items?.forEach(i => costoProds += (i.quantity * (i.products?.cost_price || 0))); });

    const { data: expData } = await supabase.from('expenses').select('*').gte('fecha', financeStartDate).lte('fecha', financeEndDate);
    const { data: purData } = await supabase.from('purchases').select(`*, purchase_items(*, products(name))`).gte('created_at', financeStartDate + 'T00:00:00').lte('created_at', financeEndDate + 'T23:59:59');

    const gastOps = expData?.reduce((a, e) => a + e.monto, 0) || 0;
    const gastStk = purData?.reduce((a, p) => a + p.total, 0) || 0;
    const egr = costoProds + gastOps + gastStk;
    const util = ingresos - egr;

    setFinData({ ingresos, costoProductos: costoProds, gastosOps: gastOps, gastosStock: gastStk, totalEgresos: egr, utilidadNeta: util, margen: ingresos > 0 ? (util / ingresos) * 100 : 0 });
    setDailyExpensesList(expData || []); setDailyStockList(purData || []); setDailySalesList(salesData || []); setLoading(false);
  };

  const runCashArqueo = async () => {
    if (!activeShift && !showArqueoHistory) {
      setCashReportData({ ventasEfectivo: 0, gastosEfectivo: 0, esperado: cashInitialFund, diferencia: cashPhysicalCount - cashInitialFund });
      return;
    }
    setLoading(true);
    try {
      const startTime = activeShift ? activeShift.start_time : new Date().toISOString();

      // Ventas en efectivo desde que abrió el turno
      const { data: vData } = await supabase.from('sales')
        .select('total')
        .eq('payment_method', 'Efectivo')
        .neq('status', 'cancelado')
        .gte('created_at', startTime);

      // Gastos en efectivo desde que abrió el turno
      const { data: eData } = await supabase.from('expenses')
        .select('monto')
        .eq('fecha', getMXDate())
        .gte('created_at', startTime);

      const vEfec = vData?.reduce((a, v) => a + v.total, 0) || 0;
      const eEfec = eData?.reduce((a, e) => a + e.monto, 0) || 0;
      const initial = activeShift ? parseFloat(activeShift.initial_fund) : parseFloat(cashInitialFund);
      const esp = initial + vEfec - eEfec;

      setCashReportData({
        ventasEfectivo: vEfec,
        gastosEfectivo: eEfec,
        esperado: esp,
        diferencia: (parseFloat(cashPhysicalCount) || 0) - esp
      });
    } catch (err) {
      console.error("Error en runCashArqueo:", err);
    }
    setLoading(false);
  };

  const handleOpenShift = async () => {
    if (cashInitialFund < 0 || loading) return alert("Ingresa un fondo inicial válido");
    setLoading(true);
    const { data, error } = await supabase.from('cash_shifts').insert([{
      initial_fund: cashInitialFund,
      opened_by: user.id,
      status: 'open',
      start_time: new Date().toISOString()
    }]).select().single();

    if (!error) {
      setActiveShift(data);
      alert("✅ Turno Abierto");
      await logActivity(user.id, 'APERTURA_TURNO', 'FINANZAS', { initial_fund: cashInitialFund });
    } else {
      alert("Error al abrir turno: " + error.message);
    }
    setLoading(false);
  };

  const handleCloseShift = async () => {
    if (cashPhysicalCount <= 0 || loading) return alert("Ingresa el efectivo contado");
    if (!window.confirm("¿Estás seguro de cerrar el turno?")) return;

    setLoading(true);
    const { error } = await supabase.from('cash_shifts').update({
      end_time: new Date().toISOString(),
      actual_cash: cashPhysicalCount,
      expected_cash: cashReportData.esperado,
      difference: cashReportData.diferencia,
      observations: cashObservations,
      closed_by: user.id,
      status: 'closed'
    }).eq('id', activeShift.id);

    if (!error) {
      alert("✅ Turno Cerrado y Arqueo Guardado");
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
      alert("Error al cerrar turno: " + error.message);
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
    // Incluimos cost_price de los productos en la consulta
    const { data } = await supabase.from('sale_items').select(`quantity, price, products ( name, cost_price ), sales!inner ( id, created_at, status )`)
      .gte('sales.created_at', starStartDate + 'T00:00:00').lte('sales.created_at', starEndDate + 'T23:59:59').neq('sales.status', 'cancelado');

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
      // Solo intentamos subir la imagen si tenemos internet
      if (navigator.onLine && purchaseFile) {
        ticketUrl = await uploadTicketImage(purchaseFile, 'compras');
      }

      if (!navigator.onLine) {
        // --- FLUJO OFFLINE ---
        await savePendingPurchase({
          total: purchaseCart.reduce((a, i) => a + (i.cost * i.qty), 0),
          items: purchaseCart,
          created_by: user.id
          // La imagen se pierde en versión offline actual, se notifica al usuario
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

        alert("📦 Sin internet. Compra guardada y stock actualizado localmente. Se sincronizará al volver la conexión.");
      } else {
        // --- FLUJO ONLINE ---
        const { data: purchase } = await supabase.from('purchases').insert([{
          total: purchaseCart.reduce((a, i) => a + (i.cost * i.qty), 0),
          created_by: user.id,
          ticket_url: ticketUrl
        }]).select().single();

        for (const item of purchaseCart) {
          await supabase.from('purchase_items').insert([{ purchase_id: purchase.id, product_id: item.id, quantity: item.qty, cost: item.cost, purchase_number: purchase.purchase_number }]);
          const currentInv = inventoryList.find(inv => inv.product_id === item.id);
          await supabase.from('inventory').update({ stock: (currentInv?.stock || 0) + item.qty }).eq('product_id', item.id);
        }
        alert("📦 Stock Actualizado");

        // LOG DE ACTIVIDAD
        await logActivity(user.id, 'REGISTRO_COMPRA_INVENTARIO', 'INVENTARIO', {
          purchase_id: purchase.id,
          total: purchase.total,
          items_count: purchaseCart.length
        });

        fetchInventory(); // Refrescar stock de la nube
      }

      setPurchaseCart([]); setPurchaseFile(null);

    } catch (err) { alert("Error: " + err.message); }
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

      alert(`✅ Merma registrada de ${prod.name}`);
      setSelectedShrinkageProd('');
      setShrinkageQty(0);
      setShrinkageReason('Dañado');
      fetchInventory();
      calculateFinances();

    } catch (err) {
      alert("Error: " + err.message);
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
      if (expenseFile) {
        ticketUrl = await uploadTicketImage(expenseFile, 'gastos');
      }

      const today = getMXDate();

      // 2. Procesar cada ítem del carrito
      for (const item of expenseCart) {
        if (!navigator.onLine) {
          await savePendingExpense({
            concepto: item.concepto,
            categoria: item.categoria,
            monto: item.monto,
            fecha: today,
            created_by: user.id
            // Offline no soporta subir fotos por ahora en esta versión
          });
        } else {
          const { error } = await supabase.from('expenses').insert([{
            concepto: item.concepto,
            categoria: item.categoria,
            monto: item.monto,
            fecha: today,
            created_by: user.id,
            ticket_url: ticketUrl
          }]);
          if (error) throw error;
        }
      }

      // 3. Log General
      await logActivity(user.id, 'REGISTRO_TICKET_GASTOS', 'FINANZAS', {
        items_count: expenseCart.length,
        total: expenseCart.reduce((a, b) => a + b.monto, 0)
      });

      alert(navigator.onLine ? "✅ Ticket registrado con éxito" : "💰 Sin internet. Gastos guardados localmente.");

      // Limpiar todo al finalizar el ticket
      setExpenseCart([]);
      setExpenseFile(null);
      setExpenseConcepto('');
      setExpenseMonto(0);
      calculateFinances();
      fetchInventory();

    } catch (err) {
      alert("Error: " + err.message);
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

  const filteredProducts = selectedCategory === 'Todos' ? products : products.filter(p => (p.category || '').trim() === selectedCategory);

  if (!user) return <Login onLogin={fetchProfile} />;

  return (
    <div className="app-container" style={{
      display: 'flex',
      height: '100dvh', // Altura dinámica para móviles
      width: '100%',
      backgroundColor: '#f8f6f2',
      overflowX: 'hidden',
      overflowY: 'hidden' // El scroll debe ser interno, no del contenedor principal
    }}>

      {/* SECCIÓN TIENDA */}
      <div className="store-section" style={{ display: 'flex', flexDirection: 'column', padding: '5px 15px 15px 15px' }}>
        <div className="sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="Oasis" style={{ height: '35px' }} />
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <div title={isOnline ? (isSyncing ? 'Sincronizando...' : 'Conectado') : 'Sin Internet'} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px',
              borderRadius: '50%', background: isOnline ? '#def7ec' : '#fde8e8',
              color: isOnline ? '#27ae60' : '#e74c3c'
            }}>
              {isOnline ? (isSyncing ? <CloudSync size={18} className="spin" /> : <Wifi size={18} />) : <WifiOff size={18} />}
            </div>
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

        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '5px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className="btn-active-effect" style={{ padding: '8px 16px', borderRadius: '15px', border: 'none', backgroundColor: selectedCategory === cat ? '#4a3728' : '#e0e0e0', color: selectedCategory === cat ? '#fff' : '#4a3728', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>{cat.toUpperCase()}</button>
          ))}
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
                >
                  <div style={{ transform: 'scale(0.8)' }}>{getCategoryIcon(p)}</div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-price">${parseFloat(p.sale_price).toFixed(2)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN CARRITO */}
      <div className="cart-section" style={{ display: 'flex', flexDirection: 'column', padding: '5px 15px 15px 15px', backgroundColor: '#fff', borderLeft: '1px solid #eee' }}>
        <div className="cart-header-compact" style={{ height: '25px', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ color: '#4a3728', fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ShoppingCart size={18} /> Carrito
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
              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f4f4f4',
              borderRadius: '8px',
              marginBottom: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.05)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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
                  <div style={{ color: '#4a3728', fontWeight: '800' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f0f0f0', borderRadius: '8px', padding: '2px 5px' }}>
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="btn-active-effect"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', padding: '2px' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ margin: '0 8px', fontWeight: 'bold', minWidth: '15px', textAlign: 'center', color: '#4a3728' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className={`btn-active-effect ${((inventoryList.find(inv => inv.product_id === item.id)?.stock || 0) <= item.quantity) ? 'opacity-50 pointer-events-none' : ''}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', padding: '2px' }}
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
      />
      <SalesModal
        showReport={showReport} setShowReport={setShowReport} setSelectedSale={setSelectedSale} reportStartDate={reportStartDate} setReportStartDate={setReportStartDate}
        reportEndDate={reportEndDate} setReportEndDate={setReportEndDate} fetchSales={fetchSales} totalIngresosReporte={totalIngresosReporte} loading={loading} sales={sales}
        selectedSale={selectedSale} userRole={userRole} updateSaleStatus={updateSaleStatus} markAsPaid={markAsPaid}
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
        showCatalog={showCatalog} setShowCatalog={setShowCatalog} userRole={userRole} products={products} fetchProducts={fetchProducts} fetchInventory={fetchInventory} categories={categories}
      />

    </div>
  );
}

export default App;