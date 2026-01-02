import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getProducts } from './api';
import {
  Coffee, Snowflake, CupSoda, Utensils, ShoppingCart, Trash2,
  LogOut, List, IceCream, FileText, CheckCircle, Clock, TrendingUp, RefreshCw, User,
  CreditCard, Banknote, Calendar, RotateCcw, X, Package, Truck, AlertTriangle, DollarSign, Eye, PieChart, Receipt, ArrowDown, ArrowUp, Activity, Layers,
  Award // Nuevo Icono
} from 'lucide-react';

// --- PANTALLA DE LOGIN ---
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Credenciales incorrectas: " + error.message);
    else onLogin(data.user);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '30px', width: '380px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #f0f0f0' }}>
        <img src="/logo.png" alt="Oasis" style={{ height: '80px', marginBottom: '15px' }} />
        <h2 style={{ color: '#4a3728', marginBottom: '25px', fontSize: '24px', fontWeight: 'bold' }}>Oasis Café Manager</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '16px' }} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '16px' }} required />
          {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
          <button type="submit" style={{ padding: '15px', backgroundColor: '#4a3728', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>ENTRAR</button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('ventas');
  const [products, setProducts] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [cart, setCart] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showFinances, setShowFinances] = useState(false);

  // NUEVOS ESTADOS PARA ARQUEO DE CAJA
  const [showCashArqueo, setShowCashArqueo] = useState(false);
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

  // NUEVOS ESTADOS PARA PRODUCTOS ESTRELLA
  const [showStarProducts, setShowStarProducts] = useState(false);
  const [starStartDate, setStarStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [starEndDate, setStarEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [starData, setStarData] = useState([]);

  const [inventoryList, setInventoryList] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  // Rango de fechas para Reporte de Ventas
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  // Estado para el filtro de productos
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Estados para Reportes
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [totalIngresosReporte, setTotalIngresosReporte] = useState(0);

  // Estados para Compras (Entrada Stock)
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [selectedPurchaseProd, setSelectedPurchaseProd] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(0);
  const [purchaseCost, setPurchaseCost] = useState(0);

  // === ESTADOS PARA FINANZAS AVANZADAS CON RANGO ===
  const [financeStartDate, setFinanceStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [financeEndDate, setFinanceEndDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Estados para Gastos Operativos (Formulario)
  const [expenseConcepto, setExpenseConcepto] = useState('');
  const [expenseCategoria, setExpenseCategoria] = useState('Insumos');
  const [expenseMonto, setExpenseMonto] = useState(0);

  const categories = [
    'Todos', 'Bebidas Calientes', 'Alimentos', 'Frappés',
    'Bebidas Frías', 'Refrescos', 'Postres', 'Sabritas y Otros'
  ];

  const expenseCategories = [
    'Café molido', 'Vegetales', 'Lácteos', 'Embutidos', 'Pan',
    'Insumos', 'Servilletas', 'Vasos desechables', 'Popotes', 'Crema batida', 'Azúcar',
    'Sueldos', 'Servicios', 'Otros'
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user);
    });
  }, []);

  const fetchProfile = async (currentUser) => {
    setUser(currentUser);
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    if (data && data.role) {
      setUserRole(data.role);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole('ventas');
  };

  useEffect(() => {
    if (user) {
      getProducts().then(res => {
        if (res.error) {
          setFetchError(res.error.message);
        } else {
          setProducts(res.data || []);
          setFetchError(null);
        }
      });
      fetchInventory();
    }
  }, [user]);

  useEffect(() => {
    if (showReport && user) fetchSales();
  }, [showReport, reportStartDate, reportEndDate]);

  useEffect(() => {
    if (showFinances && user && userRole === 'admin') calculateFinances();
  }, [showFinances, financeStartDate, financeEndDate]);

  // --- LÓGICA DE ARQUEO DE CAJA ---
  const runCashArqueo = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data: vData } = await supabase.from('sales').select('total').eq('payment_method', 'Efectivo').neq('status', 'cancelado').gte('created_at', today + 'T00:00:00').lte('created_at', today + 'T23:59:59');
      const totalVentasEfec = vData?.reduce((acc, v) => acc + v.total, 0) || 0;
      const { data: eData } = await supabase.from('expenses').select('monto').eq('fecha', today);
      const totalGastosEfec = eData?.reduce((acc, e) => acc + e.monto, 0) || 0;
      const esperado = (parseFloat(cashInitialFund) || 0) + totalVentasEfec - totalGastosEfec;
      const diferencia = (parseFloat(cashPhysicalCount) || 0) - esperado;
      setCashReportData({ ventasEfectivo: totalVentasEfec, gastosEfectivo: totalGastosEfec, esperado: esperado, diferencia: diferencia });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (showCashArqueo) runCashArqueo(); }, [cashInitialFund, cashPhysicalCount, showCashArqueo]);

  const handleSaveArqueo = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('cash_reconciliations').insert([{
        initial_fund: cashInitialFund,
        sales_cash: cashReportData.ventasEfectivo,
        expenses_cash: cashReportData.gastosEfectivo,
        expected_amount: cashReportData.esperado,
        actual_amount: cashPhysicalCount,
        difference: cashReportData.diferencia,
        observations: cashObservations,
        created_by: user.id
      }]);
      if (error) throw error;
      alert("✅ Arqueo guardado exitosamente");
      setShowCashArqueo(false);
    } catch (err) { alert("Error al guardar arqueo. Verifica la tabla en Supabase."); }
    setLoading(false);
  };

  const fetchArqueoHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('cash_reconciliations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setArqueoHistory(data || []);
      setShowArqueoHistory(true);
    } catch (err) { alert("Error al cargar historial"); }
    setLoading(false);
  };

  // --- LÓGICA DE PRODUCTOS ESTRELLA ---
  const fetchStarProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          price,
          products ( name ),
          sales!inner ( created_at, status )
        `)
        .gte('sales.created_at', starStartDate + 'T00:00:00')
        .lte('sales.created_at', starEndDate + 'T23:59:59')
        .neq('sales.status', 'cancelado');

      if (error) throw error;

      const grouping = data.reduce((acc, item) => {
        const pName = item.products?.name || 'Producto Desconocido';
        if (!acc[pName]) {
          acc[pName] = { name: pName, totalQty: 0, totalRevenue: 0 };
        }
        acc[pName].totalQty += item.quantity;
        acc[pName].totalRevenue += (item.quantity * item.price);
        return acc;
      }, {});

      const sorted = Object.values(grouping).sort((a, b) => b.totalQty - a.totalQty);
      setStarData(sorted);
    } catch (err) {
      console.error(err);
      alert("Error al cargar productos estrella");
    }
    setLoading(false);
  };

  // --- LÓGICA DE REPORTES CON RANGO ---
  const fetchSales = async () => {
    setLoading(true);

    let query = supabase
      .from('sales')
      .select(`*, sale_items (*, products (name, sale_price))`)
      .gte('created_at', reportStartDate + 'T00:00:00')
      .lte('created_at', reportEndDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      setLoading(false);
      return;
    }

    setSales(data || []);

    // Calcular total de ingresos (excluyendo cancelados)
    const total = (data || []).reduce((acc, sale) => {
      return sale.status !== 'cancelado' ? acc + (sale.total || 0) : acc;
    }, 0);

    setTotalIngresosReporte(total);
    setLoading(false);
  };

  // --- LÓGICA MAESTRA DE FINANZAS (RANGO DE FECHAS) ---
  const calculateFinances = async () => {
    if (userRole !== 'admin') return;

    setLoading(true);

    // 1. Obtener VENTAS + ÍTEMS + COSTO PRODUCTO
    const { data: salesData } = await supabase
      .from('sales')
      .select(`
        total,
        status,
        sale_items (
          quantity,
          products (
            cost_price
          )
        )
      `)
      .gte('created_at', financeStartDate + 'T00:00:00')
      .lte('created_at', financeEndDate + 'T23:59:59')
      .neq('status', 'cancelado');

    let totalIngresos = 0;
    let totalCostoProductos = 0;

    if (salesData) {
      salesData.forEach(sale => {
        totalIngresos += sale.total;
        if (sale.sale_items) {
          sale.sale_items.forEach(item => {
            const unitCost = item.products?.cost_price || 0;
            totalCostoProductos += (item.quantity * unitCost);
          });
        }
      });
    }

    // 2. Obtener GASTOS OPERATIVOS del rango
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .gte('fecha', financeStartDate)
      .lte('fecha', financeEndDate)
      .order('created_at', { ascending: false });

    const totalGastosOps = expensesData?.reduce((acc, e) => acc + e.monto, 0) || 0;
    setDailyExpensesList(expensesData || []);

    // 3. Obtener COMPRAS DE STOCK (Entradas) del rango
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select(`*, purchase_items(*, products(name))`)
      .gte('created_at', financeStartDate + 'T00:00:00')
      .lte('created_at', financeEndDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    const totalGastosStock = purchasesData?.reduce((acc, p) => acc + p.total, 0) || 0;
    setDailyStockList(purchasesData || []);

    // 4. Calcular Totales Finales
    const totalEgresos = totalCostoProductos + totalGastosOps + totalGastosStock;
    const utilidad = totalIngresos - totalEgresos;
    const margen = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

    setFinData({
      ingresos: totalIngresos,
      costoProductos: totalCostoProductos,
      gastosOps: totalGastosOps,
      gastosStock: totalGastosStock,
      totalEgresos: totalEgresos,
      utilidadNeta: utilidad,
      margen: margen
    });

    setLoading(false);
  };

  // --- LÓGICA DE CANCELACIÓN Y DEVOLUCIÓN ---
  const updateSaleStatus = async (saleId, newStatus) => {
    if (newStatus === 'cancelado' && userRole !== 'admin') {
      alert("Solo el administrador puede cancelar pedidos");
      return;
    }

    if (selectedSale && selectedSale.status === 'cancelado' && newStatus === 'cancelado') {
      alert("Esta venta ya está cancelada.");
      return;
    }

    setLoading(true);
    try {
      if (newStatus === 'cancelado') {
        const { data: itemsToReturn, error: itemsError } = await supabase
          .from('sale_items')
          .select('product_id, quantity')
          .eq('sale_id', saleId);

        if (itemsError) throw itemsError;

        for (const item of itemsToReturn) {
          const { data: currentInv } = await supabase
            .from('inventory')
            .select('stock')
            .eq('product_id', item.product_id)
            .single();

          if (currentInv) {
            const newStock = currentInv.stock + item.quantity;
            await supabase
              .from('inventory')
              .update({ stock: newStock })
              .eq('product_id', item.product_id);
          }
        }
      }

      const { error } = await supabase.from('sales').update({ status: newStatus }).eq('id', saleId);

      if (error) throw new Error(error.message);
      else {
        alert(`✅ Estatus del pedido: ${newStatus.toUpperCase()}`);
        await fetchSales();
        await calculateFinances();
        await fetchInventory();
        setSelectedSale(null);
      }
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('stock, product_id, products:product_id (name)');

    if (error) console.error(error);
    else setInventoryList(data || []);
  };

  // --- REVERTIDO A TU LOGICA ORIGINAL DE ICONOS ---
  const getCategoryIcon = (product) => {
    const cat = (product.category || '').trim();
    if (cat === 'Bebidas Calientes') return <Coffee size={35} color="#8b5a2b" />;
    if (cat === 'Alimentos') return <Utensils size={35} color="#27ae60" />;
    if (cat === 'Frappés') return <Snowflake size={35} color="#3498db" />;
    if (cat === 'Bebidas Frías') return <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}><CupSoda size={28} color="#3498db" /><Snowflake size={28} color="#3498db" /></div>;
    if (cat === 'Refrescos') return <CupSoda size={35} color="#3498db" />;
    if (cat === 'Postres' || cat === 'Sabritas y Otros') return <IceCream size={35} color="#e67e22" />;
    return <Coffee size={35} color="#8b5a2b" />;
  };

  const addToCart = (product) => {
    // 1. OBTENER STOCK TOTAL DE LA LISTA
    const inventoryItem = inventoryList.find(inv => inv.product_id === product.id);
    const totalStock = inventoryItem ? inventoryItem.stock : 0;

    // 2. VERIFICAR CUÁNTOS YA HAY EN EL CARRITO
    const itemInCart = cart.find(i => i.id === product.id);
    const qtyInCart = itemInCart ? itemInCart.quantity : 0;

    // 3. VALIDAR STOCK RESTANTE ANTES DE ACTUALIZAR ESTADO (EVITA DOBLE ALERTA)
    if (qtyInCart + 1 > totalStock) {
      const stockRestante = totalStock - qtyInCart;
      alert(`⚠️ FUERA DE STOCK: Solo quedan ${stockRestante} unidades disponibles de ${product.name}`);
      return;
    }

    // 4. SI HAY STOCK, PROCEDER
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleSale = async () => {
    if (cart.length === 0) return;
    if (loading) return;

    for (const item of cart) {
      const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
      const realStock = currentInvItem ? currentInvItem.stock : 0;
      if (item.quantity > realStock) {
        alert(`⚠️ FUERA DE STOCK: No se puede completar la venta. ${item.name} tiene ${realStock} unidades y quieres vender ${item.quantity}.`);
        return;
      }
    }

    const confirmPay = window.confirm(`✅ CONFIRMAR VENTA ✅\n\nMétodo: ${paymentMethod.toUpperCase()}\n\n⚠️ AVISO IMPORTANTE ⚠️\n\nRecuerda que si es pago con 💳 TARJETA, procede a realizar el cobro en la terminal bancaria.`);
    if (!confirmPay) return;

    setLoading(true);
    try {
      const totalVenta = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          total: totalVenta,
          status: "recibido",
          created_by: user.id,
          customer_name: customerName.trim() || 'Sin nombre',
          payment_method: paymentMethod
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const itemsToInsert = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.sale_price
      }));

      await supabase.from('sale_items').insert(itemsToInsert);

      // Actualizar inventario
      for (const item of cart) {
        const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
        if (currentInvItem) {
          const newStock = currentInvItem.stock - item.quantity;
          await supabase
            .from('inventory')
            .update({ stock: newStock })
            .eq('product_id', item.id);
        }
      }

      alert("✅ Venta Satisfactoria");
      setCart([]);
      setCustomerName('');

      fetchInventory();

    } catch (err) {
      alert("Error al registrar venta: " + err.message);
    }
    setLoading(false);
  };

  const handleRegisterPurchase = async () => {
    if (purchaseCart.length === 0) return;
    if (loading) return;

    setLoading(true);
    try {
      const totalCompra = purchaseCart.reduce((acc, i) => acc + (i.cost * i.qty), 0);
      const { data: purchase, error: pErr } = await supabase
        .from('purchases')
        .insert([{ total: totalCompra, created_by: user.id }])
        .select()
        .single();

      if (pErr) throw pErr;

      for (const item of purchaseCart) {
        const { error: itemError } = await supabase
          .from('purchase_items')
          .insert([{
            purchase_id: purchase.id,
            product_id: item.id,
            quantity: item.qty,
            cost: item.cost
          }]);

        if (itemError) throw itemError;

        const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
        if (currentInvItem) {
          const newStock = currentInvItem.stock + item.qty;
          await supabase
            .from('inventory')
            .update({ stock: newStock })
            .eq('product_id', item.id);
        }
      }

      alert("📦 Stock Actualizado");
      setPurchaseCart([]);
      setSelectedPurchaseProd('');
      setPurchaseQty(0);
      setPurchaseCost(0);

      setTimeout(() => fetchInventory(), 500);

    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleRegisterExpense = async () => {
    if (!expenseConcepto.trim() || expenseMonto <= 0) {
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          concepto: expenseConcepto.trim(),
          categoria: expenseCategoria,
          monto: expenseMonto,
          fecha: new Date().toISOString().split('T')[0],
          created_by: user.id
        }]);

      if (error) throw error;

      alert("💰 Gasto Registrado Exitosamente");
      setExpenseConcepto('');
      setExpenseCategoria('Insumos');
      setExpenseMonto(0);

    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleNewOrder = () => {
    if (window.confirm("¿Iniciar pedido nuevo?")) {
      setCart([]);
      setCustomerName('');
      setPaymentMethod('Efectivo');
    }
  };

  const filteredProducts = selectedCategory === 'Todos'
    ? products
    : products.filter(p => (p.category || '').trim() === selectedCategory);

  if (!user) return <Login onLogin={fetchProfile} />;

  const percentageExpenses = finData.ingresos > 0
    ? Math.min((finData.totalEgresos / finData.ingresos) * 100, 100)
    : (finData.totalEgresos > 0 ? 100 : 0);

  const percentageProfit = 100 - percentageExpenses;

  const donutStyle = {
    background: `conic-gradient(
      #e74c3c 0% ${percentageExpenses}%, 
      #27ae60 ${percentageExpenses}% 100%
    )`,
    borderRadius: '50%',
    width: '120px',
    height: '120px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  };

  const innerCircleStyle = {
    background: '#fff',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    zIndex: 2
  };

  // Variable para forzar el modo columna si el ancho es pequeño
  const isMobileView = window.innerWidth < 800;

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: isMobileView ? 'column' : 'row',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#f8f6f2',
      overflow: isMobileView ? 'auto' : 'hidden'
    }}>

      {/* 1. SECCIÓN DE TIENDA */}
      <div className="store-section" style={{
        flex: isMobileView ? 'none' : 2,
        padding: isMobileView ? '10px 5px' : '15px',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box'
      }}>

        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="Oasis" style={{ height: '35px' }} />
            <h1 style={{ color: '#4a3728', margin: 0, fontSize: '20px', fontWeight: '900' }}>Oasis Café</h1>
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {userRole === 'admin' && (
              <>
                <button onClick={() => setShowInventory(true)} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><Package size={16} /></button>
                <button onClick={() => { setShowStarProducts(true); fetchStarProducts(); }} style={{ background: '#f1c40f', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><Award size={16} /></button>
                <button onClick={() => setShowCashArqueo(true)} style={{ background: '#e67e22', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><Banknote size={16} /></button>
              </>
            )}
            <button onClick={() => setShowReport(true)} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><FileText size={16} /></button>
            {userRole === 'admin' && (
              <button onClick={() => setShowFinances(true)} style={{ background: '#9b59b6', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><PieChart size={16} /></button>
            )}
            <button onClick={handleLogout} style={{ backgroundColor: '#ffffff', color: '#e74c3c', border: '1px solid #e74c3c', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><LogOut size={16} /></button>
          </div>
        </div>

        {/* MENÚ */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', marginBottom: '5px', scrollbarWidth: 'none', flexShrink: 0 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '8px 16px', borderRadius: '15px', border: 'none', backgroundColor: selectedCategory === cat ? '#4a3728' : '#e0e0e0', color: selectedCategory === cat ? '#ffffff' : '#4a3728', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, boxShadow: selectedCategory === cat ? '0 2px 5px rgba(74, 55, 40, 0.3)' : 'none', transition: 'all 0.2s ease' }}>{cat.toUpperCase()}</button>
          ))}
        </div>

        {/* GRID PRODUCTOS - CORRECCIÓN: 3 COLUMNAS CUADRADAS SIMÉTRICAS */}
        {!fetchError && filteredProducts.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#888', marginTop: '10px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '18px' }}>⚠️ No hay productos</p>
          </div>
        )}

        <style>{`
          .btn-producto-3d:active {
            transform: translateY(4px) !important;
            box-shadow: none !important;
          }
        `}</style>

        <div style={{ flex: 1, minHeight: 0, overflowY: isMobileView ? 'visible' : 'auto', paddingBottom: '10px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobileView ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: isMobileView ? '10px' : '15px',
            padding: '5px',
            width: '100%',
            boxSizing: 'border-box',
            justifyContent: 'stretch'
          }}>
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="btn-producto-3d"
                style={{
                  borderRadius: '15px',
                  border: 'none',
                  backgroundColor: '#fff',
                  textAlign: 'center',
                  // CUADRADO PERFECTO
                  aspectRatio: '1 / 1',
                  boxShadow: '0 4px 0px rgba(0,0,0,0.1), 0 2px 5px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.1s ease',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 5px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ marginBottom: '5px', transform: isMobileView ? 'scale(0.8)' : 'scale(1)', flexShrink: 0 }}>{getCategoryIcon(p)}</div>

                <div style={{
                  fontWeight: 'bold',
                  color: '#4a3728',
                  fontSize: isMobileView ? '10px' : '11px',
                  lineHeight: '1.2',
                  marginBottom: '2px',
                  display: '-webkit-box',
                  WebkitLineClamp: '2',
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  width: '100%',
                  padding: '0 2px'
                }}>
                  {p.name.toUpperCase()}
                </div>

                <div style={{ color: '#27ae60', fontWeight: '900', fontSize: isMobileView ? '12px' : '14px', marginTop: 'auto' }}>${p.sale_price}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CARRITO */}
      <div className="cart-section" style={{
        flex: isMobileView ? 'none' : 0.8,
        backgroundColor: '#ffffff',
        padding: '15px',
        borderLeft: isMobileView ? 'none' : '1px solid #eee',
        borderTop: isMobileView ? '2px solid #eee' : 'none',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h2 style={{ color: '#4a3728', fontSize: '20px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={20} /> Carrito</h2>
        <input type="text" placeholder="Pedido a nombre de...(Opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#3498db', color: '#FFF', fontWeight: '900', fontSize: '14px', boxSizing: 'border-box' }} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px' }}>
              <div style={{ color: '#4a3728', fontWeight: '800' }}>{item.name} {item.quantity} x ${item.sale_price}</div>
              <div style={{ color: '#27ae60', fontWeight: '900' }}>${item.sale_price * item.quantity}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
            <button onClick={() => setPaymentMethod('Efectivo')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: paymentMethod === 'Efectivo' ? '2px solid #27ae60' : '1px solid #ddd', backgroundColor: paymentMethod === 'Efectivo' ? '#27ae60' : '#999', fontWeight: 'bold', color: '#fff', cursor: 'pointer', fontSize: '12px' }}> EFECTIVO </button>
            <button onClick={() => setPaymentMethod('Tarjeta')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: paymentMethod === 'Tarjeta' ? '2px solid #3498db' : '1px solid #ddd', backgroundColor: paymentMethod === 'Tarjeta' ? '#3498db' : '#999', fontWeight: 'bold', color: '#fff', cursor: 'pointer', fontSize: '12px' }}> TARJETA </button>
          </div>
        </div>
        <div style={{ fontSize: '26px', fontWeight: '900', color: '#00913f', textAlign: 'center', marginTop: '10px' }}>Total: ${cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0)}</div>
        <button onClick={handleSale} disabled={loading} style={{ width: '100%', padding: '15px', backgroundColor: loading ? '#999' : '#4a3728', color: '#fff', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px', fontSize: '14px' }}>{loading ? 'PROCESANDO PAGO...' : 'PAGAR'}</button>
        <button onClick={handleNewOrder} style={{ width: '100%', padding: '10px', backgroundColor: '#ff4d4d', color: '#fff', borderRadius: '12px', fontWeight: '900', marginTop: '5px', border: 'none', cursor: 'pointer', fontSize: '14px' }}><RotateCcw size={14} /> VACIAR CARRITO DE COMPRAS</button>
      </div>

      {/* MODAL INVENTARIO */}
      {showInventory && userRole === 'admin' && (
        <div onClick={() => setShowInventory(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '20px', borderRadius: '20px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowInventory(false)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={24} /></button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '60px' }}>
              <h2 style={{ color: '#000000', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}><Package size={24} /> Reporte de Stock y Gastos</h2>
              <button onClick={fetchInventory} disabled={loading} style={{ padding: '8px 16px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: loading ? 'not-allowed' : 'pointer' }}><RefreshCw size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>EXISTENCIAS</h3>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '15px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead style={{ background: '#f8f6f2' }}><tr><th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Producto</th><th style={{ padding: '10px', color: '#000' }}>Cantidad</th><th style={{ padding: '10px', color: '#000' }}>Estatus</th></tr></thead>
                    <tbody>
                      {inventoryList.map((inv, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px', color: '#000', fontWeight: '600' }}>{inv.products?.name}</td><td style={{ padding: '10px', textAlign: 'center', fontWeight: '900', color: '#000' }}>{inv.stock}</td><td style={{ padding: '10px', textAlign: 'center' }}>{inv.stock <= 5 ? <AlertTriangle color="#e74c3c" size={16} /> : <CheckCircle color="#27ae60" size={16} />}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ background: '#fdfbf9', padding: '20px', borderRadius: '15px', border: '1px solid #f1ece6', boxSizing: 'border-box' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>ENTRADA DE MERCANCÍAS</h3>
                <select
                  value={selectedPurchaseProd}
                  onChange={(e) => setSelectedPurchaseProd(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', marginBottom: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box' }}
                >
                  <option value="">Seleccionar...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <input type="number" placeholder="Unidades" value={purchaseQty || ''} onChange={(e) => setPurchaseQty(parseInt(e.target.value) || 0)} style={{ flex: 1, minWidth: '0', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box' }} />
                  <input type="number" placeholder="$ Costo" value={purchaseCost || ''} onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)} style={{ flex: 1, minWidth: '0', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => { const p = products.find(x => x.id === selectedPurchaseProd); if (p && purchaseQty > 0 && purchaseCost > 0) { setPurchaseCart([...purchaseCart, { ...p, qty: purchaseQty, cost: purchaseCost }]); setSelectedPurchaseProd(''); setPurchaseQty(0); setPurchaseCost(0); } else { alert('Complete campos'); } }} style={{ width: '100%', padding: '10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>+ AÑADIR</button>
                <div style={{ marginTop: '15px', color: '#000' }}>
                  {purchaseCart.map((item, i) => (
                    <div key={i} style={{ fontSize: '12px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📦 {item.name} {item.qty} x ${item.cost}</span>
                      <span style={{ fontWeight: '900' }}>${(item.qty * item.cost).toFixed(2)}</span>
                    </div>
                  ))}
                  {purchaseCart.length > 0 && (
                    <>
                      <button onClick={handleRegisterPurchase} disabled={loading} style={{ width: '100%', padding: '10px', background: loading ? '#999' : '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', marginTop: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>REGISTRAR COMPRA</button>
                      <button onClick={() => setPurchaseCart([])} style={{ width: '100%', padding: '10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', marginTop: '5px', cursor: 'pointer' }}>LIMPIAR REGISTRO DE COMPRAS</button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '15px', border: '2px solid #ff9800', marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', marginBottom: '10px' }}>GASTOS DE OPERACIÓN</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select value={expenseCategoria} onChange={(e) => setExpenseCategoria(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}>{expenseCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}</select>
                <input type="number" placeholder="$ 0.00" value={expenseMonto || ''} onChange={(e) => setExpenseMonto(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }} />
              </div>
              <input type="text" placeholder="Concepto" value={expenseConcepto} onChange={(e) => setExpenseConcepto(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', marginTop: '10px' }} />
              <button onClick={handleRegisterExpense} disabled={loading} style={{ width: '100%', padding: '10px', background: loading ? '#999' : '#ff9800', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', marginTop: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>REGISTRAR GASTO</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ARQUEO DE CAJA */}
      {showCashArqueo && userRole === 'admin' && (
        <div onClick={() => setShowCashArqueo(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Banknote size={30} color="#e67e22" />
                  <h2 style={{ color: '#4a3728', fontWeight: '900', margin: 0, fontSize: '24px' }}>Arqueo de Caja</h2>
                </div>
                <button onClick={fetchArqueoHistory} style={{ padding: '8px 12px', background: '#f8f6f2', color: '#4a3728', border: '1px solid #ddd', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><List size={14} /> HISTORIAL</button>
              </div>
              <button onClick={() => setShowCashArqueo(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#000' }}><X size={30} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ backgroundColor: '#fdfbf9', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                <label style={{ fontSize: '20px', fontWeight: 'bold', color: '#888', display: 'block', marginBottom: '5px' }}>FONDO INICIAL ($)</label>
                <input type="number" value={cashInitialFund || ''} onChange={(e) => setCashInitialFund(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '18px', fontWeight: 'bold' }} placeholder="0.00" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>VENTAS EFECTIVO</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#15803d' }}>${cashReportData.ventasEfectivo.toFixed(2)}</div>
                </div>
                <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#991b1b', fontWeight: 'bold' }}>GASTOS HOY</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>-${cashReportData.gastosEfectivo.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ background: '#4a3728', padding: '20px', borderRadius: '15px', textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>SALDO ESPERADO EN CAJA</div>
                <div style={{ fontSize: '30px', fontWeight: '900' }}>${cashReportData.esperado.toFixed(2)}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '15px', border: '2px solid #3498db' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#3498db', display: 'block', marginBottom: '5px' }}>EFECTIVO FÍSICO CONTADO ($)</label>
                <input type="number" value={cashPhysicalCount || ''} onChange={(e) => setCashPhysicalCount(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #3498db', fontSize: '22px', fontWeight: '900', color: '#000' }} placeholder="Escribe cuánto dinero hay..." />
              </div>
              <div style={{ padding: '15px', borderRadius: '15px', textAlign: 'center', backgroundColor: cashReportData.diferencia === 0 ? '#f8f9fa' : (cashReportData.diferencia > 0 ? '#e3f2fd' : '#fff5f5'), border: '1px dashed #ccc' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>DIFERENCIA</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: cashReportData.diferencia === 0 ? '#27ae60' : (cashReportData.diferencia > 0 ? '#3498db' : '#e74c3c') }}>{cashReportData.diferencia >= 0 ? '+' : ''}${cashReportData.diferencia.toFixed(2)}</div>
              </div>
              <textarea placeholder="Observaciones..." value={cashObservations} onChange={(e) => setCashObservations(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '60px', fontSize: '13px' }} />
              <button onClick={handleSaveArqueo} disabled={loading} style={{ width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '16px' }}>{loading ? 'GUARDANDO...' : 'FINALIZAR Y GUARDAR CORTE'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE ARQUEOS (AUDITORÍA) */}
      {showArqueoHistory && (
        <div onClick={() => setShowArqueoHistory(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, backdropFilter: 'blur(10px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '95%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ color: '#4a3728', fontWeight: '900', margin: 0, fontSize: '22px' }}>Historial de Cortes de Caja</h2>
              <button onClick={() => setShowArqueoHistory(false)} style={{ border: 'none', color: '#000000', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ border: '1px solid #eee', borderRadius: '15px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#4a3728', color: '#fff' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Fondo</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Esperado</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Real</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {arqueoHistory.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: '#999' }}>No hay registros guardados</td></tr>
                  ) : (
                    arqueoHistory.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold', color: '#999' }}>{new Date(h.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '10px', color: '#999' }}>{new Date(h.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ padding: '12px', color: '#000000', textAlign: 'center', }}>${h.initial_fund}</td>
                        <td style={{ padding: '12px', color: '#000000', textAlign: 'center', fontWeight: 'bold', }}>${h.expected_amount}</td>
                        <td style={{ padding: '12px', color: '#000000', textAlign: 'center', fontWeight: 'bold' }}>${h.actual_amount}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: h.difference === 0 ? '#27ae60' : (h.difference > 0 ? '#3498db' : '#e74c3c') }}>
                          {h.difference > 0 ? '+' : ''}${h.difference}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPORTES CON RANGO */}
      {showReport && (
        <div onClick={() => { setShowReport(false); setSelectedSale(null); }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '20px', borderRadius: '20px', width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => { setShowReport(false); setSelectedSale(null); }} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={24} /></button>
            <h2 style={{ color: '#000000', fontWeight: '900', margin: '0 0 15px 0', fontSize: '20px' }}>Reporte de Ventas</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>DESDE:</span>
                <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>HASTA:</span>
                <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }} />
              </div>
              <button onClick={fetchSales} style={{ padding: '10px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-end' }}><RefreshCw size={16} /></button>
              <div style={{ marginLeft: 'auto', fontWeight: '900', fontSize: '18px', color: '#27ae60' }}>
                Total: ${totalIngresosReporte.toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '20px' }}>
              <div style={{ flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#000' }}>Fecha/Hora</th>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#000' }}>Cliente</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#000' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} onClick={() => setSelectedSale(sale)} style={{ borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: selectedSale?.id === sale.id ? '#f0f8ff' : 'transparent', opacity: sale.status === 'cancelado' ? 0.6 : 1 }}>
                        <td style={{ padding: '10px', color: '#000' }}>
                          {new Date(sale.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px', color: '#000' }}>
                          {sale.customer_name}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: sale.status === 'cancelado' ? '#ccc' : '#27ae60', fontWeight: '900' }}>
                          ${sale.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINANZAS MAESTRA */}
      {showFinances && userRole === 'admin' && (
        <div onClick={() => setShowFinances(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowFinances(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={30} /></button>
            <div style={{ marginBottom: '25px', marginTop: '10px' }}>
              <h2 style={{ color: '#000', fontWeight: '900', margin: '0 0 15px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PieChart size={28} /> Reporte Financiero
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>DESDE:</span>
                  <input type="date" value={financeStartDate} onChange={(e) => setFinanceStartDate(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', fontWeight: 'bold' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>HASTA:</span>
                  <input type="date" value={financeEndDate} onChange={(e) => setFinanceEndDate(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', fontWeight: 'bold' }} />
                </div>
                <button onClick={calculateFinances} disabled={loading} style={{ padding: '10px 20px', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', alignSelf: 'flex-end' }}><RefreshCw size={20} /></button>
              </div>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: '50px', color: '#999', fontSize: '18px' }}>Analizando datos...</div> : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', marginBottom: '5px' }}><TrendingUp size={20} /> <span style={{ fontWeight: 'bold' }}>Ingresos Brutos</span></div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803d' }}>${finData.ingresos.toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: '20px', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b21a8', marginBottom: '5px' }}><DollarSign size={20} /> <span style={{ fontWeight: 'bold' }}>Utilidad Neta</span></div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#7e22ce' }}>${finData.utilidadNeta.toFixed(2)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL PRODUCTOS ESTRELLA */}
      {showStarProducts && userRole === 'admin' && (
        <div onClick={() => setShowStarProducts(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '95%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
            <button onClick={() => setShowStarProducts(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#000' }}><X size={30} /></button>
            <h2 style={{ color: '#4a3728', fontWeight: '900', margin: '0 0 20px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><Award size={30} color="#f1c40f" /> Productos Estrella</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input type="date" value={starStartDate} onChange={(e) => setStarStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <input type="date" value={starEndDate} onChange={(e) => setStarEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #ddd' }} />
              <button onClick={fetchStarProducts} style={{ padding: '10px 20px', background: '#4a3728', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>VER REPORTE</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#4a3728', color: '#fff' }}>
                <tr><th style={{ padding: '12px', textAlign: 'left' }}>Producto</th><th style={{ padding: '12px' }}>Vendidos</th></tr>
              </thead>
              <tbody>
                {starData.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{item.name}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{item.totalQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;